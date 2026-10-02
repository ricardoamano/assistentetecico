-- ============================================================
-- NESTOR — Neostore Soluções para Eventos
-- Migration 003: Secretário (memória geral + arquivos)
--
-- Guarda tudo o que for enviado pelo WhatsApp: textos, medidas,
-- resoluções, modelos, contatos, fotos, vídeos, PDFs etc.
-- Arquivos ficam no Supabase Storage (bucket privado "nestor-arquivos");
-- a tabela guarda o índice, os dados estruturados e o embedding.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Tabela: nestor_memoria
-- ============================================================
CREATE TABLE IF NOT EXISTS nestor_memoria (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          BIGINT      GENERATED ALWAYS AS IDENTITY UNIQUE,  -- número curto usado no WhatsApp (#12)
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
    embedding       VECTOR(1536),
    busca           TSVECTOR
);

CREATE INDEX IF NOT EXISTS idx_nestor_memoria_categoria  ON nestor_memoria (categoria);
CREATE INDEX IF NOT EXISTS idx_nestor_memoria_criado_por ON nestor_memoria (criado_por, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_nestor_memoria_busca      ON nestor_memoria USING gin (busca);
CREATE INDEX IF NOT EXISTS idx_nestor_memoria_embedding  ON nestor_memoria
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE  nestor_memoria              IS 'Memória do NESTOR Secretário: tudo que foi enviado pelo WhatsApp para guardar';
COMMENT ON COLUMN nestor_memoria.codigo       IS 'Número curto para citar no WhatsApp (#12)';
COMMENT ON COLUMN nestor_memoria.dados        IS 'Dados estruturados extraídos (medidas, resolução, modelo...)';
COMMENT ON COLUMN nestor_memoria.arquivo_path IS 'Caminho no bucket nestor-arquivos (NULL = só texto)';
COMMENT ON COLUMN nestor_memoria.visibilidade IS 'equipe = técnicos podem buscar | admin = só admin';
COMMENT ON COLUMN nestor_memoria.busca        IS 'Índice de texto (mantido por trigger)';

-- Mantém o índice de texto e o atualizado_em
CREATE OR REPLACE FUNCTION nestor_memoria_atualizar_busca()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_nestor_memoria_busca ON nestor_memoria;
CREATE TRIGGER trg_nestor_memoria_busca
    BEFORE INSERT OR UPDATE ON nestor_memoria
    FOR EACH ROW EXECUTE FUNCTION nestor_memoria_atualizar_busca();

-- ============================================================
-- Função: buscar_memoria
-- Busca híbrida: semântica (pgvector) + palavras (full-text) + parecido no título (trigram).
-- Os três rankings são combinados por Reciprocal Rank Fusion.
-- ============================================================
CREATE OR REPLACE FUNCTION buscar_memoria(
    p_consulta      TEXT,
    p_embedding     VECTOR(1536) DEFAULT NULL,
    p_incluir_admin BOOLEAN      DEFAULT false,
    p_categoria     TEXT         DEFAULT NULL,
    p_limite        INT          DEFAULT 8
)
RETURNS TABLE (
    codigo          BIGINT,
    titulo          TEXT,
    categoria       TEXT,
    tags            TEXT[],
    descricao       TEXT,
    conteudo        TEXT,
    dados           JSONB,
    tipo            TEXT,
    arquivo_path    TEXT,
    arquivo_nome    TEXT,
    arquivo_mime    TEXT,
    visibilidade    TEXT,
    criado_em       TIMESTAMPTZ,
    score           FLOAT
)
LANGUAGE sql STABLE
AS $$
    WITH base AS (
        SELECT m.*
        FROM nestor_memoria m
        WHERE (p_incluir_admin OR m.visibilidade = 'equipe')
          AND (p_categoria IS NULL OR m.categoria = p_categoria)
    ),
    q AS (
        -- palavras da consulta unidas com OU (qualquer termo conta)
        SELECT to_tsquery('simple', coalesce(string_agg(quote_literal(l), ' | '), '')) AS tsq
        FROM unnest(tsvector_to_array(to_tsvector('portuguese', unaccent(coalesce(p_consulta, ''))))) AS l
    ),
    vec AS (
        SELECT b.id, row_number() OVER (ORDER BY b.embedding <=> p_embedding) AS r
        FROM base b
        WHERE p_embedding IS NOT NULL AND b.embedding IS NOT NULL
        ORDER BY r
        LIMIT 30
    ),
    txt AS (
        SELECT b.id, row_number() OVER (ORDER BY ts_rank_cd(b.busca, q.tsq) DESC) AS r
        FROM base b, q
        WHERE b.busca @@ q.tsq
        ORDER BY r
        LIMIT 30
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
        ORDER BY r
        LIMIT 30
    ),
    fused AS (
        SELECT u.id, sum(1.0 / (60 + u.r)) AS score
        FROM (
            SELECT id, r FROM vec
            UNION ALL SELECT id, r FROM txt
            UNION ALL SELECT id, r FROM tri
        ) u
        GROUP BY u.id
    )
    SELECT m.codigo, m.titulo, m.categoria, m.tags, m.descricao, m.conteudo, m.dados,
           m.tipo, m.arquivo_path, m.arquivo_nome, m.arquivo_mime, m.visibilidade,
           m.criado_em, f.score::float
    FROM fused f
    JOIN nestor_memoria m ON m.id = f.id
    ORDER BY f.score DESC
    LIMIT p_limite;
$$;

COMMENT ON FUNCTION buscar_memoria IS
    'Busca híbrida na memória do Secretário (semântica + texto + título). Usada pelo fluxo nestor-secretario.';

-- ============================================================
-- Função: resumo_categorias — quantos itens há em cada categoria
-- ============================================================
CREATE OR REPLACE FUNCTION resumo_categorias(p_incluir_admin BOOLEAN DEFAULT false)
RETURNS TABLE (categoria TEXT, total BIGINT)
LANGUAGE sql STABLE
AS $$
    SELECT m.categoria, count(*) AS total
    FROM nestor_memoria m
    WHERE p_incluir_admin OR m.visibilidade = 'equipe'
    GROUP BY m.categoria
    ORDER BY m.categoria;
$$;

-- ============================================================
-- RLS — só a service key (N8N) acessa
-- ============================================================
ALTER TABLE nestor_memoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON nestor_memoria;
CREATE POLICY "service_role_all" ON nestor_memoria
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Storage: bucket privado para os arquivos (limite 50 MB por arquivo,
-- que é o máximo do plano gratuito do Supabase)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('nestor-arquivos', 'nestor-arquivos', false, 52428800)
ON CONFLICT (id) DO NOTHING;
