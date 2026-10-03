#!/usr/bin/env bash
# Publica o nestor-ops em https://nestor.neostore.app/ops/ (bloco HTTPS do nginx). Seguro: faz backup,
# testa com "nginx -t" e restaura se falhar.
set -euo pipefail
CONF=$(readlink -f "${1:-/etc/nginx/sites-available/nestor-portal}")
[ -f "$CONF" ] || { echo "config não encontrada: $CONF"; exit 1; }
if grep -q "location /ops/" "$CONF"; then echo "/ops/ já está configurado em $CONF"; else
  cp "$CONF" "$CONF.bak-ops"
  python3 - "$CONF" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
bloco = "    location /ops/ { proxy_pass http://127.0.0.1:3099/ops/; proxy_set_header X-Real-IP $remote_addr; proxy_read_timeout 60s; }\n"
out, i, n = [], 0, 0
for m in re.finditer(r'server\s*\{', s):
    if m.start() < i: continue
    depth, j = 0, m.end() - 1
    while True:
        if s[j] == '{': depth += 1
        elif s[j] == '}':
            depth -= 1
            if depth == 0: break
        j += 1
    blk = s[m.start():j + 1]
    if 'nestor.neostore.app' in blk and '443' in blk:
        sn = re.search(r'server_name[^;]*;\n?', blk)
        if sn:
            blk = blk[:sn.end()] + ('' if blk[sn.end()-1] == '\n' else '\n') + bloco + blk[sn.end():]
            n += 1
    out.append(s[i:m.start()]); out.append(blk); i = j + 1
out.append(s[i:])
open(p, 'w').write(''.join(out))
print(f"blocos HTTPS alterados: {n}")
PY
  if nginx -t 2>/tmp/nginx-test.txt; then systemctl reload nginx; echo "OK: /ops/ publicado"; else cat /tmp/nginx-test.txt; cp "$CONF.bak-ops" "$CONF"; echo "FALHOU: configuração restaurada"; exit 1; fi
fi
sleep 1
curl -s -o /dev/null -w "teste externo sem token: %{http_code} (esperado 401)\n" https://nestor.neostore.app/ops/status
