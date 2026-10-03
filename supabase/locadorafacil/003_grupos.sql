-- ============================================================================
-- NESTOR — Modo de cada grupo do WhatsApp (configurável no portal)
-- Banco: projeto Supabase do LocadoraFácil (iynpsgacgcbbtjllikku), schema nestor
-- Pode rodar de novo (não apaga nada). Acesso só para bridge_nestor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nestor.grupos (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome             TEXT NOT NULL UNIQUE,          -- nome do grupo no WhatsApp
  grupo_jid        TEXT UNIQUE,                   -- id do grupo (o portal preenche)
  modo             TEXT NOT NULL DEFAULT 'consulta'
                   CHECK (modo IN ('consulta', 'registro', 'dev', 'desligado')),
                   -- consulta  = só responde perguntas; não grava nem altera nada
                   -- registro  = responde e também grava (nestor.memoria, cadastros)
                   -- dev       = pode alterar arquivos/código do portal na VPS
                   -- desligado = o bot ignora o grupo
  so_admin_grava   BOOLEAN NOT NULL DEFAULT true, -- em 'registro': só admins (Ricardo) podem mandar gravar
  observacao       TEXT,
  atualizado_por   TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- O bridge consulta antes de agir. Grupo não cadastrado = 'consulta' (o mais seguro).
CREATE OR REPLACE FUNCTION nestor.modo_grupo(p_nome TEXT DEFAULT NULL, p_jid TEXT DEFAULT NULL)
RETURNS TABLE (modo TEXT, so_admin_grava BOOLEAN)
LANGUAGE sql STABLE SET search_path = nestor, pg_temp AS $$
  SELECT coalesce(g.modo, 'consulta'), coalesce(g.so_admin_grava, true)
  FROM (SELECT 1) x
  LEFT JOIN nestor.grupos g
    ON (p_jid IS NOT NULL AND g.grupo_jid = p_jid)
    OR (p_jid IS NULL AND lower(g.nome) = lower(p_nome));
$$;

ALTER TABLE nestor.grupos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nestor.grupos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nestor.modo_grupo(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON nestor.grupos TO bridge_nestor;
GRANT EXECUTE ON FUNCTION nestor.modo_grupo(TEXT, TEXT) TO bridge_nestor;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='nestor' AND tablename='grupos' AND policyname='bridge_nestor_all') THEN
    CREATE POLICY bridge_nestor_all ON nestor.grupos FOR ALL TO bridge_nestor USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Configuração inicial (decisão do Ricardo, 2026-10-03)
INSERT INTO nestor.grupos (nome, modo, so_admin_grava, observacao, atualizado_por) VALUES
  ('Secretário',      'registro', true,  'Grupo particular do Ricardo: agenda do dia, links do Drive, pedidos de arquivos', 'ricardo'),
  ('Informações',     'registro', true,  'Ricardo posta informações e anexos para guardar',                              'ricardo'),
  ('APOIO NEOSTORE',  'consulta', true,  'Equipe tira dúvidas técnicas',                                                 'ricardo'),
  ('DEV',             'dev',      true,  'Alterações no portal/VPS',                                                     'ricardo')
ON CONFLICT (nome) DO NOTHING;
