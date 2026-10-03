# Google Drive → NESTOR → site da Neostore

Decisão do Ricardo (2026-10-03). Grupo principal: **Secretário**.

## Acesso ao Drive
- Conta de serviço: `neostore-calendar@claude-nestor-neostoresi.iam.gserviceaccount.com`
  (projeto Google Cloud `claude-nestor-neostoresi`). Conferir se a Drive API está ativa nesse projeto.
- Chave JSON só na VPS: `/opt/neostore/segredos/google-drive.json` (chmod 600, usuário neostore).
  Nunca no chat, no WhatsApp ou em repositório.
- Escopo `drive.readonly`. O bridge só enxerga pastas compartilhadas com a conta de serviço (Leitor).

## Fluxo quando chega um link de pasta do Drive
1. Ler a pasta pela conta de serviço. Se 403/404: pedir para compartilhar com o e-mail da conta de serviço.
2. Baixar fotos e vídeos.
3. Padrão: **só catalogar** (passo 5). O Ricardo sobe o portfólio no site ele mesmo (2026-10-03);
   enviar ao site **apenas quando ele pedir explicitamente**. Destinos possíveis nesse caso:
   - **Portfólio** do site → `POST /api/import` com `target=project` (entra como **rascunho**).
   - **"O que fazemos"** → `target=service` + `serviceSlug`.
   - **Só referência interna** (desenho técnico, foto de equipamento) → não vai ao site.
4. Site: contrato completo em `ricardoamano/neostore-website` → `docs/NESTOR-INTEGRACAO.md`
   (`http://127.0.0.1:3002/api/import`, cabeçalho `x-sync-token: $NEOSTORE_SYNC_TOKEN`).
   O site otimiza (WebP 1600px), grava no Supabase `neostore-site` e espelha no Drive do site.
5. **Sempre** catalogar também em `nestor.memoria` (banco do LocadoraFácil), uma linha por arquivo:
   `arquivo_path = 'drive:<id>'`, `criado_por = 'drive-catalogo'`, descrição do que aparece na imagem,
   categoria `portfolio` / `equipamento` / `geral`, e em `dados`: `site_projeto_id` ou `site_servico`
   quando foi para o site.
6. Responder no grupo: o que foi criado, quantas mídias, link do admin para revisar, #códigos do NESTOR.

## Regras
- Nunca publicar direto no site sem o Ricardo pedir (`publish=true` só sob pedido explícito).
- Rosto de pessoas/cliente identificável: avisar antes de mandar para o site.
- Token do site e chave do Drive ficam só na VPS como variável de ambiente/arquivo protegido.
