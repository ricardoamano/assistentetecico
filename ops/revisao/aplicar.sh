#!/usr/bin/env bash
# Aplica a revisao de 2026-10-03 no portal do NESTOR (rodar como root na VPS):
#   curl -fsSL https://raw.githubusercontent.com/ricardoamano/assistentetecico/claude/compassionate-fermi-te5q84/ops/revisao/aplicar.sh | bash
# Faz backup de tudo que altera, testa antes de reiniciar e desfaz sozinho se o portal nao subir.
set -euo pipefail
BASE=https://raw.githubusercontent.com/ricardoamano/assistentetecico/claude/compassionate-fermi-te5q84/ops/revisao
P=/opt/neostore-portal
NCLAUDE=/home/neostore/.claude/CLAUDE.md
BK=/opt/neostore/backups/revisao-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BK"
cp -a "$P/responder.js" "$BK/"; cp -a "$P/.env" "$BK/env" 2>/dev/null || true; cp -a "$NCLAUDE" "$BK/neostore-CLAUDE.md" 2>/dev/null || true
echo "Backup em $BK"

desfazer() {
  echo "!! Problema — desfazendo"; cp -a "$BK/responder.js" "$P/responder.js"
  [ -f "$BK/env" ] && cp -a "$BK/env" "$P/.env"; [ -f "$BK/neostore-CLAUDE.md" ] && cp -a "$BK/neostore-CLAUDE.md" "$NCLAUDE"
  rm -f "$P/bin/memoria.js"; pm2 restart neostore-portal >/dev/null; echo "Revertido. Portal no estado anterior."; exit 1
}

# 1) dependencia do banco
if [ ! -d "$P/node_modules/pg" ]; then (cd "$P" && npm install pg@8 --no-audit --no-fund --silent) || desfazer; fi
echo "pg ok"

# 2) ferramenta da base de conhecimento + ajuste do responder
TMP=$(mktemp -d)
curl -fsSL "$BASE/memoria.js" -o "$P/bin/memoria.js" && chmod 755 "$P/bin/memoria.js"
curl -fsSL "$BASE/patch_responder.py" -o "$TMP/patch.py"
python3 "$TMP/patch.py" "$P/responder.js" || desfazer

# 3) credenciais do banco para o memoria.js (copiadas dos .env do projeto locadorafacil; valores nunca exibidos)
python3 - "$P/.env" <<'PY' || desfazer
import sys, re, glob, urllib.parse
envp = sys.argv[1]
atual = open(envp).read() if __import__("os").path.exists(envp) else ""
achados = {}
for f in glob.glob("/root/projects/locadorafacil/.env*"):
    for line in open(f, errors="ignore"):
        m = re.match(r'\s*[A-Z_]+\s*=\s*["\']?(postgres(?:ql)?://[^"\'\s]+)', line)
        if not m: continue
        url = m.group(1); user = urllib.parse.unquote(urllib.parse.urlparse(url).username or "").split(".")[0]
        if user in ("bridge_nestor", "bridge_nestor_ro", "bridge_nestor_apoio") and user not in achados: achados[user] = url
mapa = {"bridge_nestor": "NESTOR_DB_URL_RW", "bridge_nestor_ro": "NESTOR_DB_URL_RO", "bridge_nestor_apoio": "NESTOR_DB_URL_APOIO"}
add = []
for user, var in mapa.items():
    if re.search(rf"^{var}=", atual, re.M): print(f"  = {var} ja configurada"); continue
    if user in achados: add.append(f"{var}={achados[user]}"); print(f"  + {var} ({user})")
    else: print(f"  ! {var}: nenhum .env do locadorafacil usa {user}")
if add:
    with open(envp, "a") as fh: fh.write(("\n" if atual and not atual.endswith("\n") else "") + "\n".join(add) + "\n")
PY
chmod 600 "$P/.env"

# 4) testes antes de reiniciar
node --check "$P/responder.js" || desfazer
timeout 25 node --input-type=module -e "await import('$P/responder.js'); process.exit(0)" >/dev/null 2>&1 || desfazer
DBENV=$(grep -E "^NESTOR_DB_URL_(RO|APOIO|RW)=" "$P/.env" | tr "\n" " " || true)
echo "--- teste da base (modo apoio): 'altura totem branco'"
sudo -u neostore env NESTOR_DB_MODE=apoio $DBENV node "$P/bin/memoria.js" buscar "altura totem branco" --limite 2 | head -12 || echo "  (teste da base falhou — veja acima)"
echo "--- teste do cadastro: item 0019"
sudo -u neostore env NESTOR_DB_MODE=apoio $DBENV node "$P/bin/memoria.js" item 0019 | head -6 || true

# 5) instrucoes do bot (usuario neostore)
curl -fsSL "$BASE/neostore-CLAUDE.md" -o "$TMP/c.md" && [ -s "$TMP/c.md" ] && install -o neostore -g neostore -m 644 "$TMP/c.md" "$NCLAUDE"
echo "CLAUDE.md do bot atualizado"

# 6) reinicia o portal e confere
pm2 restart neostore-portal >/dev/null; sleep 8
ST=$(pm2 jlist | python3 -c 'import sys,json;print([p["pm2_env"]["status"] for p in json.load(sys.stdin) if p["name"]=="neostore-portal"][0])')
[ "$ST" = "online" ] || desfazer
curl -s -o /dev/null -w "portal respondeu HTTP %{http_code}\n" http://127.0.0.1:3001/login || true
echo "OK: revisao aplicada. Backup em $BK"
