# NESTOR — Assistente Interno Neostore Soluções para Eventos

## O que é
Assistente de WhatsApp da Neostore: secretário e memória técnica.
Guarda tudo que é enviado (textos, medidas, fotos, vídeos, PDFs, contatos) e
devolve no WhatsApp quando pedido. Também atende a equipe técnica.

## Decisões do projeto (2026-10)
- **Sem N8N, sem Evolution API, sem Cloudfy** — serviços serão cancelados.
- **WhatsApp = "bridge"** — sempre que o usuário falar em WhatsApp, refere-se ao
  bridge dele (detalhes a confirmar).
- **Servidor**: VPS própria (a contratar).
- **Portal web**: `nestor.neostore.app` (a construir).
- **Banco**: projeto Supabase `neostore-site` (ref `cgaranykjfldeiruojct`),
  isolado no schema `nestor`.

## ⚠️ Privacidade do banco (regra fixa)
O schema `nestor` é o BANCO DO ASSISTENTE e **nunca** pode ser exposto ao público
do site:
- Não adicionar `nestor` em Project Settings → API → Exposed schemas.
- Sem GRANT/policy para `anon` ou `authenticated`.
- Acesso só pelo usuário de banco `nestor_app` (conexão direta Postgres, no servidor).
- Arquivos no bucket **privado** `nestor-arquivos`, sem policies.

## Integração com o LocadoraFácil (sistema de locação da Neostore)
O NESTOR cria/edita/exclui qualquer coisa no LocadoraFácil **direto no banco dele** (outro projeto
Supabase, id `iynpsgacgcbbtjllikku`) usando o conector Supabase já ligado na conta:
`mcp__Supabase__execute_sql` com `project_id: iynpsgacgcbbtjllikku`. Sem API, sem senha, sem VPS. Regras, conexão e função
de cadastro de itens em `integracoes/locadorafacil.md`. Não confundir com o banco do próprio NESTOR.

## Estrutura

```
assistentetecico/
├── supabase/migrations/
│   └── 001_nestor_schema.sql   # Schema nestor (aplicado no neostore-site)
├── agent/
│   └── nestor_system_prompt.txt
├── integracoes/
│   └── locadorafacil.md        # Como o NESTOR grava no banco do LocadoraFácil
├── legacy/                     # Versão N8N/Evolution (referência, não usar)
└── CLAUDE.md
```

## Tabelas (schema `nestor`)

| Tabela | Função |
|--------|--------|
| `usuarios` | Números autorizados (telefone, nome, papel admin/tecnico, ativo) |
| `memoria` | Itens guardados + dados estruturados + embedding + caminho do arquivo |
| `historico` | Histórico de mensagens (contexto para o Claude) |
| `auditoria` | Log de todas as interações |

Funções: `nestor.buscar_memoria` (busca híbrida pgvector + texto + trigram) e
`nestor.resumo_categorias`. Embeddings: OpenAI `text-embedding-3-small` (1536).

## Stack
- **LLM**: Claude (Anthropic) — `claude-sonnet-4-6`
- **Áudio**: OpenAI Whisper (`whisper-1`)
- **Banco/arquivos**: Supabase (Postgres + pgvector + Storage)

## Papéis

| Papel | Acesso |
|-------|--------|
| `admin` | Tudo (guardar, editar, apagar, ver itens privados) |
| `tecnico` | Buscar e listar itens da equipe |
