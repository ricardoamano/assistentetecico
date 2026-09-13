# NEOSTORE — Design System

**NEOSTORE — Tecnologia para eventos**
São Paulo · Em operação desde 2007.

NEOSTORE rents and operates audio, video, lighting and event-tech equipment for corporate events: conventions, congresses, brand activations, institutional events. The brand stands behind the scenes — confiable, técnica, sem complicação. This system is built to look the part: an experienced, mature, technical company that solves big problems backstage, not a generic SaaS startup or a flashy creative agency.

> Tecnologia para eventos corporativos sem complicação.

---

## Source materials

- **Logo files** (provided): 12 PNGs covering vertical/horizontal × colored/monochrome × light/dark/transparent. See `assets/`.
- **Brand brief** (provided): direction on tone, palette intent, typography (Manrope), graphic system, do's and don'ts.

No codebase, Figma, or existing site was provided — this system is built from the logo + brief upward. Where existing UI patterns are missing, we chose the most conservative, technical interpretation rather than inventing new visual motifs.

---

## Strategic logo analysis

The logo has three distinct signals we extend through the system:

1. **Two connected modules** — the symbol reads as two stacked, interlocked frames. This is a *connection* metaphor: equipment + operation, planning + execution, signal source + display. We use this geometry as bullets, dividers, and section markers throughout the system.

2. **Geometric construction with softened corners** — the modules have crisp angles but ~14% rounded corners. Not pillowy, not razor-sharp. We mirror this in `--radius-md: 6px` for components and `--radius-lg: 10px` for cards.

3. **Two-color hierarchy** — teal carries the institutional weight (the larger, foreground module), purple is the accent (smaller, behind). We honor that ratio: **teal is the workhorse, purple is the highlight**. Using purple at >25% of any surface breaks the logo's visual hierarchy.

4. **Bold lowercase wordmark + thin tagline** — the wordmark is heavy, geometric, lowercase. The tagline (`tecnologia para eventos`) is delicate. This contrast — confident statement + technical caveat — sets the writing voice for the whole brand.

### Where the tagline belongs (and where it doesn't)

The tagline strokes are thin and disappear under ~24px of vertical logo height. **Never use the tagline lockup below 32px wordmark height** (vertical) or 24px (horizontal). At small sizes, drop to the wordmark-only or symbol-only versions.

---

## Index — what's in this folder

```
README.md                  ← you are here
SKILL.md                   ← agent skill manifest
colors_and_type.css        ← all design tokens (colors, type, spacing, radius, shadow)

assets/                    ← logo lockups in every required combination
  logo-horizontal-color-light.png
  logo-horizontal-color-dark.png
  logo-horizontal-color-transparent.png
  logo-horizontal-mono-light.png
  logo-horizontal-mono-dark.png
  logo-horizontal-mono-transparent.png
  logo-vertical-color-light.png
  logo-vertical-color-dark.png
  logo-vertical-color-transparent.png
  logo-vertical-mono-light.png
  logo-vertical-mono-dark.png
  logo-vertical-mono-transparent.png

preview/                   ← Design System tab cards (typography, color,
                             component specimens). One concept per card.

ui_kits/
  web/                     ← marketing site recreation (hero, services, footer)
  proposal/                ← B2B commercial proposal template (PDF-bound)
  dashboard/               ← internal operations webapp

slides/                    ← apresentação institucional template
```

---

## Content fundamentals

NEOSTORE writes like an experienced operator on the radio: short, direct, calm. Confident without bravado. The voice should sound like the company already has a 200-event year under its belt this season — because it does.

### Voice rules

- **Portuguese (pt-BR)** is the default. English appears in technical specs and product names only.
- **Lowercase** the wordmark inline (`neostore`, never NEOSTORE in body copy — exception: legal/contractual). Headlines use sentence case, not Title Case.
- **You-form is `você`** when addressing the client; first-person plural (`nós`, `nossa equipe`) when speaking for the company. Avoid the imperial `nós` for self-aggrandizement.
- **Active voice, present tense** for capabilities. Past tense for proof points only.
- **No exclamation points.** No emoji. No em-dashes for drama — use periods.
- **Numbers as numerals** for technical specs (`12 painéis de LED`, `4K @ 60fps`, `linha XLR balanceada`).

### Vocabulary — use

