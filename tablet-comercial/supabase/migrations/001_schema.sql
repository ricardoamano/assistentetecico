-- =============================================================
-- Tablet Comercial — Fase 1
-- 001: Tabelas, RLS e permissões
-- =============================================================

-- -------------------------------------------------------------
-- Configuração global do app (linha única)
-- -------------------------------------------------------------
create table app_config (
  id                     int primary key default 1,
  nome_evento            text not null default 'Tablet Comercial',
  logo_url               text,
  fundo_url              text,
  idle_timeout_segundos  int  not null default 120,   -- 0 = desligado
  idle_aviso_segundos    int  not null default 10,
  poll_intervalo_minutos int  not null default 10,
  pin_admin_local        text not null default '4321',
  texto_banner_update    text not null default 'Nova versão de conteúdo disponível.',
  versao_publicada       int  not null default 1,
  publicado_em           timestamptz not null default now(),
  constraint singleton check (id = 1)
);

-- -------------------------------------------------------------
-- Itens do menu
-- -------------------------------------------------------------
create table menu_items (
  id             uuid primary key default gen_random_uuid(),
  ordem          int  not null,
  titulo         text not null,
  subtitulo      text,
  tipo           text not null check (tipo in ('pdf','video','link','imagem')),
  url_externa    text,                        -- tipo = 'link'
  modo_abertura  text not null default 'navegar' check (modo_abertura in ('navegar','iframe')),
  storage_path   text,                        -- tipo = pdf/video/imagem
  arquivo_hash   text,                        -- sha256 — é o que decide o redownload
  arquivo_bytes  bigint,
  arquivo_mime   text,
  midia_ok       boolean default false,       -- passou na validação técnica
  midia_aviso    text,                        -- motivo, quando não passou
  origem_url     text,                        -- referência (ex.: link do Drive), nunca usada pelo tablet
  thumb_path     text,
  cor_card       text default 'verde_escuro', -- verde_escuro | verde | lima | branco
  fallback_path  text,                        -- PDF alternativo p/ link quando offline
  ativo          boolean not null default true,
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now()
);

-- atualizado_em automático
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_menu_items_atualizado
  before update on menu_items
  for each row execute function set_atualizado_em();

-- -------------------------------------------------------------
-- Dispositivos (heartbeat dos tablets)
-- -------------------------------------------------------------
create table devices (
  device_id      text primary key,
  apelido        text,
  versao_ativa   int,
  versao_baixada int,
  bytes_baixados bigint,
  online_em      timestamptz,
  bateria        int,
  memoria_mb     int,
  user_agent     text,
  ultimo_erro    text,
  erros_24h      int default 0
);

-- -------------------------------------------------------------
-- Histórico de publicações (snapshot completo do manifest)
-- -------------------------------------------------------------
create table publicacoes (
  versao        int primary key,
  publicado_por text,
  snapshot      jsonb not null,
  criado_em     timestamptz default now()
);

-- =============================================================
-- RLS
--
-- Princípios:
--   * Tablets NUNCA acessam tabelas direto — só a Edge Function
--     /manifest (service role, ignora RLS) e o Storage.
--   * Escrita em menu_items / app_config / publicacoes: só
--     usuário autenticado (o admin).
--   * devices: upsert com a anon key, restrito às colunas de
--     heartbeat (grants de coluna abaixo).
-- =============================================================
alter table app_config  enable row level security;
alter table menu_items  enable row level security;
alter table devices     enable row level security;
alter table publicacoes enable row level security;

-- ---- admin (usuário autenticado no Supabase Auth) ----
create policy "admin le config"        on app_config  for select to authenticated using (true);
create policy "admin edita config"     on app_config  for update to authenticated using (true) with check (true);

create policy "admin gerencia menu"    on menu_items  for all    to authenticated using (true) with check (true);

create policy "admin le publicacoes"   on publicacoes for select to authenticated using (true);
create policy "admin cria publicacao"  on publicacoes for insert to authenticated with check (true);

create policy "admin le devices"       on devices     for select to authenticated using (true);
create policy "admin edita devices"    on devices     for update to authenticated using (true) with check (true);
create policy "admin remove devices"   on devices     for delete to authenticated using (true);

-- ---- tablets (anon key): só heartbeat em devices ----
create policy "tablet insere heartbeat"   on devices for insert to anon with check (true);
create policy "tablet atualiza heartbeat" on devices for update to anon using (true) with check (true);

-- =============================================================
-- Grants de coluna — a anon key não enxerga nada além do heartbeat
-- =============================================================
revoke all on app_config  from anon;
revoke all on menu_items  from anon;
revoke all on publicacoes from anon;
revoke all on devices     from anon;

-- upsert do heartbeat (sem "apelido" — apelido é do admin)
grant select (device_id, versao_ativa, versao_baixada, bytes_baixados,
              online_em, bateria, memoria_mb, user_agent, ultimo_erro, erros_24h)
  on devices to anon;
grant insert (device_id, versao_ativa, versao_baixada, bytes_baixados,
              online_em, bateria, memoria_mb, user_agent, ultimo_erro, erros_24h)
  on devices to anon;
grant update (versao_ativa, versao_baixada, bytes_baixados,
              online_em, bateria, memoria_mb, user_agent, ultimo_erro, erros_24h)
  on devices to anon;
