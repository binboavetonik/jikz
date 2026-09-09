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

Auto-sized nodes (no `width`/`height`) measure their text, and so do
labels and `{ fit: true }` viewBoxes. **Measurement is deterministic:
the same picture measures the same in Node, a worker and the browser**,
so an SSR render and the client render agree and the diagram does not
reflow on hydration.

That works because the default backend is a built-in table of
per-character advance widths (the Adobe core-14 AFM metrics), not the
host's font engine. It is exact for Helvetica, Arial and Liberation Sans
— which are metrically compatible with each other — for Times New Roman
and Nimbus Roman, and for any Courier clone; for other faces it is an
estimate from the same generic family.

If you render only in the browser and use a webfont whose metrics differ
from those, you can opt into measuring the font the browser actually
resolved:

```ts
import { setTextMeasurementBackend } from '@ozan.e/jikz'

setTextMeasurementBackend('canvas')   // browser-only; breaks SSR agreement
```

Don't do that if anything renders outside a DOM: canvas measurement is
unavailable there, so the two environments would disagree again — which
is exactly the bug the default avoids. (Earlier versions picked canvas
automatically whenever a `document` existed, so SSR and client output
disagreed by construction.)

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
