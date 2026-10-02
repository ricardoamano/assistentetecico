-- ============================================================
-- NESTOR — Assistente interno Neostore (BANCO DO ASSISTENTE)
-- Aplicado em 2026-10-02 no projeto neostore-site (ref cgaranykjfldeiruojct).
-- Pode ser rodado de novo: não apaga nada.
--
-- Instalado no projeto Supabase "neostore-site", isolado no schema "nestor".
--
-- ⚠️ PRIVADO — NUNCA EXPOR AO PÚBLICO DO SITE
--   - O schema "nestor" NÃO deve ser adicionado em
--     Project Settings → API → Exposed schemas.
--   - anon / authenticated (visitantes e admins do site) não têm
--     nenhum acesso: sem GRANT e sem policy.
--   - Só o usuário de banco "nestor_app" (usado pelo servidor do
--     NESTOR na VPS) e o postgres acessam.
--   - Arquivos ficam no bucket PRIVADO "nestor-arquivos", sem policies.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS nestor;
COMMENT ON SCHEMA nestor IS
    'BANCO DO ASSISTENTE NESTOR (uso interno Neostore). PRIVADO: não expor na API nem ao público do site.';

REVOKE ALL ON SCHEMA nestor FROM PUBLIC;
REVOKE ALL ON SCHEMA nestor FROM anon, authenticated;

-- Usuário de banco exclusivo do NESTOR (senha definida manualmente depois)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nestor_app') THEN
        CREATE ROLE nestor_app LOGIN;
    END IF;
END
$$;
COMMENT ON ROLE nestor_app IS 'Usuário do servidor NESTOR (VPS). Acesso só ao schema nestor.';

-- ============================================================
-- Usuários autorizados (quem pode falar com o NESTOR no WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS nestor.usuarios (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone   TEXT        NOT NULL UNIQUE,   -- 5511999999999
    nome       TEXT        NOT NULL,
    papel      TEXT        NOT NULL CHECK (papel IN ('admin', 'tecnico')),
    ativo      BOOLEAN     NOT NULL DEFAULT true,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE nestor.usuarios IS 'NESTOR (privado): números autorizados. admin = tudo | tecnico = só buscar/listar';

-- ============================================================
-- Memória (tudo que for guardado: textos, medidas, fotos, vídeos, PDFs...)
-- ============================================================
CREATE TABLE IF NOT EXISTS nestor.memoria (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          BIGINT      GENERATED ALWAYS AS IDENTITY UNIQUE,  -- #12 no WhatsApp
    titulo          TEXT        NOT NULL,
    categoria       TEXT        NOT NULL DEFAULT 'geral',
    tags            TEXT[]      NOT NULL DEFAULT '{}',
    descricao       TEXT,
    conteudo        TEXT,
    dados           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    tipo            TEXT        NOT NULL DEFAULT 'texto'
                    CHECK (tipo IN ('texto', 'imagem', 'video', 'audio', 'documento')),
    arquivo_path    TEXT,
    arquivo_nome    TEXT,
    arquivo_mime    TEXT,
    arquivo_tamanho BIGINT,
    visibilidade    TEXT        NOT NULL DEFAULT 'equipe'
                    CHECK (visibilidade IN ('equipe', 'admin')),
    criado_por      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    embedding       extensions.vector(1536),     -- OpenAI text-embedding-3-small
    busca           TSVECTOR
);
COMMENT ON TABLE nestor.memoria IS 'NESTOR (privado): memória do secretário. Arquivos no bucket privado nestor-arquivos.';
COMMENT ON COLUMN nestor.memoria.visibilidade IS 'equipe = técnicos podem buscar | admin = só admin';

CREATE INDEX IF NOT EXISTS idx_memoria_categoria  ON nestor.memoria (categoria);
CREATE INDEX IF NOT EXISTS idx_memoria_criado_por ON nestor.memoria (criado_por, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_memoria_busca      ON nestor.memoria USING gin (busca);
CREATE INDEX IF NOT EXISTS idx_memoria_embedding  ON nestor.memoria
    USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ============================================================
-- Histórico de conversa e auditoria
-- ============================================================
CREATE TABLE IF NOT EXISTS nestor.historico (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone  TEXT        NOT NULL,
    papel     TEXT        NOT NULL CHECK (papel IN ('user', 'assistant')),
    conteudo  TEXT        NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historico_telefone ON nestor.historico (telefone, criado_em DESC);
COMMENT ON TABLE nestor.historico IS 'NESTOR (privado): histórico de mensagens (contexto para o Claude)';

CREATE TABLE IF NOT EXISTS nestor.auditoria (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone  TEXT        NOT NULL,
    acao      TEXT        NOT NULL,
    entrada   TEXT        NOT NULL,
    saida     TEXT        NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON nestor.auditoria (criado_em DESC);
COMMENT ON TABLE nestor.auditoria IS 'NESTOR (privado): log de todas as interações';

-- ============================================================
-- Índice de texto (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION nestor.memoria_atualizar_busca()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = nestor, extensions, pg_temp
AS $$
BEGIN
    NEW.busca :=
        setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.titulo, ''))), 'A') ||
        setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.categoria, '') || ' ' || array_to_string(NEW.tags, ' '))), 'A') ||
        setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.descricao, ''))), 'B') ||
        setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.conteudo, '') || ' ' || coalesce(NEW.dados::text, ''))), 'C');
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_memoria_busca
    BEFORE INSERT OR UPDATE ON nestor.memoria
    FOR EACH ROW EXECUTE FUNCTION nestor.memoria_atualizar_busca();

