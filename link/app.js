/**
 * NEOSTORE LINK — pad de texto protegido por PIN com tempo de exposição.
 *
 * Estilo dontpad.com, porém:
 *  - cada /nome exige um PIN numérico para abrir;
 *  - o conteúdo fica visível só por N segundos (configurável no admin);
 *  - o painel de superadmin fica em outro endereço (/admin por padrão,
 *    configurável pela variável ADMIN_PATH) e exige senha própria.
 *
 * Este arquivo é o app inteiro e roda em dois lugares:
 *  - Vercel: api/index.js importa handleRequest() daqui (storage: Upstash Redis)
 *  - Cloudflare Workers: cole este arquivo como está (storage: KV binding PADS)
 *
 * Configuração (variáveis de ambiente):
 *  - ADMIN_PASSWORD  (obrigatória) senha do superadmin
 *  - ADMIN_PATH      (opcional) caminho do painel, ex.: "painel-secreto"; padrão "admin"
 *  - BRAND_NAME      (opcional) nome exibido, padrão "Neostore Link"
 *
 * env.PADS precisa ser um storage com a interface do Cloudflare KV:
 *   get(key, 'json'|undefined), put(key, value, {expirationTtl}), delete(key),
 *   list({prefix, cursor}) -> {keys:[{name}], list_complete, cursor}
 */

const DEFAULTS = {
  defaultSeconds: 60, // tempo padrão de exposição
  allowEditDefault: true, // pads novos permitem edição por padrão
  minSeconds: 5,
  maxSeconds: 3600,
  pinMin: 4,
  pinMax: 8,
  slugRegex: /^[a-z0-9][a-z0-9-]{1,39}$/,
  rateLimitMax: 8, // tentativas de PIN por IP+link
  rateLimitWindow: 600, // segundos
  adminSessionHours: 12,
  contentMaxBytes: 500_000,
};

const RESERVED = new Set(['api', 'admin', 'favicon.ico', 'robots.txt', 'static']);

export async function handleRequest(request, env) {
  try {
    return await handle(request, env);
  } catch (err) {
    console.error(err);
    return json({ error: 'Erro interno' }, 500);
  }
}

// Cloudflare Workers usa o export default.
export default { fetch: handleRequest };

/* ------------------------------------------------------------------ */
/* Roteamento                                                          */
/* ------------------------------------------------------------------ */

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const adminPath = '/' + String(env.ADMIN_PATH || 'admin').replace(/^\/+|\/+$/g, '');
  const brand = env.BRAND_NAME || 'Neostore Link';

  if (!env.PADS) return json({ error: 'KV binding "PADS" não configurado' }, 500);
  if (!env.ADMIN_PASSWORD) return json({ error: 'Secret ADMIN_PASSWORD não configurado' }, 500);

  if (path === '/robots.txt') return text('User-agent: *\nDisallow: /\n');
  if (path === '/favicon.ico') return new Response(null, { status: 204 });

  // ---- API admin
  if (path.startsWith('/api/admin')) return adminApi(request, env, path);

  // ---- API pads
  const padApi = path.match(/^\/api\/pad\/([^/]+)\/(unlock|save|read)$/);
  if (padApi) return padApiHandler(request, env, padApi[1], padApi[2]);

  if (path.startsWith('/api')) return json({ error: 'Não encontrado' }, 404);

  if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405);

  // ---- Páginas
  if (path === adminPath) return html(adminPage(brand, adminPath));
  if (path === '/') return html(homePage(brand));

  const slug = path.slice(1).toLowerCase();
  if (!DEFAULTS.slugRegex.test(slug) || RESERVED.has(slug)) {
    return html(notFoundPage(brand), 404);
  }
  // Não revela se o link existe: sempre mostra a tela de PIN.
  return html(padPage(brand, slug));
}

/* ------------------------------------------------------------------ */
/* API — pads                                                          */
/* ------------------------------------------------------------------ */

