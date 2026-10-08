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

## Tarefas de IA que o NESTOR assumiu (03/10/2026)
O LocadoraFácil desligou a IA por API externa (créditos pagos). Quando o Ricardo pedir pelo WhatsApp, o NESTOR faz
com o Claude do plano e grava no banco:
- **Preencher cadastro** de cliente/fornecedor/local/item a partir do nome (razão social, CNPJ, endereço, categoria,
  descrição comercial, watts/kVA de equipamentos…). Itens: usar `bridge_cadastrar_item`.
- **Proposta comercial** (Projeto Especial) em Markdown — estrutura e regras em `src/lib/ia.ts` do repo
  locadorafacil (`INSTRUCOES_PROPOSTA_PADRAO`); salvar em `"Orcamento".propostaTexto` quando pedido.
- **Escala de equipe** sugerida para uma OS (`INSTRUCOES_ESCALA_PADRAO`); técnicos pelo **apelido** (`"Membro".apelido`,
  ex.: "Well" = Wellington Santos Nunes).
- **Contrato** por IA (`INSTRUCOES_CONTRATO_PADRAO`, modelos em `"ModeloContrato"`).
- **Preços de mercado** (estimativa de locação por item), **resumo de eventos** do período, **ajuda** sobre o sistema,
  **importar OS de postos de serviço** e **importar lista de itens** (planilha/texto → `bridge_cadastrar_item`).

## Orçamento rápido pelo NESTOR (substitui o botão "Rápido" do app, removido em 03/10/2026)
Fluxo: o Ricardo manda o briefing no WhatsApp → o NESTOR consulta o catálogo, propõe itens/valores em texto
(pronto para encaminhar ao cliente) e, quando o Ricardo confirmar, **formaliza** com uma única chamada:
```sql
SELECT bridge_criar_orcamento(
  'cmrinczr7000004jx57yua8rq',       -- empresa
  'Stone',                           -- cliente (acha por nome; cria se não existir)
  'Convenção Stone 2026',            -- nome do evento
  '2026-11-10', '2026-11-12',        -- início, fim
  '[{"codigo":"0012","quantidade":2,"diarias":3},
    {"codigo":"0045","quantidade":10,"diarias":3,"valorUnitario":40}]'::jsonb,  -- valorUnitario opcional
  '2026-11-09',                      -- montagem (opcional)
  'Observações para o cliente',      -- opcional
  'Fabio Zonta', '11 99999-0000',    -- pessoa de contato (opcional)
  'Plenária'                         -- nome da sala (opcional, padrão "Geral")
);
-- → {"acao":"criado","numero":1880,"total":5400,"itens":2,"avisos":[],"link":"https://locadorafacil.app/orcamentos/<id>"}
```
- Preço sem `valorUnitario`: política do item — ≥30 diárias usa `valorMes`, ≥15 `valorQuinzena`, ≥7 `valorSemana`,
  senão `valorAluguel` (diária). Serviços usam `valorAluguel`.
- Códigos de item: 4 dígitos (`0012`); item inexistente vira aviso, não erro. Sempre responder ao Ricardo com o
  número e o link.
- Catálogo para montar a proposta:
  `SELECT codigo, nome, modelo, apelidos, "valorAluguel", "valorSemana", "valorQuinzena", "valorMes", quantidade
   FROM "Item" WHERE "companyId"='cmrinczr7000004jx57yua8rq' AND ativo ORDER BY nome;`
- Para mudar depois: `UPDATE "SalaItem" …`, `UPDATE "Orcamento" SET total = (SELECT sum(subtotal) FROM "SalaItem" si
  JOIN "Sala" s ON s.id = si."salaId" WHERE s."orcamentoId" = '<id>') WHERE id = '<id>';`

## Frases que o app mostra ao usuário (ele vai mandar exatamente assim)
Os botões de IA do LocadoraFácil agora exibem uma frase pronta + "Copiar". Espere pedidos neste formato:
- "Nestor, cadastre no LocadoraFácil o cliente <empresa> (CNPJ, endereço, contato)."
- "Nestor, cadastre o item <nome, marca, modelo>, <qtd> unidades, diária R$ <valor>." → `bridge_cadastrar_item`
- "Nestor, quanto o mercado cobra pela locação de <equipamento>? Diária, semana e reposição."
- "Nestor, monte a proposta do projeto especial: <descrição>. Salve no orçamento #<n>." → `UPDATE "Orcamento"
  SET "projetoEspecial"=true, "conteudoProjeto"='<markdown>' WHERE numero=<n> AND "companyId"=…`
- "Nestor, sugira a escala e o veículo para a OS #<n>." → ler `"OrdemServico"`, `"Membro"` (apelido!), `"Veiculo"`.
- "Nestor, redija o contrato do orçamento #<n> e salve em Contratos." → inserir em `"Contrato"` (ver colunas no schema).
- "Nestor, analise os indicadores de <período>…" / "resuma os eventos de <período>…" → consultas em `"Orcamento"`,
  `"OrdemServico"`, `"Fatura"`, `"Transacao"`.
- "Nestor, quem tem <equipamento> para alugar e quanto custa?" → `"PrecoMercado"` + `"Item"`.
- "Nestor, segue a OS do posto <cliente>…" → `bridge_criar_orcamento` (cliente é posto de serviço).
- "Nestor, cadastre esta lista de itens…" → `bridge_cadastrar_item` por linha.
- "Nestor, anote no banco de preços: <empresa> cobra R$ <valor>…" → `INSERT INTO "PrecoMercado"` (ver colunas).
- "Nestor, orçamento para <cliente>, evento <nome>, de <data> a <data>: <itens>." → `bridge_criar_orcamento`.

## PDF do orçamento — parâmetros da rota pública (08/10/2026)
`/imprimir/<id>?token=…&template=classico|moderno&valores=item|resumido|categoria`
- `valores=item`: coluna de subtotal por item · `resumido`: só o subtotal da sala · **`categoria`**: itens agrupados por
  categoria com subtotal por categoria (sem valor por item). Perguntar ao Ricardo qual modo, como já faz com o template.
