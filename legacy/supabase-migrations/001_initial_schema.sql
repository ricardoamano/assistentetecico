-- ============================================================
-- NESTOR — Neostore Soluções para Eventos
-- Migration 001: Schema inicial
-- ============================================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- Tabela: authorized_users
-- Controla quem pode usar o NESTOR via WhatsApp
-- ============================================================
CREATE TABLE IF NOT EXISTS authorized_users (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone      TEXT        NOT NULL UNIQUE,   -- formato: 5511999999999
    name       TEXT        NOT NULL,
    role       TEXT        NOT NULL CHECK (role IN ('admin', 'tecnico')),
    active     BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authorized_users_phone  ON authorized_users (phone);
CREATE INDEX idx_authorized_users_active ON authorized_users (active);

COMMENT ON TABLE  authorized_users           IS 'Usuários autorizados a usar o NESTOR via WhatsApp';
COMMENT ON COLUMN authorized_users.phone     IS 'Número no formato 5511999999999';
COMMENT ON COLUMN authorized_users.role      IS 'admin = acesso total | tecnico = suporte, agenda e escalação';
COMMENT ON COLUMN authorized_users.active    IS 'false = bloqueado sem deletar o registro';

-- ============================================================
-- Tabela: knowledge_base
-- Base de conhecimento indexada com pgvector para busca semântica
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title      TEXT        NOT NULL,
    content    TEXT        NOT NULL,
    source     TEXT        NOT NULL CHECK (source IN ('pdf', 'gitbook', 'manual', 'tacito')),
    embedding  VECTOR(1536),                  -- OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_source ON knowledge_base (source);
-- Índice HNSW para busca semântica eficiente (pgvector)
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE  knowledge_base           IS 'Manuais, procedimentos e documentação técnica indexados';
COMMENT ON COLUMN knowledge_base.source    IS 'pdf | gitbook | manual | tacito (conhecimento tácito da equipe)';
COMMENT ON COLUMN knowledge_base.embedding IS 'Embedding 1536d gerado com text-embedding-3-small da OpenAI';

-- ============================================================
-- Tabela: conversation_history
-- Histórico de conversas por usuário (janela de contexto para o Claude)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_history (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone      TEXT        NOT NULL,
    role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_history_phone      ON conversation_history (phone);
CREATE INDEX idx_conversation_history_created_at ON conversation_history (created_at DESC);

COMMENT ON TABLE  conversation_history        IS 'Histórico de mensagens por usuário, usado como contexto para o Claude';
COMMENT ON COLUMN conversation_history.phone  IS 'Número do usuário no formato 5511999999999';
COMMENT ON COLUMN conversation_history.role   IS 'user = mensagem do técnico | assistant = resposta do NESTOR';

-- ============================================================
-- Tabela: audit_log
-- Registro de auditoria de todas as interações
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone      TEXT        NOT NULL,
    intent     TEXT        NOT NULL,           -- SUPORTE_TECNICO | AGENDA | ESCALACAO | FALLBACK
    input      TEXT        NOT NULL,
    output     TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_phone      ON audit_log (phone);
CREATE INDEX idx_audit_log_intent     ON audit_log (intent);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);

COMMENT ON TABLE  audit_log        IS 'Log de auditoria de todas as interações com o NESTOR';
COMMENT ON COLUMN audit_log.intent IS 'Agente acionado: SUPORTE_TECNICO | AGENDA | ESCALACAO | FALLBACK';

-- ============================================================
-- Função: match_knowledge_base
-- Busca semântica via pgvector — usada pelo sub-fluxo de suporte
-- ============================================================
CREATE OR REPLACE FUNCTION match_knowledge_base(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count     INT   DEFAULT 5
)
RETURNS TABLE (
    id         UUID,
    title      TEXT,
    content    TEXT,
    source     TEXT,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        kb.id,
        kb.title,
        kb.content,
        kb.source,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
$$;

COMMENT ON FUNCTION match_knowledge_base IS
    'Busca semântica na base de conhecimento. Retorna documentos com similaridade > match_threshold.';

-- ============================================================
-- RLS (Row Level Security) — segurança por linha
-- ============================================================
ALTER TABLE authorized_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (N8N usa a service key)
CREATE POLICY "service_role_all" ON authorized_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON knowledge_base
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON conversation_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON audit_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);