async function padApiHandler(request, env, rawSlug, action) {
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Origem inválida' }, 403);

  const slug = String(rawSlug).toLowerCase();
  if (!DEFAULTS.slugRegex.test(slug)) return json({ error: 'Link inválido' }, 400);

  const body = await readJson(request);
  if (!body) return json({ error: 'JSON inválido' }, 400);

  const settings = await getSettings(env);

  if (action === 'unlock') {
    const ip = clientIp(request);
    const rlKey = `rl:${slug}:${ip}`;
    const attempts = Number((await env.PADS.get(rlKey)) || 0);
    if (attempts >= DEFAULTS.rateLimitMax) {
      return json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
    }

    const pad = await getPad(env, slug);
    const pin = String(body.pin || '').trim();
    const ok = pad && pin.length > 0 && (await safeEqual(pin, pad.pin));

    if (!ok) {
      await env.PADS.put(rlKey, String(attempts + 1), {
        expirationTtl: DEFAULTS.rateLimitWindow,
      });
      return json({ error: 'PIN incorreto ou link inexistente.' }, 401);
    }

    const seconds = effectiveSeconds(pad, settings);
    const editable = pad.editable ?? settings.allowEditDefault;
    const exp = Date.now() + seconds * 1000 + 5000; // 5s de tolerância p/ último save
    const token = await sign(env, { t: 'pad', slug, exp, e: editable ? 1 : 0 });

    return json({ content: pad.content || '', seconds, editable, token });
  }

  // save / read exigem token válido dentro da janela
  const claims = await verify(env, body.token);
  if (!claims || claims.t !== 'pad' || claims.slug !== slug) {
    return json({ error: 'Sessão inválida' }, 401);
  }
  if (Date.now() > claims.exp) return json({ error: 'Tempo esgotado' }, 401);

  const pad = await getPad(env, slug);
  if (!pad) return json({ error: 'Link inexistente' }, 404);

  if (action === 'read') {
    return json({ content: pad.content || '', updatedAt: pad.updatedAt });
  }

  // save
  const editable = pad.editable ?? settings.allowEditDefault;
  if (!editable || !claims.e) return json({ error: 'Este link é somente leitura' }, 403);
  const content = String(body.content ?? '');
  if (byteLength(content) > DEFAULTS.contentMaxBytes) {
    return json({ error: 'Texto grande demais' }, 413);
  }
  pad.content = content;
  pad.updatedAt = new Date().toISOString();
  await putPad(env, slug, pad);
  return json({ ok: true, updatedAt: pad.updatedAt });
}

/* ------------------------------------------------------------------ */
/* API — admin                                                         */
/* ------------------------------------------------------------------ */