-- ============================================================
-- Busca híbrida: semântica (pgvector) + palavras (full-text) + título parecido (trigram)
-- combinadas por Reciprocal Rank Fusion
-- ============================================================
CREATE OR REPLACE FUNCTION nestor.buscar_memoria(
    p_consulta      TEXT,
    p_embedding     extensions.vector(1536) DEFAULT NULL,
    p_incluir_admin BOOLEAN DEFAULT false,
    p_categoria     TEXT    DEFAULT NULL,
    p_limite        INT     DEFAULT 8
)
RETURNS TABLE (
    codigo BIGINT, titulo TEXT, categoria TEXT, tags TEXT[], descricao TEXT, conteudo TEXT,
    dados JSONB, tipo TEXT, arquivo_path TEXT, arquivo_nome TEXT, arquivo_mime TEXT,
    visibilidade TEXT, criado_em TIMESTAMPTZ, score FLOAT
)
LANGUAGE sql STABLE
SET search_path = nestor, extensions, pg_temp
AS $$
    WITH base AS (
        SELECT m.*
        FROM nestor.memoria m
        WHERE (p_incluir_admin OR m.visibilidade = 'equipe')
          AND (p_categoria IS NULL OR m.categoria = p_categoria)
    ),
    q AS (
        SELECT to_tsquery('simple', coalesce(string_agg(quote_literal(l), ' | '), '')) AS tsq
        FROM unnest(tsvector_to_array(to_tsvector('portuguese', unaccent(coalesce(p_consulta, ''))))) AS l
    ),
    vec AS (
        SELECT b.id, row_number() OVER (ORDER BY b.embedding <=> p_embedding) AS r
        FROM base b
        WHERE p_embedding IS NOT NULL AND b.embedding IS NOT NULL
        ORDER BY r LIMIT 30
    ),
    txt AS (
        SELECT b.id, row_number() OVER (ORDER BY ts_rank_cd(b.busca, q.tsq) DESC) AS r
        FROM base b, q
        WHERE b.busca @@ q.tsq
        ORDER BY r LIMIT 30
    ),
    tri AS (
        SELECT x.id, row_number() OVER (ORDER BY x.sim DESC) AS r
        FROM (
            SELECT b.id,
                   word_similarity(lower(unaccent(coalesce(p_consulta, ''))),
                                   lower(unaccent(b.titulo || ' ' || array_to_string(b.tags, ' ')))) AS sim
            FROM base b
        ) x
        WHERE x.sim > 0.3
        ORDER BY r LIMIT 30
    ),
    fused AS (
        SELECT u.id, sum(1.0 / (60 + u.r)) AS score
        FROM (SELECT id, r FROM vec UNION ALL SELECT id, r FROM txt UNION ALL SELECT id, r FROM tri) u
        GROUP BY u.id
    )
    SELECT m.codigo, m.titulo, m.categoria, m.tags, m.descricao, m.conteudo, m.dados,
           m.tipo, m.arquivo_path, m.arquivo_nome, m.arquivo_mime, m.visibilidade,
           m.criado_em, f.score::float
    FROM fused f
    JOIN nestor.memoria m ON m.id = f.id
    ORDER BY f.score DESC
    LIMIT p_limite;
$$;

CREATE OR REPLACE FUNCTION nestor.resumo_categorias(p_incluir_admin BOOLEAN DEFAULT false)
RETURNS TABLE (categoria TEXT, total BIGINT)
LANGUAGE sql STABLE
SET search_path = nestor, pg_temp
AS $$
    SELECT m.categoria, count(*) AS total
    FROM nestor.memoria m
    WHERE p_incluir_admin OR m.visibilidade = 'equipe'
    GROUP BY m.categoria
    ORDER BY m.categoria;
$$;

-- ============================================================
-- Permissões: só nestor_app. RLS ligado como segunda trava.
-- ============================================================
REVOKE ALL ON ALL TABLES    IN SCHEMA nestor FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA nestor FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nestor FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA nestor REVOKE ALL ON TABLES    FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA nestor REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA nestor REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA nestor     TO nestor_app;
GRANT USAGE ON SCHEMA extensions TO nestor_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA nestor TO nestor_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA nestor TO nestor_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA nestor TO nestor_app;

ALTER TABLE nestor.usuarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE nestor.memoria   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nestor.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE nestor.auditoria ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['usuarios', 'memoria', 'historico', 'auditoria'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'nestor' AND tablename = t AND policyname = 'nestor_app_all') THEN
            EXECUTE format('CREATE POLICY nestor_app_all ON nestor.%I FOR ALL TO nestor_app USING (true) WITH CHECK (true)', t);
        END IF;
    END LOOP;
END
$$;

-- ============================================================
-- Storage: bucket PRIVADO, sem policies (só a chave de serviço acessa)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('nestor-arquivos', 'nestor-arquivos', false, 52428800)
ON CONFLICT (id) DO NOTHING;
