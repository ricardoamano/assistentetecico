#!/usr/bin/env python3
# Ajusta /opt/neostore-portal/responder.js (idempotente). Uso: python3 patch_responder.py /opt/neostore-portal/responder.js
import sys, re
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
orig = s
MARK = "// [revisao-2026-10-03]"

def rep(old, new, desc):
    global s
    if new in s:
        print(f"  = {desc}: ja aplicado"); return
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"ERRO: trecho para '{desc}' encontrado {n} vezes — nada foi alterado")
    s = s.replace(old, new); print(f"  + {desc}")

# 1) Base de conhecimento: banco primeiro (fonte unica), arquivos locais so como apoio
rep('- Base de conhecimento da Neostore em /opt/neostore (clientes/, eventos/, equipamentos/, precos.md, agenda.md, docs/): leia com Read/Grep quando a pergunta for sobre a empresa, equipamentos, medidas, precos, clientes ou eventos.',
    '''- FONTE UNICA = BANCO. Para qualquer duvida tecnica (medidas, especificacoes, tutoriais, equipamentos, resolucoes, contatos tecnicos) consulte PRIMEIRO, via Bash:
  node /opt/neostore-portal/bin/memoria.js buscar "<pergunta>"     (base do NESTOR: GitBook #1-#47 + o que foi guardado)
  node /opt/neostore-portal/bin/memoria.js item "<codigo ou nome>"  (ficha tecnica do item no cadastro do LocadoraFacil)
  Responda so com o que vier dai e cite o #codigo / codigo do item. NUNCA use dados de um item para responder sobre outro (ex.: Totem Branco 0019 e Totem Preto 0018 sao diferentes). Se nao achar, diga que nao encontrou — nao invente.
- Guardar informacao nova (so em grupos com permissao de registro): node /opt/neostore-portal/bin/memoria.js guardar --titulo "..." --conteudo "..." [--categoria] [--tags a,b] [--arquivo caminho] [--item 0019]
- Pastas locais em /opt/neostore (equipamentos/, precos.md, etc.) sao ANTIGAS e podem ter erros: use so se o banco nao tiver nada, e avise que a informacao veio de arquivo antigo.''',
    "base de conhecimento pelo banco")

# 2) Variavel de modo do banco para o memoria.js
rep('    if (opts.semFinanceiro) env.NESTOR_SEM_FINANCEIRO = "1";',
    f'''    if (opts.semFinanceiro) env.NESTOR_SEM_FINANCEIRO = "1";
    env.NESTOR_DB_MODE = opts.readOnly ? (opts.semFinanceiro ? "apoio" : "ro") : "rw"; {MARK}''',
    "modo do banco por grupo (rw/ro/apoio)")

# 3) Filas separadas: tarefas longas de projeto nao bloqueiam respostas rapidas
rep('''const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL_CLAUDE || "3", 10);
let running = 0;
const waiters = [];
async function acquireSlot() {
  if (running < MAX_PARALLEL) { running++; return; }
  await new Promise(resolve => waiters.push(resolve));
  running++;
}
function releaseSlot() {
  running--;
  const next = waiters.shift();
  if (next) next();
}''',
'''const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL_CLAUDE || "3", 10);
const MAX_PARALLEL_LONG = parseInt(process.env.MAX_PARALLEL_LONG || "2", 10); {MARK}
const pools = { quick: { max: MAX_PARALLEL, running: 0, waiters: [] }, long: { max: MAX_PARALLEL_LONG, running: 0, waiters: [] } };
let running = 0;
async function acquireSlot(kind = "quick") {
  const p = pools[kind] || pools.quick;
  if (p.running >= p.max) await new Promise(resolve => p.waiters.push(resolve));
  p.running++; running++;
}
function releaseSlot(kind = "quick") {
  const p = pools[kind] || pools.quick;
  p.running--; running--;
  const next = p.waiters.shift();
  if (next) next();
}'''.replace("{MARK}", MARK),
    "filas separadas (rapidas x tarefas longas)")
rep('''  const task = prev.then(async () => {
    await acquireSlot();''',
    '''  const slotKind = (projectDir(groupCfg) && !isConsulta(groupCfg)) ? "long" : "quick"; ''' + MARK + '''
  const task = prev.then(async () => {
    await acquireSlot(slotKind);''',
    "escolha da fila por tipo de grupo")
rep('''    } finally {
      releaseSlot();
    }''', '''    } finally {
      releaseSlot(slotKind);
    }''', "liberacao da fila certa")

# 4) Regra geral contra resposta inventada
rep("- Maximo ${MAX_REPLY_LEN} caracteres.",
    "- Maximo ${MAX_REPLY_LEN} caracteres.\n- Dados tecnicos (medidas, modelos, quantidades, precos) so com fonte (banco ou arquivo citado). Sem fonte = diga que nao encontrou.",
    "regra contra dado sem fonte")

if s != orig:
    open(p, "w", encoding="utf-8").write(s); print("responder.js atualizado")
else:
    print("responder.js ja estava atualizado")
