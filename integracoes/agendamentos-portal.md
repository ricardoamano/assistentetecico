# Agendamento de mensagens nos grupos (portal nestor.neostore.app)

Status: **banco pronto** (2026-10-03, `supabase/locadorafacil/002_agendamentos.sql`).
Falta implementar no portal (neostore-portal, Express + PM2 na VPS), pelo grupo DEV.

## Banco (schema `nestor`, projeto LocadoraFácil `iynpsgacgcbbtjllikku`)

| Objeto | Para quê |
|---|---|
| `nestor.agendamentos` | Agendamentos: nome, grupo, tipo (`agenda_dia`/`texto`/`prompt`), conteudo, horario, dias_semana (0=dom…6=sáb), data_unica, fuso, ativo, ultimo_envio/status/erro |
| `nestor.envios` | Histórico de cada envio (ok/erro) |
| `nestor.agendamentos_pendentes()` | O que deve sair agora (hora já passou, dia certo, ainda não enviado hoje) |
| `nestor.agenda_do_dia(data)` | Eventos (orçamentos APROVADOS em montagem/andamento/término no dia) + tarefas abertas (atrasadas, entrega hoje ou início hoje) da Neostore |

Acesso só por `bridge_nestor`. Primeiro agendamento já criado: **id 1**, "Agenda do dia — eventos e
tarefas", grupo **Secretário**, `agenda_dia`, 07:30, seg a sáb.

## O que o portal precisa fazer

1. **Agendador** (a cada minuto, dentro do processo PM2 do portal):
   ```sql
   SELECT * FROM nestor.agendamentos_pendentes();
   ```
   Para cada linha:
   - `agenda_dia` → `SELECT * FROM nestor.agenda_do_dia();` e montar a mensagem (formato abaixo).
   - `texto` → enviar `conteudo` como está.
   - `prompt` → rodar `claude -p` com o `conteudo` e enviar a resposta.
   - Enviar ao grupo (`grupo_jid`; se vazio, achar pelo nome `grupo` e gravar o jid).
   - Gravar o resultado:
     ```sql
     UPDATE nestor.agendamentos SET ultimo_envio = now(), ultimo_status = 'ok', ultimo_erro = NULL WHERE id = $1;
     INSERT INTO nestor.envios (agendamento_id, grupo, mensagem, status) VALUES ($1, $2, $3, 'ok');
     ```
     Em erro: `ultimo_envio = now()`, `ultimo_status = 'erro'`, `ultimo_erro = <msg>` (não reenviar em loop
     no mesmo dia) e `INSERT` em `envios` com `status = 'erro'`.
   - Se o portal ficar fora do ar e voltar no mesmo dia, ele envia o que ficou para trás (a função cobre isso).

2. **Tela no portal** — "Agendamentos":
   - Lista: nome, grupo, horário, dias, tipo, ativo (liga/desliga), último envio e status.
   - Criar/editar: nome, grupo (lista dos grupos em que o bot está), tipo, texto/prompt, horário,
     dias da semana ou data única.
   - Botão **"Enviar agora"** (teste) e **"Pré-visualizar"** (mostra a mensagem sem enviar).
   - Histórico (últimos envios de `nestor.envios`).
   - Sem apagar: desativar (`ativo = false`).

## Formato da mensagem `agenda_dia`

```
*Agenda de sexta, 03/10*

*Eventos (2)*
• #1849 Extensão Tablets — Dream Factory | em andamento até 15/10
• #1857 Diageo Awards — Nico.ag | em andamento até 11/10

*Tarefas de hoje (N)*
• <nome> — entrega hoje

*Atrasadas (70)*
• 10 mais antigas listadas…
• + 60 outras (58 são "CRM: cobrar feedback") — ver no LocadoraFácil
```

Regras: sem eventos → "Nenhum evento hoje". Atrasadas: listar no máximo 10 e resumir o resto
(agrupar as "CRM: cobrar feedback" em uma linha). Mensagem com no máximo ~3.500 caracteres.

## Próximas fases

- Mandar informações a outros grupos (tipo `texto` ou `prompt` já cobre).
- Avisos por evento (ex.: "amanhã montagem do #1849") — novo tipo, quando o Ricardo pedir.

---

# Modo de cada grupo (tela "Grupos" no portal)

Banco pronto (2026-10-03, `supabase/locadorafacil/003_grupos.sql`): tabela `nestor.grupos` e função
`nestor.modo_grupo(nome, jid)`.

| Modo | O bot faz |
|---|---|
| `consulta` | Só responde perguntas. Não grava, não altera nada. **Padrão para grupo não cadastrado.** |
| `registro` | Responde e grava (nestor.memoria, cadastros no LocadoraFácil). Com `so_admin_grava = true`, só o Ricardo pode mandar gravar. |
| `dev` | Pode alterar arquivos/código do portal na VPS. |
| `desligado` | Ignora o grupo. |

Configuração inicial: Secretário = registro · Informações = registro · APOIO NEOSTORE = consulta · DEV = dev.

## O que o portal precisa fazer
1. Antes de passar a mensagem ao `claude -p`, consultar `SELECT * FROM nestor.modo_grupo(NULL, '<jid>');`
   (ou pelo nome, na primeira vez, e gravar o `grupo_jid`) e **incluir o modo no prompt** como regra:
   "Este grupo está em modo CONSULTA: não grave nem altere nada", etc.
   - Em `consulta`, além do prompt, rodar o Claude sem permissão de escrita (ferramentas de edição
     desligadas) — a regra não pode depender só do texto.
   - Em `desligado`, não chamar o Claude.
2. Tela **"Grupos"**: lista dos grupos em que o bot está, com um seletor de modo por grupo
   (Consulta / Registro / DEV / Desligado), a chave "só o Ricardo grava" e uma observação.
   Mudança vale na hora (sem reiniciar o PM2). Grupo novo aparece automaticamente como Consulta.
