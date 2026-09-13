# Two API levels

jikz has exactly two layers, and you pick per picture — not per
project.

## Level 1: `picture()` — the declarative registry

The API you want 95% of the time. A picture is a **named registry**
plus TikZ's path verbs:

```ts
import { picture, point, basicShapes } from 'jikz'

const pic = picture({ shapes: basicShapes })
  .node('A', { at: point(60, 60),  shape: 'circle',    width: 60, height: 60, text: 'A' })
  .node('B', { at: point(220, 60), shape: 'rectangle', width: 90, height: 50, text: 'B' })
  .edge('A', 'B', { arrowEnd: 'stealth', label: 'hello' })

pic.toSVG({ width: 280, height: 120 })   // string — Node, SSR, tests
pic.mount(document.getElementById('out')!) // live tree — browser
```

What you get for staying at this level:

- **Names, not variables.** `'A.north'`, `'B.270'`, bare `'A'`
  (auto-boundary) — endpoints resolve at compile time.
- **Boundary-aware edges** between named nodes.
- **Named coordinates** — `pic.coordinate('P', p)`, then `'P'` is a
  valid endpoint anywhere.
- **Fluent pen statements** — `pic.pen()` with labels riding segments.
- **Auto-fit** — `{ fit: true }` sizes the viewBox from content.
- **Lazy expansion** — order your statements for readability; the
  picture compiles in registration order at `toSVG()`/`mount()`.

## Level 2: `SVGRenderer` — the imperative escape hatch

When you need something `picture` doesn't model — z-order control,
custom layer stacks, or incremental rendering into an existing tree —
drop to the renderer:

```ts
import { line, circle, point, SVGRenderer } from 'jikz'

const r = new SVGRenderer()
r.defineLayers(['background', 'main', 'foreground'])

r.setLayer('background')
r.renderCircle(circle(point(150, 80), 60), { style: { fill: '#fef3c7', stroke: 'none' } })

r.renderLine(line(point(30, 80), point(270, 80)), {
  style: { stroke: '#334155', strokeWidth: 1.5, doubleLine: { spacing: 5 } },
})

r.onLayer('foreground', () => {
  r.renderCircle(circle(point(150, 80), 8), { style: { fill: '#dc2626', stroke: 'none' } })
})

r.builder.mount(container, { width: 300, height: 160 })
```

The renderer takes geometry **objects**, not names — `circle(p, r)`,
not `'A'`. Registry semantics (string anchors, auto-boundary) live at
Level 1 by design.

## The seam between them

`picture` compiles *through* `SVGRenderer` — Level 1 is sugar, not a
separate engine. Consequences:

- Styling options are identical at both levels (`style`,
  `textStyle` — same `StyleSpec`).
- Anything renderable (`Renderable`) works at both levels.
- You can build a picture's geometry, then hand individual pieces to
  a renderer for special treatment.

## Rule of thumb

| Need | Level |
|---|---|
| Nodes + edges + labels, any diagram | `picture()` |
| Copy-pastable TikZ-style code | `picture()` |
| Node/SSR string output | `picture().toSVG()` |
| Named layers / paint order | `SVGRenderer` |
| Layout builders (`chain`, `matrix`, `tree`) | either — they return geometry you render yourself |
| Custom shapes via `defineShape` | either — a kind works in `pic.node` by value, or by name once the set is passed to `picture({ shapes })` |
