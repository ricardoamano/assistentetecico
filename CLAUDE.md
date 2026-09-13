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
│       ├── 002_seed_data.sql        # Usuário admin inicial
│       └── 003_neostore_link.sql    # Storage do Neostore Link (aplicada em neostore-site)
├── n8n/
│   └── flows/
│       ├── nestor-main.json         # Fluxo principal
│       ├── nestor-suporte.json      # Sub-fluxo: suporte técnico
│       ├── nestor-agenda.json       # Sub-fluxo: agenda
│       └── nestor-escalacao.json    # Sub-fluxo: escalação
├── agent/
│   └── nestor_system_prompt.txt     # System prompt do NESTOR
├── design/                          # Design System Neostore (OBRIGATÓRIO em todo app)
│   ├── neostore-design-system.md    # Tokens, tipografia, componentes, regras de logo
│   ├── neostore.css                 # Variáveis CSS + componentes base para colar em HTML
│   └── assets/                      # symbol.png, logo-dark.png, logo-light.png
├── link/                            # Neostore Link (link.neostore.app) — deploy na Vercel
│   ├── app.js                       # App inteiro: pad com PIN + tempo + painel admin
│   ├── api/index.js                 # Adaptador Vercel (todas as rotas → app.js)
│   ├── lib/supabase.js              # Storage padrão: Supabase via função com segredo
│   ├── lib/upstash.js               # Storage alternativo: Upstash Redis
│   ├── vercel.json                  # Rewrite de todas as URLs para a função
│   ├── test/run.mjs                 # Testes locais (npm test)
│   ├── wrangler.toml                # Alternativa: Cloudflare Workers
│   └── README.md                    # Instalação passo a passo
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

## Design System Neostore (regra para todo app deste repositório)

Todo app, painel ou página criada aqui usa o Design System Neostore: `design/neostore-design-system.md`
(tokens) e `design/neostore.css` (base pronta). Resumo: fonte Manrope (mono JetBrains Mono), primária teal
`#1F6E78`, secundária roxo `#4A1F4F`, texto ink `#0E1112`, fundo paper `#F4F5F6`, cartões brancos com raio 14px,
botões teal com raio 10px. Tema claro por padrão. Logo em `design/assets/`. Não usar laranja/amarelo/azul
como destaque. Origem dos tokens: repositório `neostore-website` (tailwind.config.ts / globals.css).

## Neostore Link (`link/`)

Ferramenta separada do NESTOR: pad de texto estilo dontpad em `link.neostore.app/<nome>`,
com PIN numérico, exposição por tempo limitado e painel de superadmin em endereço próprio.
Deploy automático na Vercel (Root Directory `link`), domínio via CNAME na Cloudflare.
Storage: tabela `neostore_link_kv` no projeto Supabase `neostore-site` (ref `cgaranykjfldeiruojct`),
acessada só pela função `neostore_link_kv_op` com segredo (`LINK_DB_SECRET`). Nunca usar service key.
Variáveis na Vercel: ADMIN_PASSWORD, ADMIN_PATH, BRAND_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, LINK_DB_SECRET. O mesmo `app.js` também roda em Cloudflare Workers + KV.
Sem dependências e sem build. `cd link && npm test` roda o fluxo completo localmente.
Instruções em `link/README.md`.