async function adminApi(request, env, path) {
  if (!sameOrigin(request)) return json({ error: 'Origem inválida' }, 403);

  const sub = path.replace(/^\/api\/admin/, '') || '/';

  if (sub === '/login' && request.method === 'POST') {
    const body = await readJson(request);
    const password = String(body?.password || '');
    if (!password || !(await safeEqual(password, env.ADMIN_PASSWORD))) {
      return json({ error: 'Senha incorreta' }, 401);
    }
    const exp = Date.now() + DEFAULTS.adminSessionHours * 3600 * 1000;
    const token = await sign(env, { t: 'admin', exp });
    return json(
      { ok: true },
      200,
      { 'Set-Cookie': cookie('nl_admin', token, DEFAULTS.adminSessionHours * 3600) },
    );
  }

  if (sub === '/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('nl_admin', '', 0) });
  }

  // tudo abaixo exige sessão
  const session = await adminSession(request, env);
  if (!session) return json({ error: 'Não autenticado' }, 401);

  if (sub === '/me' && request.method === 'GET') return json({ ok: true, exp: session.exp });

  if (sub === '/settings') {
    if (request.method === 'GET') return json(await getSettings(env));
    if (request.method === 'PUT') {
      const body = await readJson(request);
      if (!body) return json({ error: 'JSON inválido' }, 400);
      const settings = await getSettings(env);
      const secs = parseSeconds(body.defaultSeconds);
      if (secs === null) {
        return json({ error: `Tempo deve ser entre ${DEFAULTS.minSeconds} e ${DEFAULTS.maxSeconds} segundos` }, 400);
      }
      settings.defaultSeconds = secs;
      settings.allowEditDefault = Boolean(body.allowEditDefault);
      await env.PADS.put('settings', JSON.stringify(settings));
      return json(settings);
    }
  }

  if (sub === '/pads' && request.method === 'GET') {
    const pads = await listPads(env);
    return json({ pads });
  }

  const one = sub.match(/^\/pads\/([^/]+)$/);
  if (one) {
    const slug = String(one[1]).toLowerCase();
    if (!DEFAULTS.slugRegex.test(slug) || RESERVED.has(slug)) {
      return json({ error: 'Nome inválido. Use letras minúsculas, números e hífen (2 a 40 caracteres).' }, 400);
    }

    if (request.method === 'GET') {
      const pad = await getPad(env, slug);
      return pad ? json({ slug, ...pad }) : json({ error: 'Não encontrado' }, 404);
    }

    if (request.method === 'PUT') {
      const body = await readJson(request);
      if (!body) return json({ error: 'JSON inválido' }, 400);

      const pin = String(body.pin ?? '').trim();
      if (!new RegExp(`^[0-9]{${DEFAULTS.pinMin},${DEFAULTS.pinMax}}$`).test(pin)) {
        return json({ error: `PIN deve ter de ${DEFAULTS.pinMin} a ${DEFAULTS.pinMax} números` }, 400);
      }

      let seconds = null;
      if (body.seconds !== null && body.seconds !== undefined && String(body.seconds).trim() !== '') {
        seconds = parseSeconds(body.seconds);
        if (seconds === null) {
          return json({ error: `Tempo deve ser entre ${DEFAULTS.minSeconds} e ${DEFAULTS.maxSeconds} segundos` }, 400);
        }
      }

      const content = String(body.content ?? '');
      if (byteLength(content) > DEFAULTS.contentMaxBytes) return json({ error: 'Texto grande demais' }, 413);

      const existing = await getPad(env, slug);
      const now = new Date().toISOString();
      const pad = {
        pin,
        seconds, // null = usa o padrão global
        editable: body.editable === null || body.editable === undefined ? null : Boolean(body.editable),
        content,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await putPad(env, slug, pad);
      return json({ slug, ...pad });
    }

    if (request.method === 'DELETE') {
      await env.PADS.delete(`pad:${slug}`);
      return json({ ok: true });
    }
  }

  return json({ error: 'Não encontrado' }, 404);
}

/* ------------------------------------------------------------------ */
/* Dados (KV)                                                          */
/* ------------------------------------------------------------------ */

async function getSettings(env) {
  const s = (await env.PADS.get('settings', 'json')) || {};
  return {
    defaultSeconds: parseSeconds(s.defaultSeconds) ?? DEFAULTS.defaultSeconds,
    allowEditDefault: s.allowEditDefault ?? DEFAULTS.allowEditDefault,
  };
}

async function getPad(env, slug) {
  return env.PADS.get(`pad:${slug}`, 'json');
}

async function putPad(env, slug, pad) {
  await env.PADS.put(`pad:${slug}`, JSON.stringify(pad));
}

async function listPads(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.PADS.list({ prefix: 'pad:', cursor });
    const pads = await Promise.all(
      page.keys.map(async (k) => {
        const pad = await env.PADS.get(k.name, 'json');
        if (!pad) return null;
        return {
          slug: k.name.slice(4),
          pin: pad.pin,
          seconds: pad.seconds ?? null,
          editable: pad.editable ?? null,
          updatedAt: pad.updatedAt,
          createdAt: pad.createdAt,
          size: byteLength(pad.content || ''),
        };
      }),
    );
    out.push(...pads.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

function effectiveSeconds(pad, settings) {
  return parseSeconds(pad.seconds) ?? settings.defaultSeconds;
}

function parseSeconds(v) {
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < DEFAULTS.minSeconds || n > DEFAULTS.maxSeconds) return null;
  return n;
}

/* ------------------------------------------------------------------ */
/* Sessões, assinatura e utilidades                                    */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();

async function hmacKey(env) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode('neostore-link|' + env.ADMIN_PASSWORD),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(env, payload) {
  const key = await hmacKey(env);
  const data = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  return `${data}.${b64url(sig)}`;
}

async function verify(env, token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sigB64] = parts;
  let sig;
  try {
    sig = fromB64url(sigB64);
  } catch {
    return null;
  }
  const key = await hmacKey(env);
  const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(data)));
  } catch {
    return null;
  }
}

async function adminSession(request, env) {
  const cookies = request.headers.get('Cookie') || '';
  const m = cookies.match(/(?:^|;\s*)nl_admin=([^;]+)/);
  if (!m) return null;
  const claims = await verify(env, m[1]);
  if (!claims || claims.t !== 'admin' || Date.now() > claims.exp) return null;
  return claims;
}

