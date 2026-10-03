-- ============================================================================
-- NESTOR — Agendamento de mensagens nos grupos do WhatsApp (bridge)
-- Banco: projeto Supabase do LocadoraFácil (iynpsgacgcbbtjllikku), schema nestor
-- Pode rodar de novo (não apaga nada). Acesso só para bridge_nestor.
-- ============================================================================

-- Agendamentos configurados no portal (nestor.neostore.app)
CREATE TABLE IF NOT EXISTS nestor.agendamentos (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome           TEXT NOT NULL,                       -- ex.: "Agenda do dia — Secretário"
  grupo          TEXT NOT NULL,                       -- nome do grupo no WhatsApp (ex.: "Secretário")
  grupo_jid      TEXT,                                -- id do grupo no WhatsApp (preenchido pelo portal)
  tipo           TEXT NOT NULL DEFAULT 'texto'
                 CHECK (tipo IN ('agenda_dia', 'texto', 'prompt')),
                 -- agenda_dia = eventos + tarefas (nestor.agenda_do_dia)
                 -- texto      = manda o conteudo como está
                 -- prompt     = o Claude gera a mensagem a partir do conteudo
  conteudo       TEXT,
  horario        TIME NOT NULL,                       -- hora local de envio
  dias_semana    SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=dom ... 6=sáb
  data_unica     DATE,                                -- se preenchido: envia só nesse dia
  fuso           TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ativo          BOOLEAN NOT NULL DEFAULT true,
  ultimo_envio   TIMESTAMPTZ,
  ultimo_status  TEXT,                                -- 'ok' | 'erro'
  ultimo_erro    TEXT,
  criado_por     TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de cada envio (auditoria)
CREATE TABLE IF NOT EXISTS nestor.envios (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agendamento_id  BIGINT REFERENCES nestor.agendamentos(id),
  grupo           TEXT NOT NULL,
  mensagem        TEXT,
  status          TEXT NOT NULL,                      -- 'ok' | 'erro'
  erro            TEXT,
  enviado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS envios_agendamento_idx ON nestor.envios (agendamento_id, enviado_em DESC);

-- Agendamentos que devem ser enviados agora (o portal chama a cada minuto)
CREATE OR REPLACE FUNCTION nestor.agendamentos_pendentes()
RETURNS SETOF nestor.agendamentos
LANGUAGE sql STABLE SET search_path = nestor, pg_temp AS $$
  SELECT a.*
  FROM nestor.agendamentos a
  WHERE a.ativo
    AND (now() AT TIME ZONE a.fuso)::time >= a.horario
    AND (a.data_unica IS NULL OR a.data_unica = (now() AT TIME ZONE a.fuso)::date)
    AND (a.data_unica IS NOT NULL
         OR extract(dow FROM now() AT TIME ZONE a.fuso)::smallint = ANY (a.dias_semana))
    AND (a.ultimo_envio IS NULL
         OR (a.ultimo_envio AT TIME ZONE a.fuso)::date < (now() AT TIME ZONE a.fuso)::date);
$$;

-- Agenda do dia: eventos (orçamentos aprovados) + tarefas abertas, empresa Neostore
CREATE OR REPLACE FUNCTION nestor.agenda_do_dia(p_data DATE DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date)
RETURNS TABLE (secao TEXT, ordem TIMESTAMP, titulo TEXT, detalhe TEXT)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  -- Eventos em andamento ou com montagem/início no dia
  SELECT 'evento',
         coalesce(o."dataMontagem", o."dataInicio"),
         '#' || o.numero || ' ' || coalesce(o."eventoNome", '(sem nome)'),
         concat_ws(' | ',
           coalesce(c."nomeFantasia", c."razaoSocial"),
           l.nome,
           CASE WHEN o."dataMontagem"::date = p_data THEN 'MONTAGEM hoje ' || to_char(o."dataMontagem", 'HH24:MI') END,
           CASE WHEN o."dataInicio"::date  = p_data THEN 'INÍCIO hoje '   || to_char(o."dataInicio", 'HH24:MI') END,
           CASE WHEN o."dataFim"::date     = p_data THEN 'TÉRMINO hoje '  || to_char(o."dataFim", 'HH24:MI') END,
           CASE WHEN o."dataInicio"::date < p_data AND o."dataFim"::date > p_data
                THEN 'em andamento até ' || to_char(o."dataFim", 'DD/MM') END)
  FROM "Orcamento" o
  LEFT JOIN "Contact" c ON c.id = o."clienteId"
  LEFT JOIN "Local"   l ON l.id = o."localId"
  WHERE o."companyId" = 'cmrinczr7000004jx57yua8rq'
    AND o.status = 'APROVADO'
    AND p_data BETWEEN coalesce(o."dataMontagem", o."dataInicio")::date
                   AND coalesce(o."dataFim", o."dataInicio")::date
  UNION ALL
  -- Tarefas abertas: atrasadas, do dia ou começando hoje
  SELECT 'tarefa',
         coalesce(t."dataEntrega", t."dataInicio"),
         t.nome,
         concat_ws(' | ',
           CASE WHEN t."dataEntrega"::date < p_data THEN 'ATRASADA (entrega ' || to_char(t."dataEntrega", 'DD/MM') || ')'
                WHEN t."dataEntrega"::date = p_data THEN 'entrega hoje'
                ELSE 'início hoje' END,
           replace(t.status, '_', ' '))
  FROM "Tarefa" t
  WHERE t."companyId" = 'cmrinczr7000004jx57yua8rq'
    AND t.status NOT IN ('CONCLUIDA', 'CANCELADA')
    AND (t."dataEntrega"::date <= p_data OR t."dataInicio"::date = p_data)
  ORDER BY 1, 2;
$$;

-- Permissões: só o bridge
ALTER TABLE nestor.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nestor.envios       ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON nestor.agendamentos, nestor.envios FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nestor.agendamentos_pendentes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nestor.agenda_do_dia(DATE)      FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON nestor.agendamentos, nestor.envios TO bridge_nestor;
GRANT EXECUTE ON FUNCTION nestor.agendamentos_pendentes(), nestor.agenda_do_dia(DATE) TO bridge_nestor;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='nestor' AND tablename='agendamentos' AND policyname='bridge_nestor_all') THEN
    CREATE POLICY bridge_nestor_all ON nestor.agendamentos FOR ALL TO bridge_nestor USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='nestor' AND tablename='envios' AND policyname='bridge_nestor_all') THEN
    CREATE POLICY bridge_nestor_all ON nestor.envios FOR ALL TO bridge_nestor USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Primeiro agendamento: agenda do dia no grupo Secretário, dias úteis às 07:30
INSERT INTO nestor.agendamentos (nome, grupo, tipo, horario, dias_semana, criado_por)
SELECT 'Agenda do dia — eventos e tarefas', 'Secretário', 'agenda_dia', '07:30', '{1,2,3,4,5,6}', 'ricardo'
WHERE NOT EXISTS (SELECT 1 FROM nestor.agendamentos WHERE tipo = 'agenda_dia' AND grupo = 'Secretário');
