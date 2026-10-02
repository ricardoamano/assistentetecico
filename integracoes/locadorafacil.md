# Integração NESTOR ↔ LocadoraFácil (acesso direto ao banco)

O NESTOR administra o **LocadoraFácil** (sistema de locação da Neostore, `locadorafacil.app`,
repo `ricardoamano/locadorafacil`) gravando **direto no Postgres** dele. Não existe API, chave
ou webhook para isso — e não deve ser criada. Tudo é SQL com o usuário Postgres `bridge_nestor`
(projeto Supabase `iynpsgacgcbbtjllikku`).

## Dois bancos, não confundir
| Banco | Projeto Supabase | Para que serve | Usuário |
|---|---|---|---|
| **NESTOR** (schema `nestor`) | `neostore-site` (`cgaranykjfldeiruojct`) | memória, usuários, histórico do assistente | `nestor_app` |
| **LocadoraFácil** (schema `public`) | `locadorafacil` (`iynpsgacgcbbtjllikku`) | itens, clientes, orçamentos, OS, faturas, equipe… | `bridge_nestor` |

## Como acessar — CAMINHO PRINCIPAL (portal na VPS)
`nestor.neostore.app` = **neostore-portal** na VPS Hostinger (Express + PM2). Recebe menções do WhatsApp e roda
`claude -p` como usuário `neostore` dentro de `/root/projects/locadorafacil` (checkout do repo LocadoraFácil).
Esse Claude acessa o banco **direto no Postgres** com o usuário `bridge_nestor`:
```
postgresql://bridge_nestor.iynpsgacgcbbtjllikku:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```
- Pooler `aws-1-sa-east-1`, **modo sessão**, porta 5432 (tem IPv4). Host direto `db.<ref>.supabase.co` é só IPv6.
- Usuário leva o sufixo do projeto (`bridge_nestor.iynpsgacgcbbtjllikku`); sem ele o pooler recusa.
- Senha rotacionada em 02/10/2026, guardada no **vault da VPS** (nunca em repositório). Trocar:
  `ALTER ROLE bridge_nestor WITH PASSWORD '...'` no projeto locadorafacil.
- Testado em 02/10/2026: contou 148 contatos e achou o cliente "TESTE NESTOR DEV".
- Não depende de API, deste repositório nem de máquina do Ricardo ligada.

Teste rápido:
```sql
SELECT codigo, nome, quantidade FROM "Item"
WHERE "companyId"='cmrinczr7000004jx57yua8rq' ORDER BY codigo DESC LIMIT 5;
```

## Caminho alternativo (só sessões Claude Code na nuvem)
Sessões Claude Code na nuvem não alcançam a porta 5432 (rede bloqueada). Nelas, usar o conector Supabase da conta:
`mcp__Supabase__execute_sql` com `project_id: iynpsgacgcbbtjllikku` (carregar via `ToolSearch` se não aparecer).
Pelo conector, `DELETE` às vezes pede aprovação; prefira `UPDATE` e deixe exclusão física para quando o Ricardo pedir.

## O que `bridge_nestor` pode
SELECT / INSERT / UPDATE / DELETE em todas as tabelas de dados (`Item`, `Contact`, `SubContact`, `Local`,
`Orcamento`, `Sala`, `SalaItem`, `OrdemServico`, `Fatura`, `Transacao`, `Membro`, `Veiculo`, `Tarefa`,
`Kit`…) e nas tabelas futuras. **Sem acesso**: senhas (`User` só id/nome/email/papel), segredos da empresa
(`Company` só colunas básicas), `BackupSnapshot`, tabelas de sessão.

## Regras para gravar certo
1. **Multiempresa**: toda linha tem `"companyId"`. Neostore = `cmrinczr7000004jx57yua8rq`. Sempre filtrar.
2. `id` (texto, cuid) e `updatedAt` são preenchidos automaticamente se vierem nulos (gatilho
   `trg_bridge_defaults`); `createdAt` tem default. Pode omitir os três no INSERT.
