# Revisão geral — NESTOR / bridge / portal (2026-10-03)

## Como está montado (VPS)
WhatsApp → `whatsapp-bridge` (Go, :8080) → `neostore-portal` (Node, :3001, `responder.js`) → `claude -p` como
usuário `neostore` → resposta pelo bridge. Configuração por grupo em `/opt/neostore-portal/data/groups.json`
(editada na tela do portal): modo (dev / informativo), projeto vinculado, modelo, sem financeiro, biblioteca,
secretário (cofre TOTP), regras por participante. Instruções gerais do bot: `/home/neostore/.claude/CLAUDE.md`.
Código do portal **sem git** (só arquivos .bak).

## Problemas encontrados
| # | Gravidade | Problema | Situação |
|---|---|---|---|
| 1 | Crítica | 66 tabelas do LocadoraFácil abertas para a API pública do Supabase (`anon`/`authenticated` podiam ler, alterar e apagar tudo, inclusive User/Account/Session/ContaBancaria) | **Corrigido** (`supabase/locadorafacil/004_seguranca_e_acessos.sql`) |
| 2 | Alta | O prompt do portal manda o bot ler `/opt/neostore/equipamentos` (arquivos antigos e errados) e **não menciona o banco** — causa das respostas erradas do totem | Correção pronta (`ops/revisao`) |
| 3 | Alta | Usuários de banco só-leitura (`bridge_nestor_ro`, `bridge_nestor_apoio`) não enxergavam a base do NESTOR; o do APOIO nem lia o cadastro de itens | **Corrigido** no banco |
| 4 | Alta | `/home/neostore/.claude/CLAUDE.md` desatualizado: manda usar N8N, Supabase local antigo e pastas de arquivos como memória; tem lixo de outro projeto (regras do Next.js) | Novo arquivo pronto |
| 5 | Média | Limite global de 3 execuções: 3 tarefas longas de DEV (até 15 min cada) travam TODOS os grupos — provável causa do "travou" | Correção pronta (filas separadas) |
| 6 | Média | `neostore-whatsapp-agent` (escala de técnicos) ainda envia pela Evolution, que foi desligada: os avisos de escala estão falhando a cada 5 min sem ninguém saber | Correção pronta, **opcional** (decisão do Ricardo) |
| 7 | Média | Grupo "Secretário Pessoal" está em modo DEV com o projeto do LocadoraFácil: o bot pode editar código do sistema a partir dele | Recomendação: trocar para "Informativo" no portal |
| 8 | Baixa | `nestor.grupos` (criado nesta sessão) duplica a configuração que já existe no portal | Obsoleto — usar só o portal |
| 9 | Baixa | O instalador do nestor-ops copiava arquivos sensíveis do portal (chave Google, TOTP, sessões) na rota de leitura de código | Corrigido (exclusões); cópias apagadas |
| 10 | Info | Chave da conta de serviço Google já existe no portal (`data/google-sa.json`, usada pela Agenda) — dá para reaproveitar no Drive | Falta ativar a Drive API e compartilhar as pastas |
