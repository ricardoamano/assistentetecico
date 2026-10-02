# Integração NESTOR ↔ LocadoraFácil (acesso direto ao banco)

O NESTOR administra o **LocadoraFácil** (sistema de locação da Neostore, `locadorafacil.app`,
repo `ricardoamano/locadorafacil`) gravando **direto no Postgres** dele. Não existe API, chave
ou webhook para isso — e não deve ser criada. Tudo é SQL com o usuário `bridge_nestor`.

## Dois bancos, não confundir
| Banco | Projeto Supabase | Para que serve | Usuário |
|---|---|---|---|
| **NESTOR** (schema `nestor`) | `neostore-site` (`cgaranykjfldeiruojct`) | memória, usuários, histórico do assistente | `nestor_app` |
| **LocadoraFácil** (schema `public`) | `locadorafacil` (`iynpsgacgcbbtjllikku`) | itens, clientes, orçamentos, OS, faturas, equipe… | `bridge_nestor` |

## Conexão (servidor do NESTOR, na VPS)
Variável de ambiente `LOCADORA_DATABASE_URL`:
```
postgresql://bridge_nestor.iynpsgacgcbbtjllikku:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```
- Usar o **pooler** (tem IPv4). O host direto `db.<ref>.supabase.co` é só IPv6 — não usar.
- O usuário leva o sufixo do projeto (`bridge_nestor.iynpsgacgcbbtjllikku`); sem ele o pooler recusa.
- Se der "Tenant or user not found", trocar `aws-0` por `aws-1`.
- Senha: está com o Ricardo (não fica em repositório). Trocar: `ALTER ROLE bridge_nestor WITH PASSWORD '...'`
  no SQL Editor do projeto locadorafacil.
- Teste: `SELECT codigo, nome, quantidade FROM "Item" WHERE "companyId"='cmrinczr7000004jx57yua8rq' ORDER BY codigo DESC LIMIT 5;`

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
