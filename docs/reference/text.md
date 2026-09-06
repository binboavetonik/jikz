# Reference: text & math

Text rendering and measurement. Full API: [generated
reference](../api/) (`npm run docs:api`).

## Measuring — `measureText(text, options?)`

```ts
measureText('hello', { fontSize: 14, fontFamily: 'sans-serif' })
// → { width, height }
```

Two backends: canvas `measureText` in the browser (real advance
widths), a font-metrics table elsewhere (deterministic estimate).
Multi-line text (`\n`): width = widest line, height =
`lines × fontSize × LINE_HEIGHT` (1.25). This powers auto-sized nodes.

## Placing — `placeText(anchor, text, options?)`

Compass/directional placement of bare text around a point (TikZ
`\node[below right] at (p) {h}` = `pic.text(p, 'h', { at: 'south
east' })`). `estimateLabelSize` backs label-collision avoidance.

## Math — `$...$` via KaTeX

Any `$...$` in node text or labels renders through KaTeX (optional
peer) inside an SVG `foreignObject`:

```ts
import { SVGRenderer, katexAdapter } from '@ozan.e/jikz'
import katex from 'katex'

new SVGRenderer(undefined, undefined, { textRenderer: katexAdapter(katex) })
```

Without KaTeX: plain italic fallback. Works in Node too (the markup is
a string either way). See [Node, SSR &
browser](../concepts/node-ssr-browser.md) and
[`examples/katex-math.ts`](../../examples/katex-math.ts).

## Shape labels — `src/text/shapeLabels.ts`

The machinery behind `{ label: { text, at, distance } }` on draw verbs
and node `labels`: boundary-aware placement with border-to-border
gaps. Covered conceptually in [tutorial
3](../tutorials/03-nodes-anchors-labels.md).
