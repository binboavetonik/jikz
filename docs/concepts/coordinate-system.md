# Coordinate system

Read this once. Every surprising behavior in jikz traces back to one
decision: **jikz draws in SVG screen space, natively.**

## The rules

- **Units are pixels.** No cm/pt/inch layer — `2` means 2px. Scale is
  your choice: multiply, use plot `xScale`/`yScale`, or apply a canvas
  `Transform`.
- **y grows downward**, like SVG, canvas, and every browser API.
- **Angles are screen-convention**: `0°` = east, `90°` = south (down),
  `180°` = west, `270°` = north (up). Positive angles rotate
  **clockwise** — matching `Math.atan2(dy, dx)` and SVG `rotate()`.

```ts
import { point, polar } from 'jikz'

const O = point(100, 100)
O.add(polar(0, 40))    // 40px to the RIGHT
O.add(polar(90, 40))   // 40px DOWN
O.add(polar(270, 40))  // 40px UP  (270° = north)
```

## Why not math convention (y up, ccw)?

Because jikz's output *is* SVG — not a format translated to SVG at the
end. Anchors, text placement, arrowheads, and decorations all compute
in the same space the renderer emits. One space, no silent flips, and
`angleTo` agrees with `Math.atan2` so your own math never needs an
adapter.

## Porting TikZ (math-convention) code

TikZ angles run counterclockwise with y up. Two mechanical rewrites:

| TikZ | jikz |
|---|---|
| `(θ:r)` polar coordinate | `polar(-θ, r)` |
| `arc(α:β:r)` | `arc(center, r, -α, -β, true)` — negate, swap, sweep flag |
| `(A.45)` numeric anchor | `'A.-45'` (or keep named anchors — `'north east'` is unchanged) |

**Named anchors are immune.** `north`, `south east`, `'ne'` mean the
same thing in both systems; only *numeric* anchors flip (90° ↔ 270°).
Prefer named anchors in portable code.

The [unit-circle example](../../examples/unit-circle-derivative.ts)
ports a Beamer TikZ slide line-for-line using exactly these rules.

## Where this shows up

- **Edge routing**: `out: 45, in: 135` depart/arrive in screen angles;
  `bendAngle` positive bends left of travel — same as TikZ, because
  "left of travel" is convention-free.
- **Arcs**: `arc(c, r, from, to, sweep?)` sweeps clockwise by default
  (increasing angle moves down on the right side of a circle).
- **Labels**: `pic.text(p, 'h', { at: 'north' })` places above —
  compass names are safe everywhere.

## The math frame

Since 0.9 a picture can be *written* in TikZ's frame:

```ts
import { picture, cm, point, polar, rel } from '@ozan.e/jikz'

const pic = picture({ frame: 'math', unit: cm(1) })
pic.pen().moveTo(0, 0).lineTo(2, 1).arc({ start: 0, end: 90, radius: 1 })
pic.node('A', { at: polar(60, 2), text: 'A' })
pic.edge('A.90', point(0, 3))          // A.90 is the top
```

Every coordinate, angle and numeric anchor that enters through a
picture verb — `node`, `edge`, `coordinate`, `text`, `draw`, the pen —
is mapped **once, at insertion**: y is negated, coordinates are
multiplied by `unit`, angles are negated. The geometry the picture
holds is screen space as always, so nothing in rendering changes:
text stays upright, stroke widths and font sizes stay px, and
`resolve()` returns screen px (`pic.point(x, y)` maps a frame
coordinate by hand, `pic.length(v)` a coordinate length).

Two rules follow. Lengths given as *options* — `width`, `innerSep`,
`distance`, `strokeWidth` — are px, not units, as TikZ keeps `line
width` and `inner sep` in absolute units. And a geometry object handed
to `draw()` is mapped too (`circle(point(1, 1), 0.5)` becomes a circle
of radius `0.5 × unit` at the mapped centre): points, lines, circles,
rectangles, polygons, arcs, ellipses and paths map; plots and node
shapes do not, and say so.

## The escape hatch

If your data lives in math coordinates (plots, physics), either negate
y at the source — `plot((x) => -f(x), ...)` — or wrap the whole
picture in a flipping transform:

```ts
picture({ transform: Transform.translation(cx, cy) })
```

A canvas transform maps the whole scene at render time; geometry stays
in whatever space you authored it.
