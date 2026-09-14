/**
 * Testes locais, sem serviços externos:  `npm test`
 *  1. app.js direto, com KV em memória (equivale ao Cloudflare Workers)
 *  2. api/index.js (Vercel) atrás de um servidor HTTP + Upstash REST simulado
 */
import http from 'node:http';
import assert from 'node:assert/strict';
import app, { parseItems, qrPayload } from '../app.js';
import handler from '../api/index.js';

const ORIGIN = 'https://link.neostore.app';

/* ---------- KV em memória (interface Cloudflare KV) ---------- */
function memoryKV() {
  const store = new Map();
  return {
    async get(k, type) {
      const v = store.get(k);
      if (v === undefined) return null;
      if (v.exp && v.exp < Date.now()) { store.delete(k); return null; }
      return type === 'json' ? JSON.parse(v.value) : v.value;
    },
    async put(k, value, opts = {}) {
      store.set(k, { value, exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 });
    },
    async delete(k) { store.delete(k); },
    async list({ prefix }) {
      return { keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
    },
  };
}

/* ---------- Upstash REST simulado (GET/SET/DEL/SCAN) ---------- */
function mockUpstash() {
  const store = new Map();
  const server = http.createServer(async (req, res) => {
    if (req.headers.authorization !== 'Bearer tok') { res.writeHead(401); return res.end('{"error":"Unauthorized"}'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const [c, ...a] = JSON.parse(Buffer.concat(chunks).toString());
    let result = null;
    const live = (k) => { const v = store.get(k); if (v && v.exp && v.exp < Date.now()) { store.delete(k); return undefined; } return v; };
    if (c === 'GET') result = live(a[0])?.value ?? null;
    else if (c === 'SET') { const ttl = a[2] === 'EX' ? Number(a[3]) : 0; store.set(a[0], { value: a[1], exp: ttl ? Date.now() + ttl * 1000 : 0 }); result = 'OK'; }
    else if (c === 'DEL') result = store.delete(a[0]) ? 1 : 0;
    else if (c === 'SCAN') { const m = a[2].replace(/\*$/, ''); result = ['0', [...store.keys()].filter((k) => k.startsWith(m) && live(k))]; }
    else { res.writeHead(400); return res.end(JSON.stringify({ error: 'ERR unknown ' + c })); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ result }));
  });
  return new Promise((r) => server.listen(0, () => r({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

/* ---------- Supabase RPC simulado (neostore_link_kv_op) ---------- */
function mockSupabase() {
  const store = new Map();
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const b = JSON.parse(Buffer.concat(chunks).toString());
    if (req.url !== '/rest/v1/rpc/neostore_link_kv_op' || req.headers.apikey !== 'anon' || b.p_secret !== 'segredo') {
      res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"message":"unauthorized"}');
    }
    for (const [k, v] of store) if (v.exp && v.exp < Date.now()) store.delete(k);
    let out;
    if (b.p_op === 'get') out = { value: store.get(b.p_key)?.value ?? null };
    else if (b.p_op === 'put') { store.set(b.p_key, { value: b.p_value, exp: b.p_ttl ? Date.now() + b.p_ttl * 1000 : 0 }); out = { ok: true }; }
    else if (b.p_op === 'delete') { store.delete(b.p_key); out = { ok: true }; }
    else if (b.p_op === 'list') out = { keys: [...store.keys()].filter((k) => k.startsWith(b.p_prefix)).sort() };
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
  });
  return new Promise((r) => server.listen(0, () => r({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

/* ---------- Servidor que imita a Vercel (rewrite + handler) ---------- */
function vercelLike() {
  const server = http.createServer((req, res) => {
    // vercel.json: "/:path*" -> "/api/index?__path=:path*"
    const u = new URL(req.url, 'http://x');
    req.url = '/api/index?__path=' + encodeURIComponent(u.pathname.slice(1)) + (u.search ? '&' + u.search.slice(1) : '');
    req.headers['x-forwarded-proto'] = 'https';
    req.headers['x-forwarded-host'] = 'link.neostore.app';
    handler(req, res);
  });
  return new Promise((r) => server.listen(0, () => r({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

/* ---------- Roteiro comum ---------- */
async function scenario(name, send) {
  let cookie = '';
  const req = async (path, { method = 'GET', body, headers = {}, ip } = {}) => {
    const h = { ...headers };
    if (body !== undefined) { h['Content-Type'] = 'application/json'; if (!h.Origin) h.Origin = ORIGIN; }
    if (cookie) h.Cookie = cookie;
    if (ip) { h['CF-Connecting-IP'] = ip; h['X-Forwarded-For'] = ip; }
    const r = await send(path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('Set-Cookie'); if (sc) cookie = sc.split(';')[0];
    const ct = r.headers.get('Content-Type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : await r.text(), headers: r.headers };
  };

  let r = await req('/'); assert.equal(r.status, 200); assert.match(r.data, /Abrir um link/);
  r = await req('/static/qr.js'); assert.equal(r.status, 200); assert.match(r.headers.get('Content-Type'), /javascript/); assert.match(r.data, /qrcode/);
  r = await req('/evento-abc'); assert.match(r.data, /function parseItems/); assert.match(r.data, /static\/qr\.js/);
  r = await req('/painel'); assert.equal(r.status, 200); assert.match(r.data, /superadmin/);
  r = await req('/admin'); assert.equal(r.status, 404);
  r = await req('/evento-abc'); assert.equal(r.status, 200); assert.match(r.data, /Digite o PIN/);
  r = await req('/Evento_ABC!'); assert.equal(r.status, 404);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');

  r = await req('/api/admin/pads'); assert.equal(r.status, 401);
  r = await req('/api/admin/login', { method: 'POST', body: { password: 'errada' } }); assert.equal(r.status, 401);
  r = await req('/api/admin/login', { method: 'POST', body: { password: 'super123' } }); assert.equal(r.status, 200); assert.ok(cookie.startsWith('nl_admin='));
  r = await req('/api/admin/me'); assert.equal(r.status, 200);

  r = await req('/api/admin/settings'); assert.deepEqual(r.data, { defaultSeconds: 60, allowEditDefault: true });
  r = await req('/api/admin/settings', { method: 'PUT', body: { defaultSeconds: 2, allowEditDefault: true } }); assert.equal(r.status, 400);
  r = await req('/api/admin/settings', { method: 'PUT', body: { defaultSeconds: 30, allowEditDefault: true } }); assert.equal(r.data.defaultSeconds, 30);

  r = await req('/api/admin/pads/evento-abc', { method: 'PUT', body: { pin: '12', content: 'x' } }); assert.equal(r.status, 400);
  r = await req('/api/admin/pads/evento-abc', { method: 'PUT', body: { pin: '2468', content: 'Senha do wifi: abc', seconds: null, editable: null } }); assert.equal(r.status, 200);
  r = await req('/api/admin/pads/somente-leitura', { method: 'PUT', body: { pin: '1111', content: 'RO', seconds: 10, editable: false } }); assert.equal(r.status, 200);
  r = await req('/api/admin/pads/admin', { method: 'PUT', body: { pin: '1111', content: '' } }); assert.equal(r.status, 400);
  r = await req('/api/admin/pads'); assert.equal(r.data.pads.length, 2); assert.equal(r.data.pads[0].slug, 'evento-abc'); assert.equal(r.data.pads[0].pin, '2468');

  r = await req('/api/admin/pads/x1', { method: 'PUT', body: { pin: '1234' }, headers: { Origin: 'https://evil.com' } }); assert.equal(r.status, 403);

  const saved = cookie; cookie = '';
  r = await req('/api/pad/evento-abc/unlock', { method: 'POST', body: { pin: '0000' }, ip: '1.1.1.1' }); assert.equal(r.status, 401);
  r = await req('/api/pad/nao-existe/unlock', { method: 'POST', body: { pin: '0000' }, ip: '1.1.1.1' }); assert.equal(r.status, 401); assert.equal(r.data.error, 'PIN incorreto ou link inexistente.');
  r = await req('/api/pad/evento-abc/unlock', { method: 'POST', body: { pin: '2468' }, ip: '1.1.1.1' }); assert.equal(r.status, 200);
  assert.equal(r.data.content, 'Senha do wifi: abc'); assert.equal(r.data.seconds, 30); assert.equal(r.data.editable, true);
  const token = r.data.token;

  r = await req('/api/pad/evento-abc/save', { method: 'POST', body: { token, content: 'novo texto' } }); assert.equal(r.status, 200);
  r = await req('/api/pad/evento-abc/read', { method: 'POST', body: { token } }); assert.equal(r.data.content, 'novo texto');
  r = await req('/api/pad/somente-leitura/read', { method: 'POST', body: { token } }); assert.equal(r.status, 401);
  r = await req('/api/pad/evento-abc/read', { method: 'POST', body: { token: token.slice(0, -2) + 'zz' } }); assert.equal(r.status, 401);

  r = await req('/api/pad/somente-leitura/unlock', { method: 'POST', body: { pin: '1111' }, ip: '1.1.1.1' }); assert.equal(r.data.editable, false); assert.equal(r.data.seconds, 10);
  r = await req('/api/pad/somente-leitura/save', { method: 'POST', body: { token: r.data.token, content: 'hack' } }); assert.equal(r.status, 403);

  for (let i = 0; i < 8; i++) await req('/api/pad/evento-abc/unlock', { method: 'POST', body: { pin: '9999' }, ip: '2.2.2.2' });
  r = await req('/api/pad/evento-abc/unlock', { method: 'POST', body: { pin: '2468' }, ip: '2.2.2.2' }); assert.equal(r.status, 429);
  r = await req('/api/pad/evento-abc/unlock', { method: 'POST', body: { pin: '2468' }, ip: '3.3.3.3' }); assert.equal(r.status, 200);

  cookie = saved;
  r = await req('/api/admin/pads/evento-abc', { method: 'DELETE' }); assert.equal(r.status, 200);
  r = await req('/api/admin/pads'); assert.equal(r.data.pads.length, 1);
  await req('/api/admin/logout', { method: 'POST' }); assert.match(cookie, /nl_admin=$/);
  cookie = 'nl_admin=';
  r = await req('/api/admin/me'); assert.equal(r.status, 401);
  console.log(`✔ ${name}`);
}

/* ---------- 0. parser de padrões ---------- */
{
  const txt = [
    'Ficha do evento ABC',
    'Site do cliente: https://cliente.com.br/evento?x=1',
    'Painel: link.neostore.app/evento-abc',
    'www.google.com e neostore.app',
    'Wifi: Evento2026 / abc!123',
    'rede: Producao ; senha: s3nh4',
    'WIFI:T:WPA;S:Palco A;P:pa\\;ss;;',
    'Senha do notebook: Neo@2026',
    'IP do roteador: 192.168.0.1',
    'Servidor = 10.0.0.5:8080',
    'Contato: tecnico@neostore.com.br',
    'Versão do app 1.2.3 sem link',
    'linha solta sem padrão',
  ].join('\n');
  const it = parseItems(txt);
  const by = (t) => it.filter((i) => i.type === t).map((i) => i.value);
  assert.deepEqual(by('url'), ['https://cliente.com.br/evento?x=1', 'link.neostore.app/evento-abc', 'www.google.com', 'neostore.app']);
  assert.equal(it.find((i) => i.value === 'link.neostore.app/evento-abc').href, 'https://link.neostore.app/evento-abc');
  assert.equal(it.find((i) => i.value === 'link.neostore.app/evento-abc').label, 'Painel');
  assert.deepEqual(it.filter((i) => i.type === 'wifi').map((i) => [i.value, i.pass]), [['Evento2026', 'abc!123'], ['Producao', 's3nh4'], ['Palco A', 'pa;ss']]);
  assert.deepEqual(by('text'), ['Neo@2026']);
  assert.deepEqual(by('ip'), ['192.168.0.1', '10.0.0.5:8080']);
  assert.equal(it.find((i) => i.type === 'ip' && i.value === '10.0.0.5:8080').href, 'http://10.0.0.5:8080');
  assert.deepEqual(by('email'), ['tecnico@neostore.com.br']);
  assert.ok(!it.some((i) => i.value === 'neostore.com.br'), 'domínio do e-mail não vira link');
  assert.ok(!it.some((i) => i.value.includes('1.2.3')), 'versão não vira IP/link');
  assert.equal(qrPayload(it.find((i) => i.value === 'Evento2026')), 'WIFI:T:WPA;S:Evento2026;P:abc!123;;');
  assert.equal(qrPayload(it.find((i) => i.value === 'Palco A')), 'WIFI:T:WPA;S:Palco A;P:pa\\;ss;;');
  assert.equal(qrPayload(it.find((i) => i.type === 'email')), 'mailto:tecnico@neostore.com.br');
  assert.deepEqual(parseItems(''), []);
  console.log('✔ parser de padrões (url, ip, e-mail, wifi, nome: valor)');
}

/* ---------- 1. app.js direto ---------- */
{
  const env = { PADS: memoryKV(), ADMIN_PASSWORD: 'super123', ADMIN_PATH: 'painel' };
  await scenario('app.js + KV em memória (Cloudflare)', (path, init) => app.fetch(new Request(ORIGIN + path, init), env));

  // token expirado
  const token = await (async () => {
    await env.PADS.put('pad:tt', JSON.stringify({ pin: '1234', content: 'x' }));
    const r = await app.fetch(new Request(ORIGIN + '/api/pad/tt/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"pin":"1234"}' }), env);
    return (await r.json()).token;
  })();
  const realNow = Date.now; Date.now = () => realNow() + 3600 * 1000;
  const r = await app.fetch(new Request(ORIGIN + '/api/pad/tt/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }), env);
  Date.now = realNow;
  assert.equal(r.status, 401); assert.equal((await r.json()).error, 'Tempo esgotado');
  console.log('✔ token expira após a janela');
}

/* ---------- 2. Vercel: api/index.js + Upstash simulado ---------- */
{
  const up = await mockUpstash();
  process.env.KV_REST_API_URL = up.url; process.env.KV_REST_API_TOKEN = 'tok';
  process.env.ADMIN_PASSWORD = 'super123'; process.env.ADMIN_PATH = 'painel';
  const v = await vercelLike();
  await scenario('api/index.js + Upstash REST simulado (Vercel)', (path, init) => fetch(v.url + path, init));
  up.server.close(); v.server.close();
}

/* ---------- 3. Vercel: api/index.js + Supabase RPC simulado ---------- */
{
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  const sb = await mockSupabase();
  process.env.SUPABASE_URL = sb.url; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.LINK_DB_SECRET = 'segredo';
  const v = await vercelLike();
  await scenario('api/index.js + Supabase RPC simulado (Vercel)', (path, init) => fetch(v.url + path, init));
  sb.server.close(); v.server.close();
}

console.log('\nTODOS OS TESTES PASSARAM');
