-- ============================================================
-- Tablet Comercial — Fase 1
-- Migration 001 — Tabelas, trigger e funções de publicação
-- Rodar ANTES de 002_rls.sql e 003_storage.sql
-- ============================================================

-- ------------------------------------------------------------
-- Configuração global do app (linha única, id = 1)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Itens do menu (cards da home)
-- storage_path = caminho DENTRO do bucket "conteudo" (ex.: "9f2a….pdf")
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Dispositivos (heartbeat dos tablets)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Publicações (snapshots imutáveis; o manifest sempre serve daqui)
-- ------------------------------------------------------------
create table publicacoes (
  versao        int primary key,
  publicado_por text,
  snapshot      jsonb not null,
  criado_em     timestamptz default now()
);

-- ------------------------------------------------------------
-- Trigger: mantém menu_items.atualizado_em
-- ------------------------------------------------------------
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_menu_items_atualizado
before update on menu_items
for each row execute function set_atualizado_em();

-- ------------------------------------------------------------
-- publicar_versao(): congela o estado atual num snapshot.
-- É a ÚNICA porta de entrada de conteúdo para os tablets:
-- editar as tabelas não muda nada até chamar esta função.
--
-- Regras:
--  * bloqueia se houver item ativo de arquivo sem mídia validada;
--  * itens inativos (ou de arquivo sem midia_ok) ficam fora do snapshot;
--  * o snapshot guarda storage_path relativo — a Edge Function monta a URL.
-- ------------------------------------------------------------
create or replace function publicar_versao(p_publicado_por text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nova      int;
  v_pendentes int;
begin
  select count(*) into v_pendentes
  from menu_items
  where ativo
    and tipo in ('pdf','video','imagem')
    and (not coalesce(midia_ok, false) or storage_path is null);

  if v_pendentes > 0 then
    raise exception 'Publicação bloqueada: % item(ns) ativo(s) sem mídia validada. Desative o item ou envie/valide o arquivo.', v_pendentes;
  end if;

  select coalesce(max(versao), 0) + 1 into v_nova from publicacoes;

  insert into publicacoes (versao, publicado_por, snapshot)
  select
    v_nova,
    p_publicado_por,
    jsonb_build_object(
      'versao', v_nova,
      'publicado_em', now(),
      'config', (
        select jsonb_build_object(
          'nome_evento',            nome_evento,
          'logo_url',               logo_url,
          'fundo_url',              fundo_url,
          'idle_timeout_segundos',  idle_timeout_segundos,
          'idle_aviso_segundos',    idle_aviso_segundos,
          'poll_intervalo_minutos', poll_intervalo_minutos,
          'texto_banner_update',    texto_banner_update
        )
        from app_config where id = 1
      ),
      'itens', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',            id,
          'ordem',         ordem,
          'titulo',        titulo,
          'subtitulo',     subtitulo,
          'tipo',          tipo,
          'url_externa',   url_externa,
          'modo_abertura', modo_abertura,
          'storage_path',  storage_path,
          'hash',          arquivo_hash,
          'bytes',         arquivo_bytes,
          'mime',          arquivo_mime,
          'thumb_path',    thumb_path,
          'cor_card',      cor_card,
          'fallback_path', fallback_path
        ) order by ordem)
        from menu_items
        where ativo
          and (tipo = 'link' or coalesce(midia_ok, false))
      ), '[]'::jsonb)
    );

  update app_config
     set versao_publicada = v_nova,
         publicado_em     = now()
   where id = 1;

  return v_nova;
end;
$$;

-- ------------------------------------------------------------
-- reverter_versao(): republica o snapshot ANTERIOR como uma versão NOVA.
-- A numeração nunca anda para trás — o tablet só entende "versão maior",
-- então reverter = publicar de novo o conteúdo antigo com número novo.
-- ------------------------------------------------------------
create or replace function reverter_versao(p_publicado_por text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nova int;
  v_snap jsonb;
begin
  -- penúltima publicação (a anterior à que está no ar)
  select snapshot into v_snap
  from publicacoes
  order by versao desc
  offset 1 limit 1;

  if v_snap is null then
    raise exception 'Não há versão anterior para reverter.';
  end if;

  select max(versao) + 1 into v_nova from publicacoes;

  v_snap = jsonb_set(v_snap, '{versao}', to_jsonb(v_nova));
  v_snap = jsonb_set(v_snap, '{publicado_em}', to_jsonb(now()));

  insert into publicacoes (versao, publicado_por, snapshot)
  values (v_nova, p_publicado_por, v_snap);

  update app_config
     set versao_publicada = v_nova,
         publicado_em     = now()
   where id = 1;

  return v_nova;
end;
$$;

-- Só o admin logado (ou o backend) pode publicar/reverter
revoke execute on function publicar_versao(text)  from public, anon;
revoke execute on function reverter_versao(text)  from public, anon;
grant  execute on function publicar_versao(text)  to authenticated, service_role;
grant  execute on function reverter_versao(text)  to authenticated, service_role;
