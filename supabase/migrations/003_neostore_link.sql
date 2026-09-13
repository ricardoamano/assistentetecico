-- Neostore Link (link.neostore.app) — storage chave/valor
-- Aplicado no projeto Supabase "neostore-site".
--
-- Segurança: as tabelas não têm policies (RLS ligado = ninguém acessa via API).
-- Todo acesso passa pela função neostore_link_kv_op(), que exige um segredo
-- guardado em neostore_link_config. A Vercel usa só a chave pública (anon)
-- + o segredo (LINK_DB_SECRET). Nenhuma service key sai do Supabase.

create table if not exists public.neostore_link_kv (
  key        text primary key,
  value      text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.neostore_link_config (
  id     int primary key default 1 check (id = 1),
  secret text not null
);

alter table public.neostore_link_kv     enable row level security;
alter table public.neostore_link_config enable row level security;
revoke all on public.neostore_link_kv     from anon, authenticated;
revoke all on public.neostore_link_config from anon, authenticated;

create or replace function public.neostore_link_kv_op(
  p_secret text,
  p_op     text,
  p_key    text default null,
  p_value  text default null,
  p_ttl    int  default null,
  p_prefix text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg_secret text;
  v_value    text;
begin
  select secret into cfg_secret from neostore_link_config where id = 1;
  if cfg_secret is null or p_secret is null or p_secret <> cfg_secret then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  -- limpeza oportunista de chaves expiradas (rate limit)
  delete from neostore_link_kv where expires_at is not null and expires_at < now();

  if p_op = 'get' then
    select value into v_value from neostore_link_kv
     where key = p_key and (expires_at is null or expires_at > now());
    return jsonb_build_object('value', v_value);

  elsif p_op = 'put' then
    insert into neostore_link_kv (key, value, expires_at, updated_at)
    values (p_key, p_value,
            case when p_ttl is not null and p_ttl > 0 then now() + make_interval(secs => p_ttl) end,
            now())
    on conflict (key) do update
      set value = excluded.value, expires_at = excluded.expires_at, updated_at = now();
    return jsonb_build_object('ok', true);

  elsif p_op = 'delete' then
    delete from neostore_link_kv where key = p_key;
    return jsonb_build_object('ok', true);

  elsif p_op = 'list' then
    return jsonb_build_object('keys', coalesce((
      select jsonb_agg(key order by key) from neostore_link_kv
       where left(key, length(p_prefix)) = p_prefix
         and (expires_at is null or expires_at > now())
    ), '[]'::jsonb));
  end if;

  raise exception 'invalid op %', p_op;
end;
$$;

revoke all on function public.neostore_link_kv_op(text, text, text, text, int, text) from public;
grant execute on function public.neostore_link_kv_op(text, text, text, text, int, text) to anon, authenticated, service_role;
