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

## Tutorials

A guided path — each builds one small figure and one set of ideas:

1. [Your first picture](tutorials/01-first-picture.md) — the four path
   verbs, and why a picture is just a string.
2. [Points & coordinates](tutorials/02-points-and-coordinates.md) —
   calc operators: `toward`, `horAt`/`verAt`, `polar`, named coordinates.
3. [Nodes, anchors & labels](tutorials/03-nodes-anchors-labels.md) —
   compass anchors, label distance, auto-sizing.
4. [Edges & routing](tutorials/04-edges-and-routing.md) — boundary
   anchoring, bends, out/in, loops, arrow tips.
5. [Paths & pen statements](tutorials/05-paths-and-pen.md) — `path()`
   vs `pic.pen()`, segment-riding labels, mid-statement restyling.
6. [Styling](tutorials/06-styling.md) — dash vocabulary, patterns,
   gradients, shadows, double lines, typed option arrays.
7. [Layouts](tutorials/07-layouts.md) — chain, matrix, tree,
   `nodeCircle`, `rectFit`.

## Examples

The [example gallery](../examples/) is 50 self-contained,
type-checked, snapshot-tested modules — browse them on the demo page
(`npm run dev` → `/demo/index.html`) or read the source directly.

## Reference

Per-module pages — intros with the key tables, linking into the
generated API (`npm run docs:api` → `docs/api/`):

- [picture](reference/picture.md) — the main registry API
- [core](reference/core.md) — Point, Transform, anchors
- [geometry](reference/geometry.md) — shapes, conics, intersections, plotting
- [node](reference/node.md) — NodeOptions, labels, anchors
- [path](reference/path.md) — builder, operations, decorations
- [render](reference/render.md) — complete style-key table, presets, layers
- [layout](reference/layout.md) — chain, matrix, tree
- [text & math](reference/text.md) — measurement, KaTeX
- [ext/circuits](reference/ext-circuits.md) — the circuits extension

## Coming next

- **Cookbook** — the gallery re-organized by task: math, physics,
  graphs, CS, decorations (Phase 4).
