/**
 * Adaptador de storage: Upstash Redis (REST) com a mesma interface do
 * Cloudflare KV que o app.js espera. Sem dependências.
 *
 * Aceita as variáveis que a Vercel injeta ao conectar um banco Upstash
 * (KV_REST_API_URL / KV_REST_API_TOKEN) ou as da integração antiga
 * (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 */
export function createUpstashKV(env = process.env) {
  const url = (env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!url || !token) return null;

  async function cmd(...args) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args.map(String)),
    });
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(`Upstash: ${data.error || r.status}`);
    return data.result;
  }

  return {
    async get(key, type) {
      const v = await cmd('GET', key);
      if (v === null || v === undefined) return null;
      if (type === 'json') {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      }
      return String(v);
    },
    async put(key, value, opts = {}) {
      const ttl = Number(opts.expirationTtl);
      if (Number.isInteger(ttl) && ttl > 0) await cmd('SET', key, value, 'EX', ttl);
      else await cmd('SET', key, value);
    },
    async delete(key) {
      await cmd('DEL', key);
    },
    async list({ prefix = '', cursor } = {}) {
      const keys = [];
      let c = cursor || '0';
      do {
        const [next, batch] = await cmd('SCAN', c, 'MATCH', `${prefix}*`, 'COUNT', 200);
        for (const name of batch) keys.push({ name });
        c = String(next);
      } while (c !== '0');
      return { keys, list_complete: true };
    },
  };
}
