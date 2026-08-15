-- =============================================================
-- Tablet Comercial — Fase 1
-- 002: Bucket "conteudo" — leitura pública, upload autenticado
--
-- Arquivos são gravados como conteudo/{hash}.{ext}:
-- URL nova = arquivo novo, o cache do tablet nunca serve versão velha.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('conteudo', 'conteudo', true)
on conflict (id) do nothing;

create policy "conteudo leitura publica"
  on storage.objects for select
  using (bucket_id = 'conteudo');

create policy "conteudo upload autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'conteudo');

create policy "conteudo update autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'conteudo') with check (bucket_id = 'conteudo');

create policy "conteudo delete autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'conteudo');
