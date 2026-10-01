# Reference: text & math

Text rendering and measurement. Full API: <a href="../api/index.html" target="_blank">generated reference</a> (`npm run docs:api`).

## Measuring — `measureText(text, options?)`

```ts
measureText('hello', { fontSize: 14, fontFamily: 'sans-serif' })
// → { width, height }
```

Deterministic everywhere by default: the same text, font and size
measure the same in Node, a worker and the browser, so SSR output and
client output agree. Widths come from a built-in per-character table
(Adobe core-14 AFM metrics) — exact for Helvetica/Arial/Liberation Sans,
Times New Roman/Nimbus Roman and Courier clones, an estimate for other
faces in the same generic family. Bold widens proportional faces by 5%;
full-width forms (CJK, kana, Hangul) advance a whole em.

Multi-line text (`\n`): width = widest line, height =
`lines × fontSize × LINE_HEIGHT` (1.25). This powers auto-sized nodes,
label placement and `{ fit: true }` viewBoxes.

`setTextMeasurementBackend('canvas')` switches to the browser's own
`<canvas>` measurement — more accurate for unusual webfont stacks, but
DOM-only, so it makes SSR and client renders disagree. See
[Node, SSR & browser](../concepts/node-ssr-browser.md#text-measurement).
`getTextMeasurementBackend()` reports the current setting.

## Placing — `placeText(anchor, text, options?)`

Compass/directional placement of bare text around a point (TikZ
`\node[below right] at (p) {h}` = `pic.text(p, 'h', { at: 'south
east' })`). `estimateLabelSize` backs label-collision avoidance.

## Math — `$...$` via KaTeX

A label that is wholly `$...$` renders through the math renderer you
**inject** — jikz never reads a global `katex` or `MathJax`, so
loading one on the page is not enough:

```ts
import katex from 'katex'
import { picture, katexAdapter, setDefaultMathRenderer } from '@ozan.e/jikz'

picture({ shapes, mathRenderer: katexAdapter(katex) })   // this picture
pic.toSVG({ width, height, mathRenderer })                // this render
setDefaultMathRenderer(katexAdapter(katex))               // every picture in the process
new SVGRenderer(undefined, undefined, { mathRenderer: katexAdapter(katex) })  // renderer level
```

`katexAdapter` puts KaTeX's HTML in a `foreignObject` — right for a
live page that loads `katex.min.css`; `mathjaxAdapter` inlines
MathJax's SVG glyph paths — right for anything else an SVG goes. See
[which renderer](../concepts/tikz-mapping.md#which-renderer-and-why-it-matters).

Math is text: it takes the colour and size plain text would have in
its place — `textStyle.fill` (or a bare text's `style.fill`), else the
pen's stroke, else black — and never the page's CSS `color`, so a
formula reads the same on a dark-themed page as on a light one.

Without a renderer: plain italic fallback, dollar signs and all. Works in Node too (the markup is
a string either way). See [Node, SSR &
browser](../concepts/node-ssr-browser.md) and
[`examples/katex-math.ts`](../../examples/katex-math.ts).

## Shape labels — `src/text/shapeLabels.ts`

The machinery behind `{ label: { text, at, distance } }` on draw verbs
and node `labels`: boundary-aware placement with border-to-border
gaps. Covered conceptually in [tutorial
3](../tutorials/03-nodes-anchors-labels.md).
