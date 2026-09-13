/**
 * NEOSTORE LINK — pad de texto protegido por PIN com tempo de exposição.
 *
 * Estilo dontpad.com, porém:
 *  - cada /nome exige um PIN numérico para abrir;
 *  - o conteúdo fica visível só por N segundos (configurável no admin);
 *  - o painel de superadmin fica em outro endereço (/admin por padrão,
 *    configurável pela variável ADMIN_PATH) e exige senha própria.
 *
 * Roda em Cloudflare Workers. Precisa de:
 *  - KV binding chamado PADS
 *  - Secret ADMIN_PASSWORD (senha do superadmin)
 *  - (opcional) variável ADMIN_PATH   — caminho do painel, ex.: "painel-secreto"
 *  - (opcional) variável BRAND_NAME   — nome exibido, padrão "Neostore Link"
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

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      console.error(err);
      return json({ error: 'Erro interno' }, 500);
    }
  },
};

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
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
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
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
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
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'",
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
:root{--bg:#0b1220;--panel:#111a2e;--panel2:#16213a;--line:#24314f;--text:#e6ebf5;--muted:#8b97b3;--accent:#f5a623;--accent2:#ffc35c;--danger:#ff5c6c;--ok:#3ddc97}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--accent2)}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.3px}
.brand .dot{width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.brand small{color:var(--muted);font-weight:500}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}
.center{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:16px}
.center .card{width:100%;max-width:420px}
h1{font-size:20px;margin:0 0 6px}
p{margin:0 0 12px;color:var(--muted)}
label{display:block;font-size:13px;color:var(--muted);margin:12px 0 6px}
input,textarea,select{width:100%;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:inherit;outline:none}
input:focus,textarea:focus{border-color:var(--accent)}
input.pin{font-size:28px;letter-spacing:12px;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace}
textarea{min-height:60vh;resize:vertical;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;line-height:1.55}
button{cursor:pointer;border:0;border-radius:10px;padding:11px 16px;font:inherit;font-weight:600;background:var(--accent);color:#1a1200}
button.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
button.danger{background:var(--danger);color:#fff}
button:disabled{opacity:.5;cursor:not-allowed}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.right{margin-left:auto}
.msg{min-height:20px;font-size:13px;margin-top:10px}
.msg.err{color:var(--danger)}
.msg.ok{color:var(--ok)}
.muted{color:var(--muted);font-size:13px}
.hidden{display:none!important}
.bar{height:6px;background:var(--line);border-radius:6px;overflow:hidden;margin:10px 0}
.bar i{display:block;height:100%;background:var(--accent);width:100%;transition:width 1s linear}
.timer{font-variant-numeric:tabular-nums;font-weight:700;font-size:18px}
.timer.low{color:var(--danger)}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
code{background:var(--panel2);padding:2px 6px;border-radius:6px;font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
.chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);color:var(--muted)}
`;

function layout(title, body, script = '') {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
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
    <div class="brand"><span class="dot"></span>${esc(brand)}</div>
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
    <div class="brand"><span class="dot"></span>${esc(brand)}</div>
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
    <div class="brand"><span class="dot"></span>${esc(brand)} <small>/${esc(slug)}</small></div>
    <h1 style="margin-top:14px">Digite o PIN</h1>
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
    <div class="brand"><span class="dot"></span>${esc(brand)} <small>/${esc(slug)}</small></div>
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
    timerEl.classList.toggle('low',s<=10);
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
    <div class="brand"><span class="dot"></span>${esc(brand)} <small>superadmin</small></div>
    <h1 style="margin-top:14px">Painel</h1>
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
    <div class="brand"><span class="dot"></span>${esc(brand)} <small>superadmin</small></div>
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
    <div class="row"><h1 id="formTitle">Novo link</h1><button id="newBtn" class="ghost right hidden">+ Novo</button></div>
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
      (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){b.textContent='Copiado!';setTimeout(function(){b.textContent='Copiar link';},1500);}).catch(function(){prompt('Copie o link:',url);});
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
