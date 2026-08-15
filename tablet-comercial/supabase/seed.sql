-- ============================================================
-- Tablet Comercial — Fase 1
-- Seed inicial — rodar DEPOIS das migrations 001, 002 e 003
--
-- Cria a configuração, os 6 cards do menu e publica a versão 1
-- (só os itens ativos entram — os de arquivo nascem inativos até
-- o gestor subir o arquivo pelo admin).
-- ============================================================

-- ------------------------------------------------------------
-- Configuração global
--
-- fundo_url fica vazio por enquanto: depois de subir o arquivo
-- fundo-menu-alelo-1200.png no bucket "conteudo", rode o UPDATE
-- que está comentado no fim deste arquivo (trocando SEU-PROJETO
-- pela URL do seu projeto) e publique de novo.
-- O tablet também carrega o fundo embutido no próprio app, então
-- ele funciona mesmo com fundo_url vazio.
-- ------------------------------------------------------------
insert into app_config (id, nome_evento)
values (1, 'Alelo — Tablet Comercial')
on conflict (id) do update set nome_evento = excluded.nome_evento;

-- ------------------------------------------------------------
-- Itens do menu (seção 9 do briefing)
-- Itens de arquivo nascem inativos, aguardando upload pelo admin.
-- ------------------------------------------------------------
insert into menu_items
  (ordem, titulo, subtitulo, tipo, url_externa, cor_card, ativo, midia_aviso, origem_url)
values
  (1, 'Algoritmo RH', 'Ferramenta comercial', 'link',
      null, 'verde_escuro', false,
      'Item pendente: defina a URL para publicar.', null),

  (2, 'Portfólio de Soluções', 'Alelo Portfólio', 'pdf',
      null, 'verde', false,
      'Item pendente: envie o arquivo para publicar.',
      'https://drive.google.com/open?id=1CSNDJEUPm9yXqNcSjVqinlDp3MaVXxCD'),

  (3, 'Multisserviços', 'Alelo Multisserviços', 'pdf',
      null, 'lima', false,
      'Item pendente: envie o arquivo para publicar.',
      'https://drive.google.com/open?id=1S7B0jPcd8ihPZnERlkVgPfqegULQcCU8'),

  (4, 'Minha Empresa', 'Demonstração', 'link',
      'https://meu-alelo-dev-221b3.web.app/#/', 'verde_escuro', true,
      null, null),

  (5, 'Portal de Pedidos Alelo POD', 'Demonstração', 'link',
      'https://meu-alelo-dev-221b3.web.app/#/', 'verde', true,
      null, null),

  (6, 'Onboarding Digital', 'Digital First', 'video',
      null, 'lima', false,
      'Item pendente: envie o arquivo para publicar.',
      'https://drive.google.com/open?id=1JqU65G2OAa1FqpOjc47sO7wBTW2wgwYO');

-- ------------------------------------------------------------
-- Publica a versão 1 (congela o snapshot que o /manifest serve)
-- ------------------------------------------------------------
select publicar_versao('seed');

-- ------------------------------------------------------------
-- DEPOIS de subir fundo-menu-alelo-1200.png no bucket "conteudo",
-- descomente e rode (trocando SEU-PROJETO), e publique de novo:
--
-- update app_config
--    set fundo_url = 'https://SEU-PROJETO.supabase.co/storage/v1/object/public/conteudo/fundo-menu-alelo-1200.png'
--  where id = 1;
-- select publicar_versao('seed');
-- ------------------------------------------------------------
