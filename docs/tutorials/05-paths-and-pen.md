# Tutorial 5: Paths & pen statements

In which we build one path from many segments — TikZ's single-`\draw`
idiom, with labels riding the pen.

## Two ways to build a path

**The builder** — assemble geometry, then hand it to a verb:

```ts
import { picture, path, point } from 'jikz'

const hill = path()
  .moveTo(point(30, 150))
  .curveTo(point(90, 20), point(210, 20), point(270, 150))
  .lineTo(point(270, 160))
  .lineTo(point(30, 160))
  .close()

picture().filldraw(hill, { style: { stroke: '#7c3aed', strokeWidth: 2, fill: '#ede9fe' } })
```

**The pen** — `pic.pen()` threads TikZ's implicit pen through one
statement. The difference from the builder: labels, named coordinates,
and restyling happen *mid-statement*, exactly like nodes inside a
TikZ `\draw`:

```ts
pic.pen({ style: { stroke: '#0f172a', strokeWidth: 1.6 } })
  .moveTo(40, 170)  .label('A', { at: 'south west' })   // node[below left]
  .lineTo(300, 170) .label('B', { at: 'south east' })
                    .label('c', { pos: 0.5, offset: -10 }) // node[midway, below]
  .lineTo(300, 90)  .label('C', { at: 'north east' })
  .close()
```

## The verb vocabulary

| pen method | TikZ inside `\draw` |
|---|---|
| `.moveTo(p)` | mid-statement move (pen up) — new subpath |
| `.lineTo(p)` | `-- (p)` |
| `.curveTo(c1, c2, p)` | `.. controls (c1) and (c2) .. (p)` |
| `.vhTo(p)` | `\|- (p)` — vertical, then horizontal |
| `.hvTo(p)` | `-\| (p)` — horizontal, then vertical |
| `.circularArcTo(r, largeArc, sweep, p)` | `arc(...)` — SVG endpoint parameterization |
| `.close()` | `-- cycle` |

Endpoints accept points, `[x, y]` tuples, or **names**:
`.moveTo('P').vhTo('Q')` is `\draw (P) |- (Q)`.

## TikZ's path operations

The pen speaks the whole TikZ path vocabulary, not only `--`:

```ts
pic.pen()
  .moveTo(0, 0).rectangle(40, 20)                 // rectangle (corner) — pen parks at the corner
  .moveTo(80, 10).circle(8)                       // circle (r) — pen stays put
  .moveTo(120, 10).arc({ start: 0, end: 180, radius: 10 })   // arc[start angle, end angle, radius]
  .moveTo(0, 40).grid(60, 70, { step: 10 })       // grid[step]
  .moveTo(80, 70).parabola(point(120, 40), { bend: point(100, 30) })
  .moveTo(140, 70).sin(point(160, 40)).cos(point(180, 70))
  .lineTo(rel(20, 0))                             // ++(20, 0)
  .node('end', { shape: 'circle', text: 'e' })    // a real named node at the pen
```

In a `frame: 'math'` picture the same calls take TikZ's numbers as
they are — `arc({ start: 0, end: 90, radius: 1 })` sweeps
counter-clockwise, `rel(1, 0)` steps one unit right.

## Labels: position vs segment

Two placement modes, matching TikZ's two node placements:

- `{ at: 'south west' }` — hangs on the **current pen position**,
  compass-style; the pen doesn't move.
- `{ pos: 0.5, offset: -10 }` — rides the **segment just drawn** by
  arc length (`pos`), pushed perpendicular (`offset`, left of travel).
  This is TikZ's `node[midway, below]`.

The [angle-marking example](../../examples/angle-marking.ts) uses
`pos`/`offset` on `circularArcTo` so KaTeX labels ride the arc itself.

## Naming & restyling mid-statement

```ts
pic.pen()
  .moveTo(30, 90) .coordinate('P')   // TikZ coordinate (P)
  .lineTo(170, 40).coordinate('Q')

pic.pen({ style: { stroke: '#2563eb' } })
  .moveTo(30, 130).lineTo(110, 130)
  .push({ style: { stroke: '#dc2626', strokeWidth: 2.5 } })  // restyle
  .lineTo(230, 130)                                          // compiles to a NEW path
```

`push(options)` splits the statement: subsequent segments compile to a
new path whose options inherit and override. One statement, mixed
dashed/solid legs.

## Shortening and sloped labels

`pic.pen({ shortenStart, shortenEnd })` trims the statement's first
and last segments (TikZ `shorten <`/`shorten >`); a `pos` label with
`sloped: true` lies along the segment it rides, flipped where it
would read upside down.

## Fill mode

`pic.pen({ mode: 'fill' })` paints the enclosed region — the
[unit-circle example](../../examples/unit-circle-derivative.ts) fills
its wedge this way. Modes: `'draw'` (default), `'fill'`, `'filldraw'`.

## What to notice

- **Segments of one pen statement compile to ONE path** (per style
  run) — dashes and joins flow across corners, like TikZ.
- **Expansion is lazy.** Build the pen across statements; painting
  happens at `toSVG()`/`mount()` in registration order.
- Pen vs builder: reach for `path()` when the path is *data* (passed
  to `offsetPath`, `snakePath`, …); reach for `pic.pen()` when the
  path is a *statement* with labels and names attached.

Next: [Styling](./06-styling.md) — the full vocabulary of `style`.
