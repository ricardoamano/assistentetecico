-- ============================================================
-- Tablet Comercial — Fase 1
-- Migration 003 — Bucket "conteudo" e políticas de Storage
--
-- Regras:
--  * leitura pública (os tablets baixam por URL, sem autenticação);
--  * upload/alteração/remoção só para o admin autenticado;
--  * arquivos gravados como {hash}.{ext} — URL nova = arquivo novo,
--    o cache do tablet nunca serve versão velha.
--
-- Se este arquivo der erro de permissão no SQL Editor
-- ("must be owner of table objects"), crie o bucket e as políticas
-- pelo painel: Storage → New bucket → "conteudo" → Public.
-- O passo a passo está no README.md.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('conteudo', 'conteudo', true)
on conflict (id) do update set public = true;

create policy "conteudo: leitura publica"
  on storage.objects for select
  using (bucket_id = 'conteudo');

create policy "conteudo: upload autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'conteudo');

create policy "conteudo: update autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'conteudo') with check (bucket_id = 'conteudo');

create policy "conteudo: delete autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'conteudo');