async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

async function sha256(str) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str)));
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function byteLength(str) {
  return enc.encode(str).length;
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // fetch same-origin sem Origin (ex.: GET) ou clientes não-browser
  const host = request.headers.get('X-Forwarded-Host') || new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(request) {
  const h = request.headers;
  return (
    h.get('CF-Connecting-IP') ||
    h.get('X-Real-IP') ||
    (h.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown'
  );
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...extra },
  });
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------------ */
/* Páginas                                                             */
/* ------------------------------------------------------------------ */

const BASE_CSS = `
/* Design System NEOSTORE — tokens de design/neostore-design-system/colors_and_type.css */
:root{--neo-teal-50:#E6F0F2;--neo-teal-100:#C2DBDF;--neo-teal-500:#1F6E78;--neo-teal-600:#185863;--neo-teal-700:#12454E;--neo-purple-500:#4A1F4F;
--neo-ink:#0E1112;--neo-steel:#4A5256;--neo-fog:#8C9498;--neo-mist:#C3C9CC;--neo-cloud:#E2E5E7;--neo-paper:#F4F5F6;--neo-white:#fff;
--neo-success:#2E8F5E;--neo-success-bg:#E6F2EC;--neo-error:#B83A3A;--neo-error-bg:#F7E4E4;
--font-sans:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;--font-mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace;
--radius-md:6px;--radius-lg:10px;--shadow-focus:0 0 0 3px rgba(31,110,120,.28);--ease:cubic-bezier(.2,0,0,1)}
*{box-sizing:border-box}
html,body{margin:0}
body{font:400 15px/1.5 var(--font-sans);color:var(--neo-ink);background:var(--neo-paper);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--neo-teal-500);text-decoration:none}a:hover{text-decoration:underline}
::selection{background:var(--neo-teal-500);color:#fff}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.015em;color:var(--neo-ink)}
.brand img{height:24px;width:auto;display:block}
.brand small{color:var(--neo-fog);font-weight:400;font-family:var(--font-mono);font-size:12px}
.card{background:var(--neo-white);border:1px solid var(--neo-cloud);border-radius:var(--radius-lg);padding:24px}
.center{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:16px}
.center .card{width:100%;max-width:420px}
h1{font-size:24px;font-weight:700;letter-spacing:-.015em;line-height:1.12;margin:0 0 6px;text-wrap:balance}
p{margin:0 0 12px;color:var(--neo-steel);line-height:1.5}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--neo-teal-500);margin:16px 0 4px}
label{display:block;font-size:12px;font-weight:600;color:var(--neo-steel);margin:14px 0 6px}
input,textarea,select{width:100%;font:400 14px var(--font-sans);background:var(--neo-white);color:var(--neo-ink);border:1px solid var(--neo-mist);border-radius:var(--radius-md);padding:10px 12px;outline:none;transition:border-color 120ms var(--ease),box-shadow 120ms var(--ease)}
input::placeholder,textarea::placeholder{color:var(--neo-fog)}
input:focus,textarea:focus,select:focus{border-color:var(--neo-teal-500);box-shadow:var(--shadow-focus)}
input.pin{font:500 28px var(--font-mono);letter-spacing:12px;text-align:center;padding:12px}
textarea{min-height:60vh;resize:vertical;font-family:var(--font-mono);font-size:14px;line-height:1.55}
button{display:inline-flex;align-items:center;gap:8px;cursor:pointer;padding:10px 18px;font:600 14px/1 var(--font-sans);border-radius:var(--radius-md);border:1px solid transparent;background:var(--neo-teal-500);color:#fff;transition:background 180ms var(--ease),transform 120ms var(--ease),box-shadow 120ms var(--ease)}
button:hover{background:var(--neo-teal-600)}
button:active{transform:scale(.98)}
button:focus-visible{box-shadow:var(--shadow-focus);outline:none}
button.ghost{background:transparent;color:var(--neo-ink);border-color:var(--neo-steel)}
button.ghost:hover{background:var(--neo-paper)}
button.danger{background:transparent;color:var(--neo-error);border-color:var(--neo-error)}
button.danger:hover{background:var(--neo-error-bg)}
button:disabled{opacity:.4;cursor:not-allowed}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.right{margin-left:auto}
.msg{min-height:20px;font-size:13px;margin-top:10px}
.msg.err{color:var(--neo-error)}
.msg.ok{color:var(--neo-success)}
.muted{color:var(--neo-steel);font-size:13px}
.hidden{display:none!important}
.bar{height:4px;background:var(--neo-cloud);border-radius:2px;overflow:hidden;margin:12px 0}
.bar i{display:block;height:100%;background:var(--neo-teal-500);width:100%;transition:width 1s linear,background 320ms var(--ease)}
.bar i.low{background:var(--neo-error)}
.timer{font:500 18px var(--font-mono);font-variant-numeric:tabular-nums;color:var(--neo-purple-500)}
.timer.low{color:var(--neo-error)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:10px 12px;font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--neo-fog);border-bottom:1px solid var(--neo-cloud)}
td{padding:12px;border-bottom:1px solid var(--neo-cloud);color:var(--neo-ink);vertical-align:middle}
tbody tr:nth-child(even) td{background:#FAFAFB}
tbody tr:last-child td{border-bottom:0}
code{font-family:var(--font-mono);font-size:13px;color:var(--neo-ink)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
.chip{display:inline-flex;gap:6px;align-items:center;padding:2px 8px;font-size:11px;font-weight:500;border-radius:999px;background:var(--neo-teal-50);color:var(--neo-teal-700)}
`;

