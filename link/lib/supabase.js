/**
 * Adaptador de storage: Supabase (Postgres) com a mesma interface do
 * Cloudflare KV que o app.js espera. Sem dependências.
 *
 * Usa a função neostore_link_kv_op() criada em
 * supabase/migrations/003_neostore_link.sql. Precisa de:
 *   SUPABASE_URL, SUPABASE_ANON_KEY (chave pública) e LINK_DB_SECRET.
 */
export function createSupabaseKV(env = process.env) {
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const anon = env.SUPABASE_ANON_KEY || '';
  const secret = env.LINK_DB_SECRET || '';
  if (!url || !anon || !secret) return null;

  async function op(body) {
    const r = await fetch(`${url}/rest/v1/rpc/neostore_link_kv_op`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secret, ...body }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Supabase: ${data.message || data.error || r.status}`);
    return data;
  }

  return {
    async get(key, type) {
      const { value } = await op({ p_op: 'get', p_key: key });
      if (value === null || value === undefined) return null;
      if (type === 'json') {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return String(value);
    },
    async put(key, value, opts = {}) {
      const ttl = Number(opts.expirationTtl);
      await op({ p_op: 'put', p_key: key, p_value: String(value), p_ttl: Number.isInteger(ttl) && ttl > 0 ? ttl : null });
    },
    async delete(key) {
      await op({ p_op: 'delete', p_key: key });
    },
    async list({ prefix = '' } = {}) {
      const { keys } = await op({ p_op: 'list', p_prefix: prefix });
      return { keys: (keys || []).map((name) => ({ name })), list_complete: true };
    },
  };
}
