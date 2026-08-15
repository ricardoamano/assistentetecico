# NESTOR — Assistente Interno Neostore Soluções para Eventos

## O que é
Assistente de WhatsApp para equipe técnica interna da Neostore.
Responde dúvidas técnicas, agenda de eventos e escalação de técnicos.

## Stack
- **Interface**: WhatsApp via Evolution API
- **Orquestrador**: N8N
- **LLM**: Claude (Anthropic) — `claude-sonnet-4-6`
- **Áudio**: OpenAI Whisper (`whisper-1`)
- **Banco**: Supabase (PostgreSQL + pgvector)
- **Agenda**: Google Calendar
- **Docs**: Gitbook

## Estrutura do projeto

```
assistentetecico/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Tabelas + pgvector + RLS
│       └── 002_seed_data.sql        # Usuário admin inicial
├── n8n/
│   └── flows/
│       ├── nestor-main.json         # Fluxo principal
│       ├── nestor-suporte.json      # Sub-fluxo: suporte técnico
│       ├── nestor-agenda.json       # Sub-fluxo: agenda
│       └── nestor-escalacao.json    # Sub-fluxo: escalação
├── agent/
│   └── nestor_system_prompt.txt     # System prompt do NESTOR
├── .env.example                     # Template de variáveis de ambiente
└── CLAUDE.md                        # Este arquivo
```

## Tabelas Supabase

| Tabela | Função |
|--------|--------|
| `authorized_users` | Controla acesso (phone + active + role) |
| `knowledge_base` | Manuais e docs indexados com pgvector |
| `conversation_history` | Histórico de mensagens por usuário |
| `audit_log` | Log de todas as interações |

## Ordem de construção

1. **Supabase** — Executar migrations em ordem (`001`, `002`)
2. **N8N** — Importar `nestor-main.json`, configurar credenciais
3. **Testar auth** — Número autorizado e não autorizado
4. **N8N** — Importar e conectar `nestor-agenda.json`
5. **N8N** — Importar e conectar `nestor-escalacao.json`
6. **N8N** — Importar e conectar `nestor-suporte.json`
7. **Testar** — Fluxo completo com texto e áudio

## Credenciais N8N necessárias

| Nome sugerido | Tipo | Serviço |
|---------------|------|---------|
| `Evolution API Key` | Header Auth | Evolution API |
| `Supabase Service Key` | Header Auth | Supabase |
| `OpenAI API Key` | Header Auth | OpenAI Whisper |
| `Anthropic API Key` | Header Auth | Claude |
| `Google Calendar OAuth` | OAuth2 | Google Calendar |
| `Gitbook API Key` | Header Auth | Gitbook |

## Variáveis de ambiente N8N

Configure no painel do N8N (Settings → Environment Variables):

```
EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
GCAL_NEOSTORE_ID, GCAL_ESCALACAO_ID
GITBOOK_API_URL, GITBOOK_API_KEY, GITBOOK_SPACE_ID
```

## Busca semântica (pgvector)

Para popular a `knowledge_base`, é necessário gerar embeddings antes de inserir.
Use `text-embedding-3-small` da OpenAI (1536 dimensões).

Exemplo de inserção via API Supabase:
```json
POST /rest/v1/knowledge_base
{
  "title": "Manual de instalação — Projetor X",
  "content": "...",
  "source": "pdf",
  "embedding": [0.1, 0.2, ...]
}
```

A função `match_knowledge_base` já está criada no banco.
Chamada via N8N: `POST /rest/v1/rpc/match_knowledge_base`

## Papéis de usuário

| Role | Acesso |
|------|--------|
| `admin` | Tudo |
| `tecnico` | Suporte técnico, agenda, escalação |

## Webhook Evolution API

Configure na Evolution API para enviar eventos para:
```
POST https://seu-n8n.com/webhook/nestor-webhook
```

Eventos necessários: `MESSAGES_UPSERT`

## Regra permanente de sessões longas (pedido do Amano, 2026-08-15)

Em qualquer tarefa longa ou com agentes em segundo plano:

1. **Armar sempre um check-in automático** (`send_later`, ~60 min) que verifica o
   andamento e se re-arma enquanto houver trabalho pendente.
2. **Se o limite de uso estourar no meio**, o check-in retoma o trabalho
   automaticamente quando a cota renovar — recomeçar de onde parou, sem esperar
   novo pedido.
3. **Sempre avisar o Amano por notificação push no celular** ao retomar depois de
   um estouro de limite e ao concluir o trabalho.

Vale para todos os projetos — replicar esta seção no CLAUDE.md de outros repos
na primeira oportunidade.
