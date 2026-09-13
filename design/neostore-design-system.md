# Design System Neostore

Referência obrigatória para qualquer app, painel ou página criada neste repositório.
Fonte dos tokens: repositório `neostore-website` (`tailwind.config.ts` e `app/globals.css`),
mais o padrão de documentos da skill `briefing-neostore`.

Arquivos:
- `design/neostore.css`: variáveis CSS e componentes base prontos para colar em qualquer HTML.
- `design/assets/`: `symbol.png` (símbolo), `logo-dark.png` (logo para fundo claro), `logo-light.png` (logo para fundo escuro).

---

## 1. Cores

### Marca
| Token | Hex | Uso |
|-------|-----|-----|
| teal-500 (primária) | `#1F6E78` | botões primários, links, títulos, foco |
| teal-600 | `#185863` | hover de botão primário |
| teal-700 | `#12454E` | active / pressionado |
| teal-50 | `#E6F0F2` | fundos sutis, linha alternada de tabela, chips |
| teal-100 | `#C2DBDF` | bordas de destaque |
| purple-500 (secundária) | `#4A1F4F` | subtítulos, destaques, estados de atenção |
| purple-400 | `#5C2F65` | hover do secundário |
| purple-300 | `#82518A` | ícones e detalhes |

Escala completa teal: 50 `#E6F0F2` · 100 `#C2DBDF` · 200 `#8FB9C0` · 300 `#5A95A0` · 400 `#357683` · 500 `#1F6E78` · 600 `#185863` · 700 `#12454E` · 800 `#0D343B` · 900 `#082529`.
Escala roxo: 300 `#82518A` · 400 `#5C2F65` · 500 `#4A1F4F` · 600 `#3A1840`.

### Neutros
| Token | Hex | Uso |
|-------|-----|-----|
| ink | `#0E1112` | texto principal |
| graphite | `#1A1F22` | fundo escuro (header escuro, rodapé) |
| slate | `#2A3033` | superfícies escuras secundárias |
| steel | `#4A5256` | texto secundário, labels |
| fog | `#8C9498` | placeholder, texto terciário |
| mist | `#C3C9CC` | bordas |
| cloud | `#E2E5E7` | divisores, linha de total em tabela |
| paper | `#F4F5F6` | fundo da página |
| white | `#FFFFFF` | cartões, inputs |

### Funcionais (adição para apps; não existem no site)
| Token | Hex | Uso |
|-------|-----|-----|
| success | `#1B7F4B` | salvo, ok |
| danger | `#B3261E` | erro, excluir, tempo acabando |
| warning | `#9A6700` | atenção |

Regra: a marca é teal + roxo. Não usar laranja, amarelo ou azul como cor de destaque.

---

## 2. Tipografia

- **Web/apps:** `Manrope` (Google Fonts, pesos 300 a 800). Fallback: `system-ui, -apple-system, sans-serif`.
- **Mono:** `JetBrains Mono` (400, 500). Fallback: `ui-monospace, monospace`.
- **Documentos (.docx/.pdf):** `Inter`, fallback `Plus Jakarta Sans`, `Calibri`.

| Elemento | Tamanho | Peso | Cor |
|----------|---------|------|-----|
| Corpo | 15px / 1.5 | 400 | ink |
| H1 | 28 a 32px / 1.12, letter-spacing -0.015em | 700 | ink (ou teal-500 em documentos) |
| H2 | 20 a 22px | 700 | ink |
| H3 | 16px | 700 | purple-500 |
| Label / eyebrow | 12px, uppercase, letter-spacing 0.08em | 600 | teal-500 |
| Texto secundário | 13px | 400 | steel |
| Mono (códigos, PINs) | 12 a 14px | 500 | fog / ink |

---

## 3. Forma

| Token | Valor |
|-------|-------|
| radius | 6px (padrão) · 10px (lg: botões, inputs) · 14px (xl: cartões) · 20px (2xl: modais) |
| shadow-sm | `0 1px 2px rgba(14,17,18,.06), 0 1px 1px rgba(14,17,18,.04)` |
| shadow-md | `0 4px 12px rgba(14,17,18,.06), 0 1px 2px rgba(14,17,18,.04)` |
| shadow-lg | `0 14px 32px rgba(14,17,18,.08), 0 2px 4px rgba(14,17,18,.04)` |
| focus ring | `0 0 0 3px rgba(31,110,120,.28)` |
| largura máxima | 1280px (container) · 880px (conteúdo) |
| transições | 120ms (fast) · 180ms (base) · 320ms (slow), easing `cubic-bezier(.2,0,0,1)` |

---

## 4. Componentes base

- **Botão primário:** fundo teal-500, texto branco, 600, radius 10px, padding 11px 16px; hover teal-600; foco com ring.
- **Botão secundário (ghost):** fundo branco, borda mist, texto ink; hover fundo paper.
- **Botão destrutivo:** fundo danger, texto branco. Só para excluir/apagar.
- **Input / textarea / select:** fundo branco, borda mist, radius 10px, padding 11px 12px; foco borda teal-500 + ring.
- **Cartão:** fundo branco, borda cloud, radius 14px, padding 22px, shadow-sm.
- **Tabela:** cabeçalho fundo teal-500 com texto branco 600; linhas alternadas teal-50; bordas mist; total fundo cloud em negrito.
- **Chip:** fundo teal-50, texto teal-700, radius 999px, 12px.
- **Mensagens:** sucesso em success, erro em danger, 13px.

## 5. Tema

Padrão é **claro** (fundo paper, cartões brancos). Fundo escuro (graphite) só em header/rodapé de site ou telas de totem/kiosk. Não criar tema escuro "por estilo".

## 6. Logo

- Fundo claro: `logo-dark.png` (símbolo colorido + texto escuro).
- Fundo escuro: `logo-light.png`.
- Só o símbolo (`symbol.png`) em espaços pequenos: cabeçalho de app, favicon, avatar.
- Não recolorir, não distorcer, não colocar sobre fundo teal ou roxo sem área de respiro.

## 7. Tom de voz na interface

Português do Brasil, direto, profissional. Sem exclamação em excesso, sem "marketês".
Mensagens de erro dizem o que fazer ("Digite o PIN", "Tempo esgotado. Digite o PIN para abrir novamente.").