operação · estrutura · execução · entrega · planejamento técnico · suporte em campo · equipe técnica · racks · linha de sinal · redundância · backup · pré-produção · run-of-show · briefing · cronograma · checklist · áudio, vídeo, iluminação, LED, projeção, transmissão, credenciamento, interatividade

### Vocabulary — avoid

revolucionar · disruptivo · mágico · inesquecível · de outro nível · futuro dos eventos · soluções 360º · experiência única · inovação sem limites · somos os melhores · superar expectativas

### Approved sample lines

- "Tecnologia para eventos corporativos sem complicação."
- "Soluções técnicas para eventos que não podem falhar."
- "Áudio, vídeo, iluminação e tecnologia com operação confiável."
- "Estrutura, precisão e parceria em cada entrega."
- "Do planejamento à execução, a tecnologia certa para o seu evento."
- "Bastidor técnico bem resolvido para o evento acontecer melhor."
- "Equipamentos, equipe e operação no mesmo ritmo."

### Headline patterns

- **Capability + outcome:** `Áudio profissional. Operação sem ruído.`
- **Two-part with period:** `Planejamento técnico. Execução em campo.`
- **Number-led proof:** `18 anos operando bastidores corporativos.`
- **Negative space (what we don't do):** `Sem improvisação. Sem surpresas no dia.`

---

## Visual foundations

### Colors

Built directly from the logo. See `colors_and_type.css` for the full scale and tokens.

| Role | Token | Hex | RGB | CMYK ~ |
|---|---|---|---|---|
| Brand teal (primary) | `--neo-teal-500` | `#1F6E78` | 31, 110, 120 | 88 / 47 / 47 / 27 |
| Brand purple (accent) | `--neo-purple-500` | `#4A1F4F` | 74, 31, 79 | 75 / 95 / 35 / 40 |
| Ink (premium ground) | `--neo-ink` | `#0E1112` | 14, 17, 18 | 70 / 60 / 55 / 90 |
| Graphite (dark surface) | `--neo-graphite` | `#1A1F22` | 26, 31, 34 | 70 / 55 / 50 / 80 |
| Steel (mid) | `--neo-steel` | `#4A5256` | 74, 82, 86 | 60 / 45 / 40 / 50 |
| Fog (muted text) | `--neo-fog` | `#8C9498` | 140, 148, 152 | 45 / 35 / 30 / 15 |
| Cloud (border) | `--neo-cloud` | `#E2E5E7` | 226, 229, 231 | 12 / 8 / 8 / 0 |
| Paper (light surface) | `--neo-paper` | `#F4F5F6` | 244, 245, 246 | 4 / 3 / 3 / 0 |

**Status:** `--neo-success #2E8F5E` · `--neo-warning #C28A1E` · `--neo-error #B83A3A` · `--neo-info` = teal-500.

#### When to use each color

- **Teal** — primary CTAs, links, selected states, key data, brand bands. Default brand color in 90% of surfaces. Conveys confiança técnica.
- **Purple** — accent only. One element per screen, max. Use for: secondary CTAs in pairings (after a teal primary), single highlight numbers, the second module of the symbol when used decoratively. **Never for body text. Never as a background fill larger than a card.**
- **Ink / Graphite** — institutional surfaces (proposals, executive decks, technical dashboards). When seriedade is the primary message, go dark.
- **White / Paper** — daily working surfaces, marketing site, documentation, e-mail. Default unless dark is specifically called for.
- **Mono (B&W) versions** — fax, single-color print (uniforms with limited thread colors), engraving, low-fidelity stamps, partner co-branding where color clash is risky.

#### Combinations to avoid

- Teal text on purple background (and vice versa) — vibrating contrast, fails AA.
- Purple-on-teal gradients — reads "tech-startup", off-brand.
- Pure black (`#000`) — use `--neo-ink` instead; pure black looks cheap next to the warm graphite.
- More than two functional accent colors on the same screen.

### Typography

**Manrope** is the system. Six weights in use: 300, 400, 500, 600, 700, 800.

- The **logo wordmark** is the only display-scale type that "shouts". Manrope supports it — never recreates it.
- **Headings**: Manrope 700/800 with `letter-spacing: -0.015em` (tightens the geometric letterforms at large sizes).
- **Body**: Manrope 400, 15px, line-height 1.5. 17px on long-form documents and proposals.
- **Eyebrows / labels**: Manrope 600, 12px, uppercase, `letter-spacing: 0.08em`. Always teal.
- **Specs / data**: **JetBrains Mono** 400/500 — for equipment IDs, timecodes, channel counts, IPs, anything quasi-technical that should look engineered.

> **Substitution flag:** Manrope is loaded from Google Fonts. JetBrains Mono is the chosen monospace for technical data display — flag if you'd prefer IBM Plex Mono or another option.

### Spacing & rhythm

4px base. Layouts use generous breathing room — section padding starts at `--space-16` (64px) on desktop, `--space-10` (40px) on mobile. Cards have `--space-6` (24px) interior padding minimum.

Grid: 12-column with `--grid-gutter: 24px`. Container caps at `--container-xl: 1280px`. Hero sections may break the grid; everything else respects it.

### Backgrounds

- **Default:** flat `--bg-canvas` (paper or graphite). No gradients, no textures.
- **Dark hero:** flat `--neo-ink` with the symbol echoed at 4–6% opacity as a *very large* background watermark, anchored bottom-right or top-right.
- **Imagery:** real photos of events, racks, LED walls, FOH operations. Always with a `--neo-ink` overlay at 40–60% opacity if text sits over them. No stock-photo people grinning.
- **Pattern:** the symbol's two-module geometry can be tiled at 24–48px as a 6%-opacity wallpaper for institutional decks. Use sparingly — a watermark, not a wallpaper.

### Animation

Restrained. Animation should reinforce *precision*, not delight.

- **Easing:** `--ease-standard` (`cubic-bezier(0.2, 0, 0, 1)`) — feels mechanical, like a fader settling.
- **Durations:** 120ms (micro), 180ms (default), 320ms (page-level).
- **No bounce. No overshoot. No spring physics.**
- **Hover:** color shift (`--brand-primary` → `--brand-primary-hover`, one step darker on light surfaces, one step lighter on dark).
- **Press:** scale 0.98, no color change. Snap back at 120ms.
- **Page transitions:** 12–16px upward translate + opacity, 320ms. Never slide, never rotate.

### Borders & shadow

- Borders carry most of the heavy lifting. **1px solid `--border-default`** on cards, **0.5px `--border-subtle`** on internal dividers when supported.
- Shadow is a secondary tool. `--shadow-sm` for raised inputs, `--shadow-md` for menus, `--shadow-lg` only for modals. **No shadow on cards by default** — the border defines them.
- No inner shadows. No glow.

### Corner radii

- `--radius-md: 6px` is the default for buttons, inputs, badges.
- `--radius-lg: 10px` for cards.
- `--radius-xl: 14px` only for the largest hero containers — matches the logo's own corner softness.
- `--radius-pill` for tag-style filters and status pills.

### Transparency & blur

Used very sparingly. Only acceptable cases:
- **Backdrop blur on sticky headers** over imagery: 12px blur + `rgba(14, 17, 18, 0.72)`.
- **Image overlays** for legibility: solid `--neo-ink` at 40–60% opacity, no blur.
- **Never** glassmorphism cards. Never frosted modals.

### Imagery vibe

Cool-leaning, slightly desaturated, contrast preserved. Photography of equipment-in-use beats portraits. When people appear, prefer hands and operators at consoles over smiling faces. Treat with a `--neo-graphite` 8–12% multiply if the source is too warm.

### Hover/press conventions

| State | Light surface | Dark surface |
|---|---|---|
| Hover (button) | bg → `--brand-primary-hover` (one step darker) | bg → `--brand-primary-hover` (one step lighter) |
| Hover (link) | underline appears, color steady | underline appears, color steady |
| Press | `transform: scale(0.98)` | same |
| Focus | 3px ring `rgba(31,110,120,0.28)` outside the element | same teal ring, slightly higher alpha |
| Disabled | opacity 0.4, cursor not-allowed | opacity 0.4 |

---

## Iconography

NEOSTORE has no proprietary icon set. We use **Lucide** (lucide.dev) — semi-linear, 1.75px stroke, slightly rounded corners — coherent with the logo's geometry. Loaded from CDN: `https://unpkg.com/lucide-static@latest/icons/<name>.svg`.

Categories used most: `volume-2`, `video`, `lightbulb`, `monitor`, `cast`, `radio`, `wifi`, `qr-code`, `cpu`, `cable`, `wrench`, `truck`, `users`, `calendar-check`, `shield-check`, `signal`.

**Icon rules:**
- Stroke 1.75px (Lucide default 2px is acceptable; never lighter than 1.5px).
- Color: `currentColor` so they inherit text color. Default size 20px in body, 16px in dense UI, 24px+ in hero contexts.
- **No filled-style icons.** No duotone.
- **No emoji.** Anywhere.
- **No decorative icons** — every icon must label or anchor information. If you can remove it without losing meaning, remove it.

The two-module symbol from the logo can stand in as a brand bullet `▰▱` at small sizes (use the symbol PNG / SVG directly when available).

---

## Logo usage rules

### Versions and when to use each

| Version | File | Use |
|---|---|---|
| Horizontal color (light bg) | `assets/logo-horizontal-color-light.png` | Default. Site headers, document headers, e-mail signature. |
| Horizontal color (dark bg) | `assets/logo-horizontal-color-dark.png` | Dark hero sections, presentation title slides. |
| Vertical color (light bg) | `assets/logo-vertical-color-light.png` | Square / portrait formats — Instagram, badges. |
| Vertical color (dark bg) | `assets/logo-vertical-color-dark.png` | Same on dark surfaces. |
| Horizontal mono | `assets/logo-horizontal-mono-*.png` | Single-color print, fax, engraving, partner co-brand. |
| Vertical mono | `assets/logo-vertical-mono-*.png` | Same in portrait. |
| Symbol only | (extract from any color file) | Avatars, favicons, watermarks. Below 24px logo height. |

### Clear space

Minimum protection on all sides equals the height of the lowercase `o` in the wordmark. Double that for premium contexts (cover slides, executive proposals).

### Minimum size

- **Horizontal lockup with tagline:** 24px height (digital), 12mm (print). Below this, drop the tagline.
- **Horizontal wordmark only:** 16px (digital), 8mm (print).
- **Symbol only:** 12px (digital), 6mm (print). Favicon use accepted at 16px.

### Misuse — never

- Never recolor the symbol outside the approved teal+purple, all-white, or all-black versions.
- Never separate the two modules of the symbol.
- Never stretch, skew, rotate, or apply effects (drop shadow, outline, glow, 3D).
- Never put the color logo on backgrounds outside `--neo-paper`, `--neo-white`, `--neo-ink`, `--neo-graphite`. On photos, use the all-white or all-black mono version.
- Never set the wordmark in a different font.

### Tagline rule

The tagline `tecnologia para eventos` is thin. Use the with-tagline lockup only when:
- The wordmark renders ≥ 32px tall (vertical) / 24px tall (horizontal), AND
- The viewer doesn't already see the tagline somewhere else in the layout.

Otherwise, drop to the no-tagline lockup. Don't make the tagline illegible.

---

## Recommendations by surface

### Digital (site / webapp)

- Light surface by default. Dark mode optional via `[data-surface="dark"]`.
- Body 15–17px Manrope. Line length 65–80ch.
- CTAs are teal solid → graphite-outline secondary. Purple appears at most once per page, on a single accent.

### Print (proposals, signage)

- 17–19pt body in Manrope 400. Tighten leading slightly (1.4) to fit pages.
- Cover: full-bleed `--neo-ink` with horizontal-color-dark logo top-left and a single client-name / project-name moment large in the lower third.
- Headers/footers: 9pt eyebrow + page numerals in JetBrains Mono.

### Social media

- Posts run on `--neo-graphite` or `--neo-paper`, never both halves of a feed.
- LinkedIn carousels: use the symbol echo as a low-opacity watermark; no decorative icons; one statistic per slide.
- Stories: 9:16; allow real backstage imagery to dominate; logo small in a corner with safe-area respected.

### Commercial proposals

- Cover, divider, content-deep, content-list, comparison, scope, timeline, investment, contacts. See `slides/` and `ui_kits/proposal/`.
- Investment pages use mono spec-style typography for line items; teal for the total.

### Site & webapp

- Sticky header with backdrop blur over hero only.
- Sidebar nav for the dashboard; top-bar nav for the marketing site.
- Tables: zebra-stripe at 4% ink, never colored. Right-align numerics in JetBrains Mono.
