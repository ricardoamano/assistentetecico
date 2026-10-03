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
  em `/root/projects/locadorafacil`. **Só responde a menções (@Nestor) em grupos** — não
  responde em conversa individual. Instruções ao bridge: mandar no grupo com @menção.
- **Banco (desde 2026-10-02)**: schema `nestor` **dentro do projeto Supabase do LocadoraFácil**
  (`iynpsgacgcbbtjllikku`), porque o bridge na VPS já acessa esse banco com `bridge_nestor`.
  Tudo em um lugar só (decisão do Ricardo). O schema `nestor` antigo no `neostore-site`
  (`cgaranykjfldeiruojct`) ficou **parado/obsoleto** — não gravar mais lá.

## Agendamento de mensagens nos grupos (2026-10-03)
Banco pronto: `nestor.agendamentos`, `nestor.envios`, `nestor.agendamentos_pendentes()` e
`nestor.agenda_do_dia(data)` (eventos aprovados + tarefas abertas). Agendamento id 1 = agenda do dia
no grupo **Secretário**, 07:30, seg–sáb. O envio e a tela ficam no portal (VPS, feito pelo grupo DEV).
Especificação: `integracoes/agendamentos-portal.md`. Script: `supabase/locadorafacil/002_agendamentos.sql`.

## ⚠️ Privacidade do banco (regra fixa)
O schema `nestor` é o BANCO DO ASSISTENTE e fica separado do sistema:
- Fora do schema `public`: o Prisma/app do LocadoraFácil não gerencia nem enxerga.
- Não adicionar `nestor` em Project Settings → API → Exposed schemas.
- Sem GRANT/policy para `anon` ou `authenticated`.
- Acesso só por `bridge_nestor` (bridge na VPS) e pelo conector Supabase (sessões na nuvem).
- Arquivos no bucket **privado** `nestor-arquivos` (Storage do LocadoraFácil), sem policies.
- Script: `supabase/locadorafacil/001_schema_nestor.sql` (pode rodar de novo, não apaga nada).

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
Está em `nestor.memoria` no banco do LocadoraFácil, `criado_por = 'gitbook'`, códigos **#1 a #47**,
visibilidade `equipe`. Cópia em texto: `conhecimento/gitbook-neostore.md`.

Para responder dúvidas técnicas (bridge ou aqui), no projeto `iynpsgacgcbbtjllikku`:
```sql
SELECT codigo, titulo, conteudo, dados FROM nestor.buscar_memoria('<pergunta>', NULL, false, NULL, 5);
```
- Responder só com o que está nos itens; citar o #código; mandar os links de vídeo quando houver.
- Se nada responder, dizer que não encontrou. **Nunca** usar dados de um item para responder sobre outro.
- Totens: #30 Totem Branco = item **0019**; #31 Totem Preto = item **0018**; #32 Púlpito 40".
  As medidas também estão em `"Item".especificacoes` do 0018 e 0019 (preenchidas em 2026-10-02).
- Informação nova (ex.: anexos do grupo "Informações"): gravar em `nestor.memoria`; se for de um
  equipamento do cadastro, também em `"Item".especificacoes` (só acrescentar, nunca apagar o que existe).
- **Fonte única = banco** (decisão do Ricardo, 2026-10-03). A pasta do bridge na VPS
  `/opt/neostore/equipamentos/` misturava dados (ex.: totem branco com medidas do preto) e está
  sendo importada para `nestor.memoria` (`criado_por = 'vps-equipamentos'`); depois vira só arquivo
  morto (`equipamentos_ARQUIVO`, não apagar). Arquivos de imagem/PDF ficam na VPS por enquanto,
  com o caminho em `arquivo_path` prefixado `vps:` (o bridge não tem chave do Storage).
- **Arquivos do Google Drive** (2026-10-03): conector Drive ligado na conta ricardoamano@gmail.com
  (neostoresi@gmail.com não; pedir para compartilhar com ricardoamano). Limite do conector: 10 MB por
  arquivo; a nuvem não acessa drive.google.com direto. Catálogo em `nestor.memoria` com
  `arquivo_path = 'drive:<id>'`, `criado_por = 'drive-catalogo'`; o bridge envia baixando pelo link
  público (pasta precisa estar "qualquer pessoa com o link"). Pasta **Totvs_fotos** (portfólio para
  site e vendas, 9 fotos) = **#48 a #56**, descrição pendente (fotos > 10 MB).
- Embeddings ainda vazios (sem chave OpenAI): a busca usa texto + similaridade de título.

## Estrutura

```
assistentetecico/
├── supabase/
│   ├── locadorafacil/
│   │   └── 001_schema_nestor.sql  # Schema nestor ATUAL (banco do LocadoraFácil)
│   └── migrations/
│       └── 001_nestor_schema.sql  # Versão antiga (neostore-site) — obsoleta
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
