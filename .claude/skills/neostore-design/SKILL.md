---
name: neostore-design
description: Design System oficial da NEOSTORE. Use SEMPRE que criar ou alterar qualquer app, painel, página, tela, componente, slide, proposta ou peça visual neste repositório. Contém tokens (cores, tipografia, espaçamento, raios), regras de marca, logos e UI kits prontos.
user-invocable: true
---

O design system completo está em `design/neostore-design-system/` na raiz deste repositório.

1. Leia `design/neostore-design-system/README.md` (referência autoritativa: voz, paleta, tipografia, espaçamento, logo, componentes).
2. Use os tokens de `design/neostore-design-system/colors_and_type.css`. Em HTML de arquivo único, copie as variáveis necessárias para o `<style>`; em projetos com build, importe o arquivo.
3. Logos em `design/neostore-design-system/assets/`. Símbolo isolado: `symbol-only.png`.
4. Componentes de referência: `preview/components-*.html` e `ui_kits/` (web, proposal, dashboard). Prefira copiar deles a reinventar.

Regras que não se negociam:
- Teal `#1F6E78` é a cor de trabalho. Roxo `#4A1F4F` é acento: no máximo um elemento por tela, nunca texto corrido, nunca fundo maior que um cartão.
- Manrope para tudo; JetBrains Mono para dados técnicos (PINs, códigos, horários). O logotipo é o único elemento "display".
- Raios: 6px em botões, inputs e badges; 10px em cartões; 14px só em containers de hero.
- Bordas fazem o trabalho; sombra só em menus e modais. Sem gradiente, sem glassmorphism, sem bounce.
- Sem emoji. Sem ponto de exclamação. Tom direto, calmo, técnico, em pt-BR.
- Status: sucesso `#2E8F5E`, aviso `#C28A1E`, erro `#B83A3A`, info = teal.
