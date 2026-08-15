-- =============================================================
-- Tablet Comercial — Fase 1
-- Seed inicial: config, 6 itens do menu e publicação v1
-- =============================================================

-- -------------------------------------------------------------
-- Configuração global
-- (fundo_url fica vazio até o upload de fundo-menu-alelo-1200.png
--  para o bucket "conteudo" — ver README, passo "Fundo da home")
-- -------------------------------------------------------------
insert into app_config (id, nome_evento)
values (1, 'Alelo — Tablet Comercial')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Itens do menu
-- Itens de arquivo nascem inativos, aguardando upload pelo admin.
-- origem_url é só referência interna — o tablet nunca usa.
-- -------------------------------------------------------------
insert into menu_items
  (ordem, titulo, subtitulo, tipo, url_externa, cor_card, ativo, midia_ok, midia_aviso, origem_url)
values
  (1, 'Algoritmo RH', 'Ferramenta comercial', 'link', null, 'verde_escuro', false, false,
   'Item pendente: defina a URL para publicar.', null),

  (2, 'Portfólio de Soluções', 'Alelo Portfólio', 'pdf', null, 'verde', false, false,
   'Item pendente: envie o arquivo para publicar.',
   'https://drive.google.com/open?id=1CSNDJEUPm9yXqNcSjVqinlDp3MaVXxCD'),

  (3, 'Multisserviços', 'Alelo Multisserviços', 'pdf', null, 'lima', false, false,
   'Item pendente: envie o arquivo para publicar.',
   'https://drive.google.com/open?id=1S7B0jPcd8ihPZnERlkVgPfqegULQcCU8'),

  (4, 'Minha Empresa', 'Demonstração', 'link',
   'https://meu-alelo-dev-221b3.web.app/#/', 'verde_escuro', true, true, null, null),

  (5, 'Portal de Pedidos Alelo POD', 'Demonstração', 'link',
   'https://meu-alelo-dev-221b3.web.app/#/', 'verde', true, true, null, null),

  (6, 'Onboarding Digital', 'Digital First', 'video', null, 'lima', false, false,
   'Item pendente: envie o arquivo para publicar.',
   'https://drive.google.com/open?id=1JqU65G2OAa1FqpOjc47sO7wBTW2wgwYO');

-- -------------------------------------------------------------
-- Publicação v1: snapshot do que está ativo E validado agora
-- (só os dois links de demonstração — o resto entra quando o
--  gestor subir os arquivos e clicar em Publicar, na Fase 3)
-- -------------------------------------------------------------
insert into publicacoes (versao, publicado_por, snapshot)
select
  1,
  'seed',
  jsonb_build_object(
    'versao', 1,
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
    'itens', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',              id,
            'ordem',           ordem,
            'titulo',          titulo,
            'subtitulo',       subtitulo,
            'tipo',            tipo,
            'url',             url_externa,
            'hash',            arquivo_hash,
            'bytes',           arquivo_bytes,
            'mime',            arquivo_mime,
            'thumb',           null,
            'cor_card',        cor_card,
            'modo_abertura',   modo_abertura,
            'fallback',        null,
            'requer_internet', (tipo = 'link')
          )
          order by ordem
        )
        from menu_items
        where ativo and midia_ok
      ),
      '[]'::jsonb
    )
  );
