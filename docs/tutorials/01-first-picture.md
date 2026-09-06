# Tutorial 1: Your first picture

In which we draw three shapes, learn the four path verbs, and discover
that a picture is just a string waiting to happen.

## The goal

A blue ball, a green box, and a red diagonal. In TikZ you'd write:

```tex
\filldraw[blue, fill=blue!20] (0,0) circle (1);
\filldraw[green, fill=green!20] (2,0) rectangle (4,2);
\draw[red] (4.5,0) -- (6,2);
```

## Step by step

Everything starts with `picture()` — the named registry that collects
what you want drawn:

```ts
import { picture, circle, rect, line, point } from 'jikz'

const pic = picture()
```

Geometry in jikz is **inert data** until a verb paints it — TikZ's
`\path` vs `\draw` distinction, built into the type system. Creating
a circle draws nothing:

```ts
const ball = circle(point(60, 90), 40)   // just data
const box  = rect(130, 50, 80, 80)
const diag = line(point(230, 30), point(290, 150))
```

The verbs are the four TikZ path modes:

```ts
pic.filldraw(ball, { style: { stroke: '#2563eb', strokeWidth: 2, fill: '#dbeafe' } })
pic.filldraw(box,  { style: { stroke: '#16a34a', strokeWidth: 2, fill: '#dcfce7' } })
pic.draw(diag,     { style: { stroke: '#dc2626', strokeWidth: 2 } })
```

| verb | TikZ | paints |
|---|---|---|
| `pic.draw(g)` | `\draw` | stroke only |
| `pic.fill(g)` | `\fill` | fill only |
| `pic.filldraw(g)` | `\filldraw` | both |
| (no verb yet) | `\path` | nothing |

## Getting it out

Two output paths, same options:

```ts
// Anywhere — Node, SSR, tests:
const svg = pic.toSVG({ width: 300, height: 180 })

// Browser — attach a live tree:
pic.mount(document.getElementById('out')!, { width: 300, height: 180 })
```

`toSVG()` returns a **string**. No DOM, no canvas, no renderer process
— which is why every example in this repo is snapshot-tested in plain
Node. (Full story: [Node, SSR & browser](../concepts/node-ssr-browser.md).)

## What to notice

- **Statements, not a scene graph.** Each `pic.draw(...)` is a TikZ
  statement. Order = paint order.
- **Styles are data.** `{ style: { stroke, strokeWidth, fill } }` maps
  to SVG presentation attributes with TikZ vocabulary layered on top
  (dash names, patterns, `thick` shortcuts — Tutorial 6).
- **Coordinates are already screen space** — y grows down. If that
  sentence didn't bother you, skip [Coordinate
  system](../concepts/coordinate-system.md) until it does.

## Try it

This tutorial's figure is [`examples/geometry.ts`](../../examples/geometry.ts)
— type-checked and snapshot-tested. Change a color, run
`npm run dev`, and the demo card updates.

Next: [Points & coordinates](./02-points-and-coordinates.md) —
stop hand-placing everything.
