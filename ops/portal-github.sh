#!/usr/bin/env bash
# Coloca o portal do NESTOR (/opt/neostore-portal) no GitHub (repositório PRIVADO ricardoamano/neostore-portal)
# e liga a atualização automática. Rodar como root na VPS, em 3 etapas:
#   bash portal-github.sh chave        -> cria a chave de acesso e mostra o texto para colar no GitHub
#   bash portal-github.sh enviar       -> envia o código (sem senhas/sessões) para o GitHub
#   bash portal-github.sh autodeploy   -> a cada 3 min: guarda alterações feitas na VPS e baixa as do GitHub
set -euo pipefail
P=/opt/neostore-portal
REPO=git@github-portal:ricardoamano/neostore-portal.git
KEY=/root/.ssh/neostore_portal_deploy

case "${1:-}" in
chave)
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  [ -f "$KEY" ] || ssh-keygen -t ed25519 -N "" -C "vps-neostore-portal" -f "$KEY" >/dev/null
  grep -q "Host github-portal" /root/.ssh/config 2>/dev/null || cat >> /root/.ssh/config <<EOC
Host github-portal
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
EOC
  chmod 600 /root/.ssh/config
  ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
  echo; echo "=== COPIE A LINHA ABAIXO (comeca com ssh-ed25519) e cole no GitHub como Deploy key ==="
  cat "$KEY.pub"; echo "==================================================================================";;

enviar)
  cd "$P"
  cat > .gitignore <<'EOG'
node_modules/
.env*
*.bak*
*.quebrado*
data/sessions.json
data/portal-sessions.json
data/passkeys.json
data/totp-secret
data/google-sa.json
data/secretario.json
data/mentions.json
data/media-index.json
data/generated-images/
data/*.db
*.log
EOG
  git config --global --add safe.directory "$P" 2>/dev/null || true
  if [ -e .git ] && ! git -C "$P" rev-parse --git-dir >/dev/null 2>&1; then
    mv .git ".git.invalido-$(date +%Y%m%d-%H%M%S)"; echo "(havia uma pasta .git quebrada — guardada com outro nome)"; fi
  if ! git -C "$P" rev-parse --git-dir >/dev/null 2>&1; then
    git init -q "$P"; git -C "$P" symbolic-ref HEAD refs/heads/main; fi
  echo "repositório local: $(git -C "$P" rev-parse --git-dir)"
  git config user.name "VPS Neostore"; git config user.email "vps@neostore.app"
  git add -A
  # trava de seguranca: nada de segredo indo para o GitHub
  if git diff --cached --name-only | grep -Ei '(^|/)\.env|(^|/)totp-secret$|(^|/)passkeys\.json$|(^|/)(portal-)?sessions\.json$|(^|/)secretario\.json$|(^|/)google-sa\.json$|(^|/)sa\.json$|-sa-key|\.pem$|\.key$|vault\.json$|master\.key$|credenciais'; then
    echo "!! Arquivo sensivel detectado acima — nada foi enviado."; git reset -q; exit 1; fi
  git commit -qm "Portal NESTOR — versão da VPS em $(date +%F)" || true
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REPO"
  git push -u origin HEAD:main
  echo "OK: código enviado para github.com/ricardoamano/neostore-portal";;

autodeploy)
  cat > /opt/neostore/portal-autodeploy.sh <<'EOS'
#!/usr/bin/env bash
# Sincroniza /opt/neostore-portal com o GitHub. Alterações locais (grupo DEV) viram commit e sobem primeiro.
cd /opt/neostore-portal || exit 0
exec 9>/tmp/portal-autodeploy.lock; flock -n 9 || exit 0
LOG=/var/log/portal-autodeploy.log
git add -A >/dev/null 2>&1
git diff --cached --quiet || git commit -qm "Alteração feita na VPS (grupo DEV) $(date '+%F %H:%M')" >/dev/null 2>&1
ANTES=$(git rev-parse HEAD)
git pull -q --rebase origin main >>$LOG 2>&1 || { git rebase --abort >/dev/null 2>&1; echo "$(date) conflito no pull — nada mudou" >>$LOG; exit 0; }
git push -q origin main >>$LOG 2>&1 || true
DEPOIS=$(git rev-parse HEAD)
[ "$ANTES" = "$DEPOIS" ] && exit 0
if ! { node --check index.js && timeout 25 node --input-type=module -e "await import('/opt/neostore-portal/responder.js'); process.exit(0)"; } >/dev/null 2>>$LOG; then
  echo "$(date) versão $DEPOIS quebrada — voltando para $ANTES" >>$LOG; git reset -q --hard "$ANTES"; exit 0; fi
git diff --name-only "$ANTES" "$DEPOIS" | grep -q package.json && npm install --no-audit --no-fund --silent >>$LOG 2>&1
pm2 restart neostore-portal >/dev/null && echo "$(date) publicado $DEPOIS" >>$LOG
EOS
  chmod 755 /opt/neostore/portal-autodeploy.sh
  ( crontab -l 2>/dev/null | grep -v portal-autodeploy; echo "*/3 * * * * /opt/neostore/portal-autodeploy.sh" ) | crontab -
  echo "OK: autodeploy ligado (a cada 3 min). Log: /var/log/portal-autodeploy.log";;
*) echo "uso: bash portal-github.sh chave | enviar | autodeploy"; exit 2;;
esac
