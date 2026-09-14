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
├── design/                          # Design System NEOSTORE oficial (OBRIGATÓRIO em todo app)
│   └── neostore-design-system/      # README (regras), colors_and_type.css (tokens), assets/, ui_kits/, preview/
├── .claude/skills/neostore-design/  # Skill de projeto que carrega o design system em toda sessão
├── link/                            # Neostore Link (link.neostore.app) — deploy na Vercel
│   ├── app.js                       # App inteiro: pad com PIN + tempo + painel admin
│   ├── api/index.js                 # Adaptador Vercel (todas as rotas → app.js)
│   ├── lib/supabase.js              # Storage padrão: Supabase via função com segredo
│   ├── lib/upstash.js               # Storage alternativo: Upstash Redis
│   ├── lib/qrcode-src.js            # Biblioteca de QR (MIT) servida em /static/qr.js
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

## Design System NEOSTORE (regra para todo app deste repositório)

Todo app, painel, página ou peça visual criada aqui segue `design/neostore-design-system/README.md`
e usa os tokens de `design/neostore-design-system/colors_and_type.css`. Skill: `.claude/skills/neostore-design/`.
Resumo: Manrope (mono JetBrains Mono); teal `#1F6E78` é a cor de trabalho; roxo `#4A1F4F` é acento
(um elemento por tela, no máximo); texto ink `#0E1112`; fundo paper `#F4F5F6`; cartões brancos com borda
cloud e raio 10px, sem sombra; botões e inputs com raio 6px; status sucesso `#2E8F5E`, aviso `#C28A1E`,
erro `#B83A3A`. Sem emoji, sem ponto de exclamação, sem gradiente, sem bounce. Logos em `assets/`.

## Neostore Link (`link/`)

Ferramenta separada do NESTOR: pad de texto estilo dontpad em `link.neostore.app/<nome>`,
com PIN numérico, exposição por tempo limitado e painel de superadmin em endereço próprio.
Uso real: ficha de configuração de notebooks, tablets e celulares em eventos. O texto vira ações:
`parseItems()` em app.js reconhece links, IPs, e-mails, `wifi: REDE / senha` e `Nome: valor` e gera
botões Abrir, Copiar e QR (QR de Wi-Fi conecta o aparelho). Biblioteca de QR embutida, sem CDN.
Deploy automático na Vercel (Root Directory `link`), domínio via CNAME na Cloudflare.
Storage: tabela `neostore_link_kv` no projeto Supabase `neostore-site` (ref `cgaranykjfldeiruojct`),
acessada só pela função `neostore_link_kv_op` com segredo (`LINK_DB_SECRET`). Nunca usar service key.
Variáveis na Vercel: ADMIN_PASSWORD, ADMIN_PATH, BRAND_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, LINK_DB_SECRET. O mesmo `app.js` também roda em Cloudflare Workers + KV.
Sem dependências e sem build. `cd link && npm test` roda o fluxo completo localmente.
Instruções em `link/README.md`.