const SYMBOL = 'data:image/png;base64,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';
const BRAND_IMG = `<img src="${SYMBOL}" alt="" width="20" height="24">`;

function layout(title, body, script = '') {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<link rel="icon" href="${SYMBOL}" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${BASE_CSS}</style>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>`;
}

function homePage(brand) {
  const body = `
<div class="center">
  <div class="card">
    <div class="brand">${BRAND_IMG}${esc(brand)}</div>
    <h1 style="margin-top:14px">Abrir um link</h1>
    <p>Digite o nome do link que você recebeu.</p>
    <form id="f">
      <label>Nome do link</label>
      <input id="slug" placeholder="ex.: evento-abc" autocomplete="off" autocapitalize="none" spellcheck="false" autofocus>
      <div class="row" style="margin-top:14px"><button type="submit">Continuar</button></div>
    </form>
  </div>
</div>`;
  const script = `
document.getElementById('f').addEventListener('submit',function(e){
  e.preventDefault();
  var s=document.getElementById('slug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(s) location.href='/'+encodeURIComponent(s);
});`;
  return layout(brand, body, script);
}

function notFoundPage(brand) {
  const body = `
<div class="center">
  <div class="card">
    <div class="brand">${BRAND_IMG}${esc(brand)}</div>
    <h1 style="margin-top:14px">Endereço inválido</h1>
    <p>Use letras minúsculas, números e hífen.</p>
    <a href="/">Voltar</a>
  </div>
</div>`;
  return layout(brand, body);
}

function padPage(brand, slug) {
  const body = `
<div id="lock" class="center">
  <div class="card">
    <div class="brand">${BRAND_IMG}${esc(brand)} <small>/${esc(slug)}</small></div>
    <div class="eyebrow">Acesso restrito</div>
    <h1>Digite o PIN</h1>
    <p>O conteúdo fica visível por tempo limitado.</p>
    <form id="unlockForm">
      <input id="pin" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="one-time-code" autofocus>
      <div class="row" style="margin-top:14px"><button id="unlockBtn" type="submit">Abrir</button></div>
      <div id="lockMsg" class="msg err"></div>
    </form>
  </div>
</div>

<div id="pad" class="wrap hidden">
  <div class="row">
    <div class="brand">${BRAND_IMG}${esc(brand)} <small>/${esc(slug)}</small></div>
    <span id="timer" class="timer right">--</span>
    <button id="closeBtn" class="ghost">Fechar agora</button>
  </div>
  <div class="bar"><i id="barFill"></i></div>
  <textarea id="content" spellcheck="false" placeholder="Escreva aqui…"></textarea>
  <div class="row"><span id="status" class="muted"></span><span id="readonly" class="chip hidden">somente leitura</span></div>
</div>`;

  const script = `
(function(){
  var SLUG=${JSON.stringify(slug)};
  var lock=document.getElementById('lock'),pad=document.getElementById('pad');
  var pinEl=document.getElementById('pin'),msg=document.getElementById('lockMsg');
  var unlockBtn=document.getElementById('unlockBtn');
  var ta=document.getElementById('content'),timerEl=document.getElementById('timer');
  var bar=document.getElementById('barFill'),status=document.getElementById('status');
  var ro=document.getElementById('readonly');
  var token=null,expiresAt=0,totalMs=0,tick=null,poll=null,saveT=null,dirty=false,lastSaved='';

  function api(path,body,keepalive){
    return fetch('/api/pad/'+encodeURIComponent(SLUG)+'/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:!!keepalive})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'Erro');return j;});});
  }

  document.getElementById('unlockForm').addEventListener('submit',function(e){
    e.preventDefault();
    msg.textContent='';unlockBtn.disabled=true;
    api('unlock',{pin:pinEl.value}).then(function(j){
      pinEl.value='';
      open(j);
    }).catch(function(err){msg.textContent=err.message;pinEl.value='';pinEl.focus();}).finally(function(){unlockBtn.disabled=false;});
  });

  function open(j){
    token=j.token;totalMs=j.seconds*1000;expiresAt=Date.now()+totalMs;
    ta.value=j.content;lastSaved=j.content;dirty=false;
    ta.readOnly=!j.editable;ro.classList.toggle('hidden',!!j.editable);
    status.textContent=j.editable?'Salvo':'';
    lock.classList.add('hidden');pad.classList.remove('hidden');
    if(j.editable) ta.focus();
    clearInterval(tick);tick=setInterval(render,250);render();
    clearInterval(poll);poll=setInterval(refresh,4000);
  }

  function render(){
    var left=expiresAt-Date.now();
    if(left<=0){close('Tempo esgotado. Digite o PIN para abrir novamente.');return;}
    var s=Math.ceil(left/1000);
    timerEl.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
    timerEl.classList.toggle('low',s<=10);bar.classList.toggle('low',s<=10);
    bar.style.width=Math.max(0,(left/totalMs)*100)+'%';
  }

  function close(reason){
    clearInterval(tick);clearInterval(poll);clearTimeout(saveT);
    if(dirty&&token){ save(true); }
    token=null;ta.value='';lastSaved='';dirty=false;
    pad.classList.add('hidden');lock.classList.remove('hidden');
    msg.textContent=reason||'';pinEl.focus();
  }

  document.getElementById('closeBtn').addEventListener('click',function(){close('');});

  ta.addEventListener('input',function(){
    if(ta.readOnly)return;
    dirty=true;status.textContent='Digitando…';
    clearTimeout(saveT);saveT=setTimeout(function(){save(false);},800);
  });

  function save(final){
    if(!token||ta.readOnly)return;
    var val=ta.value;
    status.textContent='Salvando…';
    api('save',{token:token,content:val},final).then(function(){lastSaved=val;if(ta.value===val)dirty=false;status.textContent='Salvo';})
     .catch(function(err){status.textContent='Erro ao salvar: '+err.message;});
  }

  function refresh(){
    if(!token||dirty)return;
    api('read',{token:token}).then(function(j){
      if(!dirty&&j.content!==ta.value){ta.value=j.content;lastSaved=j.content;}
    }).catch(function(){});
  }

  // Ao sair/fechar a aba: tenta salvar o que estiver pendente.
  window.addEventListener('pagehide',function(){ if(dirty&&token){ save(true);} });
})();`;
  return layout(`${brand} — /${slug}`, body, script);
}

function adminPage(brand, adminPath) {
  const body = `
<div id="login" class="center">
  <div class="card">
    <div class="brand">${BRAND_IMG}${esc(brand)} <small>superadmin</small></div>
    <div class="eyebrow">Superadmin</div>
    <h1>Painel</h1>
    <p>Acesso restrito.</p>
    <form id="loginForm">
      <label>Senha do superadmin</label>
      <input id="password" type="password" autocomplete="current-password" autofocus>
      <div class="row" style="margin-top:14px"><button type="submit">Entrar</button></div>
      <div id="loginMsg" class="msg err"></div>
    </form>
  </div>
</div>

<div id="app" class="wrap hidden">
  <div class="row" style="margin-bottom:16px">
    <div class="brand">${BRAND_IMG}${esc(brand)} <small>superadmin</small></div>
    <button id="logout" class="ghost right">Sair</button>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h1>Configuração geral</h1>
    <p>Vale para todos os links que não tiverem tempo próprio.</p>
    <div class="grid">
      <div>
        <label>Tempo de exposição padrão (segundos)</label>
        <input id="defaultSeconds" type="number" min="${DEFAULTS.minSeconds}" max="${DEFAULTS.maxSeconds}">
      </div>
      <div>
        <label>Edição por padrão</label>
        <select id="allowEditDefault"><option value="1">Permitir editar</option><option value="0">Somente leitura</option></select>
      </div>
    </div>
    <div class="row" style="margin-top:14px"><button id="saveSettings">Salvar configuração</button><span id="settingsMsg" class="msg"></span></div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="row"><h1 id="formTitle">Novo link</h1><button id="newBtn" class="ghost right hidden">Novo link</button></div>
    <div class="grid">
      <div>
        <label>Nome (endereço) — <span id="baseUrl" class="muted"></span></label>
        <input id="slug" placeholder="ex.: evento-abc" autocapitalize="none" spellcheck="false">
      </div>
      <div>
        <label>PIN (${DEFAULTS.pinMin} a ${DEFAULTS.pinMax} números)</label>
        <input id="pin" inputmode="numeric" pattern="[0-9]*" maxlength="${DEFAULTS.pinMax}" placeholder="ex.: 2468">
      </div>
      <div>
        <label>Tempo de exposição (segundos) — vazio = padrão</label>
        <input id="seconds" type="number" min="${DEFAULTS.minSeconds}" max="${DEFAULTS.maxSeconds}" placeholder="padrão">
      </div>
      <div>
        <label>Edição</label>
        <select id="editable"><option value="">Padrão</option><option value="1">Permitir editar</option><option value="0">Somente leitura</option></select>
      </div>
    </div>
    <label>Conteúdo inicial</label>
    <textarea id="content" style="min-height:160px" spellcheck="false"></textarea>
    <div class="row" style="margin-top:14px">
      <button id="savePad">Salvar link</button>
      <button id="cancelEdit" class="ghost hidden">Cancelar</button>
      <span id="padMsg" class="msg"></span>
    </div>
  </div>

  <div class="card">
    <h1>Links</h1>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Endereço</th><th>PIN</th><th>Tempo</th><th>Edição</th><th>Atualizado</th><th></th></tr></thead>
      <tbody id="rows"><tr><td colspan="6" class="muted">Carregando…</td></tr></tbody>
    </table>
    </div>
  </div>
</div>`;

  const script = `
(function(){
  var $=function(id){return document.getElementById(id)};
  var login=$('login'),app=$('app');
  var settings={defaultSeconds:${DEFAULTS.defaultSeconds},allowEditDefault:true};
  var editing=null;
  $('baseUrl').textContent=location.origin+'/';

  function api(method,path,body){
    return fetch('/api/admin'+path,{method:method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
      .then(function(r){return r.json().then(function(j){if(r.status===401&&path!=='/login'){showLogin();}if(!r.ok)throw new Error(j.error||'Erro');return j;});});
  }
  function flash(el,text,ok){el.textContent=text;el.className='msg '+(ok?'ok':'err');setTimeout(function(){el.textContent='';},3000);}
  function showLogin(){app.classList.add('hidden');login.classList.remove('hidden');}
  function showApp(){login.classList.add('hidden');app.classList.remove('hidden');loadAll();}

  $('loginForm').addEventListener('submit',function(e){
    e.preventDefault();$('loginMsg').textContent='';
    api('POST','/login',{password:$('password').value}).then(function(){$('password').value='';showApp();})
      .catch(function(err){$('loginMsg').textContent=err.message;});
  });
  $('logout').addEventListener('click',function(){api('POST','/logout').then(showLogin);});

  function loadAll(){
    api('GET','/settings').then(function(s){
      settings=s;$('defaultSeconds').value=s.defaultSeconds;$('allowEditDefault').value=s.allowEditDefault?'1':'0';
    }).catch(function(){});
    loadPads();
  }

  $('saveSettings').addEventListener('click',function(){
    api('PUT','/settings',{defaultSeconds:Number($('defaultSeconds').value),allowEditDefault:$('allowEditDefault').value==='1'})
      .then(function(s){settings=s;flash($('settingsMsg'),'Configuração salva',true);loadPads();})
      .catch(function(err){flash($('settingsMsg'),err.message,false);});
  });

  function fmtDate(iso){if(!iso)return '-';var d=new Date(iso);return d.toLocaleString('pt-BR');}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function loadPads(){
    api('GET','/pads').then(function(j){
      var rows=$('rows');rows.innerHTML='';
      if(!j.pads.length){rows.innerHTML='<tr><td colspan="6" class="muted">Nenhum link criado ainda.</td></tr>';return;}
      j.pads.forEach(function(p){
        var tr=document.createElement('tr');
        var secs=p.seconds!=null?p.seconds+' s':'padrão ('+settings.defaultSeconds+' s)';
        var ed=p.editable==null?'padrão':(p.editable?'sim':'não');
        tr.innerHTML='<td><a href="/'+esc(p.slug)+'" target="_blank" rel="noopener">/'+esc(p.slug)+'</a></td>'+
          '<td><code>'+esc(p.pin)+'</code></td><td>'+esc(secs)+'</td><td>'+esc(ed)+'</td><td class="muted">'+esc(fmtDate(p.updatedAt))+'</td>'+
          '<td class="row" style="flex-wrap:nowrap"><button class="ghost" data-a="copy" data-s="'+esc(p.slug)+'">Copiar link</button>'+
          '<button class="ghost" data-a="edit" data-s="'+esc(p.slug)+'">Editar</button>'+
          '<button class="danger" data-a="del" data-s="'+esc(p.slug)+'">Excluir</button></td>';
        rows.appendChild(tr);
      });
    }).catch(function(err){$('rows').innerHTML='<tr><td colspan="6" class="msg err">'+esc(err.message)+'</td></tr>';});
  }

  $('rows').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    var slug=b.getAttribute('data-s'),a=b.getAttribute('data-a');
    if(a==='copy'){
      var url=location.origin+'/'+slug;
      (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){b.textContent='Copiado';setTimeout(function(){b.textContent='Copiar link';},1500);}).catch(function(){prompt('Copie o link:',url);});
    }
    if(a==='edit'){
      api('GET','/pads/'+slug).then(function(p){
        editing=slug;$('formTitle').textContent='Editar /'+slug;$('slug').value=slug;$('slug').disabled=true;
        $('pin').value=p.pin;$('seconds').value=p.seconds==null?'':p.seconds;$('editable').value=p.editable==null?'':(p.editable?'1':'0');
        $('content').value=p.content||'';$('cancelEdit').classList.remove('hidden');$('newBtn').classList.remove('hidden');
        window.scrollTo({top:$('formTitle').offsetTop-20,behavior:'smooth'});
      }).catch(function(err){alert(err.message);});
    }
    if(a==='del'){
      if(!confirm('Excluir /'+slug+'? Isso apaga o conteúdo.'))return;
      api('DELETE','/pads/'+slug).then(function(){loadPads();if(editing===slug)resetForm();}).catch(function(err){alert(err.message);});
    }
  });

  function resetForm(){
    editing=null;$('formTitle').textContent='Novo link';$('slug').value='';$('slug').disabled=false;
    $('pin').value='';$('seconds').value='';$('editable').value='';$('content').value='';
    $('cancelEdit').classList.add('hidden');$('newBtn').classList.add('hidden');
  }
  $('cancelEdit').addEventListener('click',resetForm);
  $('newBtn').addEventListener('click',resetForm);

  $('savePad').addEventListener('click',function(){
    var slug=(editing||$('slug').value).trim().toLowerCase();
    if(!slug){flash($('padMsg'),'Informe o nome do link',false);return;}
    var body={pin:$('pin').value.trim(),seconds:$('seconds').value===''?null:Number($('seconds').value),
      editable:$('editable').value===''?null:$('editable').value==='1',content:$('content').value};
    api('PUT','/pads/'+encodeURIComponent(slug),body).then(function(){
      flash($('padMsg'),'Link salvo: '+location.origin+'/'+slug,true);resetForm();loadPads();
    }).catch(function(err){flash($('padMsg'),err.message,false);});
  });

  api('GET','/me').then(showApp).catch(showLogin);
})();`;
  return layout(`${brand} — Painel`, body, script);
}
