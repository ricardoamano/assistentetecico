-- Aplicado em 2026-10-03 (revisão geral). Pode rodar de novo.
-- 1) Fecha a API pública do Supabase: anon/authenticated tinham acesso TOTAL (ler/alterar/apagar) às 66
--    tabelas do public, inclusive User, Account, Session e ContaBancaria. Ninguém usa esses papéis:
--    o app usa app_user e o bridge usa bridge_nestor / bridge_nestor_ro / bridge_nestor_apoio.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_cuid(), public.bridge_defaults() TO app_user, bridge_nestor;
GRANT EXECUTE ON FUNCTION public.bridge_cadastrar_item(text,text,integer,numeric,text,text,text) TO bridge_nestor;
GRANT EXECUTE ON FUNCTION public.bridge_criar_orcamento(text,text,text,date,date,jsonb,date,text,text,text,text) TO bridge_nestor;
ALTER FUNCTION public.gerar_cuid() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.bridge_defaults() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.bridge_cadastrar_item(text,text,integer,numeric,text,text,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.bridge_criar_orcamento(text,text,text,date,date,jsonb,date,text,text,text,text) SET search_path = public, extensions, pg_temp;

-- 2) Papéis só-leitura do bridge passam a enxergar a base do NESTOR (antes não tinham acesso nenhum,
--    por isso o grupo de apoio respondia de arquivos locais da VPS).
GRANT USAGE ON SCHEMA nestor TO bridge_nestor_ro, bridge_nestor_apoio;
GRANT USAGE ON SCHEMA extensions TO bridge_nestor_ro, bridge_nestor_apoio;  -- unaccent/similarity usados pela busca
GRANT SELECT ON nestor.memoria, nestor.grupos TO bridge_nestor_ro, bridge_nestor_apoio;
GRANT EXECUTE ON FUNCTION nestor.buscar_memoria(text, extensions.vector, boolean, text, integer) TO bridge_nestor_ro, bridge_nestor_apoio;
GRANT EXECUTE ON FUNCTION nestor.resumo_categorias(boolean) TO bridge_nestor_ro, bridge_nestor_apoio;
GRANT EXECUTE ON FUNCTION nestor.modo_grupo(text, text) TO bridge_nestor_ro, bridge_nestor_apoio;
GRANT EXECUTE ON FUNCTION nestor.agenda_do_dia(date) TO bridge_nestor_ro;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='nestor' AND tablename='memoria' AND policyname='leitura_ro') THEN
    CREATE POLICY leitura_ro ON nestor.memoria FOR SELECT TO bridge_nestor_ro USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='nestor' AND tablename='memoria' AND policyname='leitura_apoio') THEN
    CREATE POLICY leitura_apoio ON nestor.memoria FOR SELECT TO bridge_nestor_apoio USING (visibilidade = 'equipe');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='nestor' AND tablename='grupos' AND policyname='leitura_ro_apoio') THEN
    CREATE POLICY leitura_ro_apoio ON nestor.grupos FOR SELECT TO bridge_nestor_ro, bridge_nestor_apoio USING (true);
  END IF;
END $$;
-- Apoio técnico lê a ficha técnica dos itens, sem preços nem observação interna
GRANT SELECT (id, codigo, nome, modelo, apelidos, tipo, "categoriaId", "subCategoriaId", "marcaId", quantidade,
              especificacoes, "especificacoesPublicas", "descricaoComercial", fotos, "fotoCapaUrl", "videoUrl",
              watts, kva, natureza, "companyId", publicado, "emCatalogo", slug)
  ON public."Item" TO bridge_nestor_apoio;
