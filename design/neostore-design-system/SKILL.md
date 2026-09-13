---
name: neostore-design
description: Use this skill to generate well-branded interfaces and assets for NEOSTORE (tecnologia para eventos), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping commercial proposals, marketing pages, internal dashboards, slide decks, and event-tech communications.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files. The README is the authoritative reference for the brand: voice, palette, typography, spacing, logo rules, iconography, and surface-by-surface recommendations.

When working on visual artifacts (slides, mocks, throwaway prototypes), copy assets out of `assets/` and `colors_and_type.css` into your output, and produce static HTML files for the user to view. The `ui_kits/` and `slides/` folders contain ready-to-fork starting points — prefer copying those components over reimplementing from scratch.

When working on production code, copy assets and read the rules here to become an expert in designing with this brand. Always import `colors_and_type.css` for tokens.

If the user invokes this skill without any other guidance, ask them what they want to build (proposta comercial, landing page, deck institucional, dashboard interno, post de LinkedIn, e-mail signature, etc.), then ask 3–5 follow-up questions to scope, then act as an expert designer who outputs HTML artifacts or production code, depending on the need.

**Critical brand do's and don'ts** (full list in README.md):
- Teal is the workhorse. Purple is the accent — one element per screen, max.
- The wordmark is the only display-scale type. Manrope supports, never competes.
- No emoji. No exclamation points. No bouncy animation. No glassmorphism.
- Tone is direct, calm, technical. Portuguese (pt-BR) by default.
- Real backstage / equipment photography over stock-photo people.
