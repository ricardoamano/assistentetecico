#!/usr/bin/env bash
# Faz o agente de escala (neostore-whatsapp-agent) enviar pelo whatsapp-bridge em vez da Evolution (desativada).
# SO RODAR SE O RICARDO QUISER QUE OS TECNICOS VOLTEM A RECEBER OS AVISOS DE ESCALA AUTOMATICOS.
set -euo pipefail
A=/opt/neostore-whatsapp-agent/src/whatsapp/services/evolutionService.ts
cp -a "$A" "$A.bak-$(date +%Y%m%d-%H%M%S)"
curl -fsSL https://raw.githubusercontent.com/ricardoamano/assistentetecico/claude/compassionate-fermi-te5q84/ops/revisao/evolutionService.ts -o "$A"
pm2 restart neostore-whatsapp-agent >/dev/null && sleep 6 && pm2 logs neostore-whatsapp-agent --lines 8 --nostream
