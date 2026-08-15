-- ============================================================
-- Tablet Comercial — Fase 1
-- Migration 002 — RLS e permissões
--
-- Modelo de acesso:
--  * Tablets (anon key) NUNCA leem app_config / menu_items / publicacoes.
--    Eles só falam com a Edge Function /manifest e com o Storage público.
--  * Tablets podem fazer upsert em devices, restrito às colunas de heartbeat
--    (a coluna "apelido" é só do admin).
--  * Admin (usuário autenticado) tem acesso total às quatro tabelas.
--  * A service_role (usada pela Edge Function) ignora RLS por padrão.
-- ============================================================

alter table app_config  enable row level security;
alter table menu_items  enable row level security;
alter table publicacoes enable row level security;
alter table devices     enable row level security;

-- ------------------------------------------------------------
-- Revoga os privilégios padrão do papel anon
-- (o Supabase concede tudo por padrão em tabelas novas)
-- ------------------------------------------------------------
revoke all on app_config  from anon;
revoke all on menu_items  from anon;
revoke all on publicacoes from anon;
revoke all on devices     from anon;

-- ------------------------------------------------------------
-- devices: heartbeat com a anon key, só nas colunas permitidas
-- (upsert via PostgREST precisa de INSERT + UPDATE + SELECT)
-- ------------------------------------------------------------
grant select (device_id, versao_ativa, versao_baixada, bytes_baixados,
              online_em, bateria, memoria_mb, user_agent, ultimo_erro, erros_24h)
  on devices to anon;

grant insert (device_id, versao_ativa, versao_baixada, bytes_baixados,
              online_em, bateria, memoria_mb, user_agent, ultimo_erro, erros_24h)
  on devices to anon;

grant update (versao_ativa, versao_baixada, bytes_baixados,
              online_em, bateria, memoria_mb, user_agent, ultimo_erro, erros_24h)
  on devices to anon;

create policy "heartbeat: select anon"
  on devices for select to anon
  using (true);

create policy "heartbeat: insert anon"
  on devices for insert to anon
  with check (true);

create policy "heartbeat: update anon"
  on devices for update to anon
  using (true) with check (true);

-- ------------------------------------------------------------
-- Admin autenticado: acesso total
-- ------------------------------------------------------------
create policy "admin: app_config"
  on app_config for all to authenticated
  using (true) with check (true);

create policy "admin: menu_items"
  on menu_items for all to authenticated
  using (true) with check (true);

create policy "admin: publicacoes"
  on publicacoes for all to authenticated
  using (true) with check (true);

create policy "admin: devices"
  on devices for all to authenticated
  using (true) with check (true);
