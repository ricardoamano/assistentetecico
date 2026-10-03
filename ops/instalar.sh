#!/usr/bin/env bash
# Instala o "nestor-ops" na VPS (rodar UMA vez, como root, no terminal da Hostinger):
#   curl -fsSL https://raw.githubusercontent.com/ricardoamano/assistentetecico/claude/compassionate-fermi-te5q84/ops/instalar.sh | bash
set -euo pipefail
DIR=/opt/neostore/ops
BASE=https://raw.githubusercontent.com/ricardoamano/assistentetecico/claude/compassionate-fermi-te5q84/ops
mkdir -p "$DIR" /opt/neostore/segredos
curl -fsSL "$BASE/nestor-ops.js" -o "$DIR/nestor-ops.js"

# Token: gerado aqui, guardado só na VPS
TOKFILE=/opt/neostore/segredos/nestor-ops.token
[ -s "$TOKFILE" ] || head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | head -c 48 > "$TOKFILE"
chmod 600 "$TOKFILE"

# Descobre o processo do portal no PM2
PORTAL=$(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const l=JSON.parse(s).map(p=>p.name).filter(n=>/portal|nestor|whatsapp|bridge/i.test(n)&&!/ops/i.test(n));console.log(l[0]||"")}catch{console.log("")}})')
echo "Processo do portal detectado: ${PORTAL:-NENHUM (vai reiniciar todos)}"

cat > "$DIR/ecosystem.config.js" <<EOC
module.exports = { apps: [{ name: 'nestor-ops', script: '$DIR/nestor-ops.js',
  env: { OPS_PORT: '3099', PORTAL_PM2: '$PORTAL', NESTOR_OPS_TOKEN: require('fs').readFileSync('$TOKFILE','utf8').trim() } }] };
EOC
chmod 600 "$DIR/ecosystem.config.js"
pm2 delete nestor-ops >/dev/null 2>&1 || true
pm2 start "$DIR/ecosystem.config.js" && pm2 save

# nginx: publica em https://nestor.neostore.app/ops/
CONF=$(grep -rl "nestor.neostore.app" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1 || true)
if [ -n "$CONF" ] && ! grep -q "location /ops/" "$CONF"; then
  cp "$CONF" "$CONF.bak-ops"
  # insere antes do primeiro "location" do bloco que tem ssl (porta 443)
  awk 'BEGIN{done=0} /listen .*443/{ssl=1} ssl && !done && /^[[:space:]]*location /{print "    location /ops/ { proxy_pass http://127.0.0.1:3099/ops/; proxy_set_header X-Real-IP $remote_addr; proxy_read_timeout 60s; }"; done=1} {print}' "$CONF.bak-ops" > "$CONF"
  if nginx -t >/dev/null 2>&1; then systemctl reload nginx; echo "nginx: /ops/ publicado"; else cp "$CONF.bak-ops" "$CONF"; echo "nginx: falhou o teste, configuração restaurada"; fi
else
  echo "nginx: ${CONF:-config do nestor.neostore.app não encontrada} (verifique manualmente se /ops/ aponta para 127.0.0.1:3099)"
fi

sleep 2
echo "Teste local:"; curl -s -o /dev/null -w "  status sem token = %{http_code} (esperado 401)\n" http://127.0.0.1:3099/ops/status
echo
echo "=========== TOKEN (copie e guarde; não mande no WhatsApp nem no chat) ==========="
cat "$TOKFILE"; echo
echo "================================================================================="
