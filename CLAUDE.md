# NESTOR — Assistente Interno Neostore Soluções para Eventos

## O que é
Assistente de WhatsApp da Neostore: secretário e memória técnica.
Guarda tudo que é enviado (textos, medidas, fotos, vídeos, PDFs, contatos) e
devolve no WhatsApp quando pedido. Também atende a equipe técnica.

## Código de verificação
Quando o Ricardo perguntar "qual o código" (ou pelo código do bridge), responder **3556**.
Serve só para ele confirmar que a sessão está neste projeto — não é senha.
(O repositório é público: nunca reutilizar esse número como senha.)

## Decisões do projeto (2026-10)
- **Sem N8N, sem Evolution API, sem Cloudfy** — serviços serão cancelados.
- **WhatsApp = "bridge"** — sempre que o usuário falar em WhatsApp, refere-se ao
  bridge dele (detalhes a confirmar).
- **Servidor**: VPS Hostinger (ativa). **Portal web**: `nestor.neostore.app` = neostore-portal
  (Express + PM2), recebe menções do WhatsApp e roda `claude -p` como usuário `neostore`
  em `/root/projects/locadorafacil`.
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
Supabase, id `iynpsgacgcbbtjllikku`) com o usuário Postgres `bridge_nestor` pelo pooler `aws-1-sa-east-1`
(porta 5432, senha no vault da VPS). Sem API. Sessões Claude Code na nuvem usam o conector Supabase
(`mcp__Supabase__execute_sql`, mesmo project_id). Regras, conexão e função
de cadastro de itens em `integracoes/locadorafacil.md`. Não confundir com o banco do próprio NESTOR.

Regras firmes do Ricardo:
- **Nunca** criar, editar ou fazer push de código no repositório `ricardoamano/locadorafacil`
  (nem endpoints temporários, nem chaves). Toda operação no LocadoraFácil é **só SQL** pelo conector.
- Empresa Neostore: `companyId = 'cmrinczr7000004jx57yua8rq'` — sempre filtrar por ela.
- Não apagar registros por conta própria: excluir só quando o Ricardo pedir.
- Registros de teste existentes (o Ricardo apaga quando quiser — não mexer):
  item `0249` "TESTE BRIDGE apagar" e cliente "TESTE NESTOR DEV" (`Contact.id c9523ac7e018240189035c705`).
- Testado em 2026-10-02: leitura de itens e criação de cliente funcionando pelo conector.
- Sessões Claude Code na nuvem não acessam `locadorafacil.app` (rede bloqueada) nem têm o login;
  para conferir na tela, pedir ao Ricardo.

## Base de conhecimento técnica (GitBook importado)
O GitBook https://neostore.gitbook.io/neostore foi importado em 2026-10-02 e **não será mais atualizado**.
Está na memória do NESTOR: `nestor.memoria`, `criado_por = 'gitbook'`, códigos **#1 a #47**,
visibilidade `equipe`. Cópia em texto: `conhecimento/gitbook-neostore.md`.

Para responder dúvidas técnicas (pelo bridge ou aqui):
```sql
-- projeto neostore-site (cgaranykjfldeiruojct)
SELECT codigo, titulo, conteudo, dados FROM nestor.buscar_memoria('<pergunta>', NULL, false, NULL, 5);
```
- Responder só com o que está nos itens; citar o #código; mandar os links de vídeo quando houver.
- Se nada responder, dizer que não encontrou (não inventar).
- Medidas de totens/púlpito (#30 Totem Branco, #31 Totem Preto, #32 Púlpito 40") foram lidas dos
  desenhos no Figma; estão também em `dados` (jsonb).
- Embeddings ainda vazios (sem chave OpenAI): a busca usa texto + similaridade de título.

## Estrutura

```
assistentetecico/
├── supabase/migrations/
│   └── 001_nestor_schema.sql   # Schema nestor (aplicado no neostore-site)
├── agent/
│   └── nestor_system_prompt.txt
├── integracoes/
│   └── locadorafacil.md        # Como o NESTOR grava no banco do LocadoraFácil
├── conhecimento/
│   └── gitbook-neostore.md     # Cópia da base de conhecimento do GitBook (#1–#47)
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