3. Nomes camelCase **entre aspas**: `"Item"`, `"companyId"`, `"valorAluguel"`, `"dataInicio"`.
4. Status fixos: Orcamento `PENDENTE|AGUARDANDO|APROVADO|REPROVADO|CANCELADO`; OrdemServico
   `ABERTA|EM_ANDAMENTO|CONCLUIDA|CANCELADA`; Transacao `PENDENTE|PAGO`; Membro.tipo
   `FUNCIONARIO|FREELANCER|TECNICO`; Contact.type `CLIENTE|FORNECEDOR`; Item.natureza `EQUIPAMENTO|SERVICO`.
5. Excluir respeitando FKs (filhos antes): SalaItem → Sala → Orcamento; ItemUnidade → Item.
6. Cliente = `"Contact"` (type CLIENTE; `razaoSocial` e `nomeFantasia` obrigatórios). Pessoas de contato =
   `"SubContact"` (nome, cargo, telefone, email, contactId). Espaço de evento = `"Local"`. Equipe = `"Membro"`.

## Itens: usar a função pronta
```sql
SELECT bridge_cadastrar_item(
  'cmrinczr7000004jx57yua8rq',  -- empresa
  'TV 55"',                     -- nome (obrigatório)
  4,                            -- quantidade
  250,                          -- diária (0 = sem preço)
  'Samsung',                    -- marca (cria se não existir)
  'QN55',                       -- modelo
  'Vídeo'                       -- categoria (cria se não existir)
);
-- → {"acao":"criado","codigo":"0250","nome":"TV 55\"","quantidade":4,"id":"..."}
```
Gera o próximo código (0001…), preços semana/quinzena/mês pela política da empresa, unidades físicas
(0250-01…), selo "a revisar" e registro em `"AuditLog"`. Item igual (nome + modelo) é atualizado, não duplicado.

## Consultas úteis
```sql
-- OS da semana
SELECT o.numero, o."eventoNome", o."dataInicio", os.status
FROM "OrdemServico" os JOIN "Orcamento" o ON o.id = os."orcamentoId"
WHERE os."companyId" = 'cmrinczr7000004jx57yua8rq'
  AND o."dataInicio" BETWEEN now() AND now() + interval '7 days' ORDER BY o."dataInicio";
-- marcar receita paga
UPDATE "Transacao" SET status = 'PAGO' WHERE id = '...' AND "companyId" = 'cmrinczr7000004jx57yua8rq';
```
Gravações diretas não geram log sozinhas; para rastro, inserir em `"AuditLog"` (companyId, userNome,
tipo 'ALTERACAO', modulo, acao). A função de itens já faz isso.

Referência completa do esquema: `prisma/schema.prisma` e `CONTEXTO.md` no repo `ricardoamano/locadorafacil`.

## Base de conhecimento do NESTOR (schema `nestor`, neste mesmo banco)
Desde 2026-10-02 o banco do NESTOR fica **aqui**, no schema `nestor` (fora do `public`, invisível
para o app/Prisma e para a API pública). `bridge_nestor` tem leitura e escrita.

| Tabela | Uso |
|---|---|
| `nestor.memoria` | Conhecimento: GitBook (#1–#47), medidas, tutoriais, anexos do grupo "Informações" |
| `nestor.usuarios` / `nestor.historico` / `nestor.auditoria` | Reservadas para o assistente |

Buscar (texto + título parecido; ordena por relevância):
```sql
SELECT codigo, titulo, conteudo, dados FROM nestor.buscar_memoria('altura do totem branco', NULL, false, NULL, 5);
```
Guardar uma informação nova:
```sql
INSERT INTO nestor.memoria (titulo, categoria, tags, descricao, conteudo, dados, criado_por)
VALUES ('Etiqueta Zebra 100x50', 'etiquetas', ARRAY['zebra','etiqueta'], 'Etiqueta térmica',
        '100 mm x 50 mm', '{"largura_mm":100,"altura_mm":50}', 'grupo-informacoes')
RETURNING codigo;
```
Regras: responder só com o que achar e citar o #código; não usar dados de um item para outro
(ex.: Totem Branco #30 = item 0019 ≠ Totem Preto #31 = item 0018). Se a informação é de um
equipamento do cadastro, acrescentar também em `"Item".especificacoes` (sem apagar o que já existe).
Arquivos: bucket privado `nestor-arquivos` no Storage deste projeto.
