# Node, SSR & browser

jikz is **string-first**: rendering compiles a picture to an SVG
string through its own `SVGBuilder`. The DOM is only involved when you
explicitly ask for it.

## The two output paths

| | `toSVG(options)` | `mount(el, options)` |
|---|---|---|
| Returns | `string` | live SVG element in `el` |
| Needs DOM | no | yes |
| Runs in | Node, workers, SSR, tests | browser |
| KaTeX labels | rendered into `foreignObject` markup | same, plus live |

Both take the same options (`{ width, height }` or `{ fit, padding }`)
and produce identical markup.

## Node / SSR

```ts
import { picture, point } from '@ozan.e/jikz'

const svg = picture()
  .node('A', { at: point(60, 60),  shape: 'circle',    width: 60, height: 60, text: 'A' })
  .node('B', { at: point(200, 60), shape: 'rectangle', width: 80, height: 50, text: 'B' })
  .edge('A', 'B', { arrowEnd: 'stealth' })
  .toSVG({ fit: true, padding: 8 })

// Express/Fastify/Next route handler, static-site generator, test:
res.setHeader('Content-Type', 'image/svg+xml')
res.end(svg)
```

No `document`, no canvas, no headless browser — the string *is* the
artifact. This is what makes the example gallery snapshot-testable:
every card in `examples/` renders into jsdom in CI.

## Text measurement

Auto-sized nodes (no `width`/`height`) measure their text:

- **Browser**: an offscreen `<canvas>` 2D context — real advance
  widths for the actual font.
- **Node**: a font-metrics table (average advance per family) —
  coarse but deterministic. Treat auto-size in Node as an estimate;
  pass explicit `width`/`height` when pixel-perfect sizing matters in
  SSR output.

## KaTeX (optional peer)

Any `$...$` text renders through [KaTeX](https://katex.org) inside an
SVG `foreignObject`:

```sh
npm install katex   # optional
```

```ts
import { SVGRenderer, katexAdapter } from '@ozan.e/jikz'
import katex from 'katex'

const renderer = new SVGRenderer(undefined, undefined, {
  textRenderer: katexAdapter(katex),
})
```

- **Without KaTeX**: `$...$` falls back to plain italic text. The
  diagram renders either way — KaTeX only upgrades fidelity.
- **In the browser**, loading KaTeX from a CDN `<script>` tag also
  works: jikz picks up the global.

## Workers & edge runtimes

`toSVG` has zero runtime dependencies and touches no platform APIs
outside text measurement (which degrades gracefully). Cloudflare
Workers, Deno, Bun, Vercel Edge — all fine.

## What does NOT work headless

- `mount()` (needs a DOM element),
- `getBoundingClientRect`-style queries on the output (it's a string),
- interactive demos like the slider in the Snell example — those are
  page code, not library code.
