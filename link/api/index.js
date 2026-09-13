/**
 * Vercel Function: recebe TODAS as rotas (ver vercel.json) e entrega ao app.js.
 * Converte a requisição Node (req, res) em Request/Response padrão web.
 */
import { handleRequest } from '../app.js';
import { createUpstashKV } from '../lib/upstash.js';
import { createSupabaseKV } from '../lib/supabase.js';

export default async function handler(req, res) {
  const proto = firstHeader(req, 'x-forwarded-proto') || 'https';
  const host = firstHeader(req, 'x-forwarded-host') || firstHeader(req, 'host') || 'localhost';

  // O rewrite em vercel.json manda o caminho original em ?__path=
  const incoming = new URL(req.url || '/', `${proto}://${host}`);
  const original = incoming.searchParams.get('__path');
  incoming.searchParams.delete('__path');
  const pathname = original !== null ? '/' + original.replace(/^\/+/, '') : incoming.pathname;
  const url = `${proto}://${host}${pathname}${incoming.search}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  }

  const method = req.method || 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
  const request = new Request(url, { method, headers, body });

  const env = {
    // Storage: Supabase (padrão) ou Upstash Redis, conforme as variáveis presentes.
    PADS: createSupabaseKV(process.env) || createUpstashKV(process.env),
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_PATH: process.env.ADMIN_PATH,
    BRAND_NAME: process.env.BRAND_NAME,
  };
  if (!env.PADS) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Banco não configurado: defina SUPABASE_URL, SUPABASE_ANON_KEY e LINK_DB_SECRET (ou KV_REST_API_URL / KV_REST_API_TOKEN para Upstash).' }));
    return;
  }

  const response = await handleRequest(request, env);

  res.statusCode = response.status;
  const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    res.setHeader(key, value);
  });
  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function firstHeader(req, name) {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}
