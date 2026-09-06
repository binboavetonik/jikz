# jikz documentation

A TikZ-inspired coordinate and drawing library for
JavaScript/TypeScript. These docs follow the TikZ manual's model:
concepts explained once, tutorials that teach by narrative, and a
cookbook organized by task.

## Concepts

Start here — each page is short and load-bearing:

1. [**TikZ → jikz mapping**](concepts/tikz-mapping.md) — the
   translation table. If you know TikZ, this is your five-minute
   onboarding.
2. [**Coordinate system**](concepts/coordinate-system.md) — SVG screen
   space: y down, clockwise angles, 270° = north. Porting rules for
   math-convention code.
3. [**Two API levels**](concepts/two-api-levels.md) — declarative
   `picture()` registry vs imperative `SVGRenderer` escape hatch.
4. [**ViewBox, sizing & fit**](concepts/viewbox-and-fit.md) — fixed
   frames vs TikZ-style auto-sizing with `{ fit: true }`.
5. [**Node, SSR & browser**](concepts/node-ssr-browser.md) — string
   output anywhere; KaTeX, text measurement, and what needs a DOM.

## Examples

The [example gallery](../examples/) is 50 self-contained,
type-checked, snapshot-tested modules — browse them on the demo page
(`npm run dev` → `/demo/index.html`) or read the source directly.

## Coming next

- **Tutorials** — a guided path from "hello, circle" to full diagrams
  (Phase 2 of the documentation plan).
- **Reference** — per-module API pages, generated where possible
  (Phase 3).
- **Cookbook** — the gallery re-organized by task: math, physics,
  graphs, CS, decorations (Phase 4).
