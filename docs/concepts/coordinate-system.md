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

## The escape hatch

If your data lives in math coordinates (plots, physics), either negate
y at the source — `plot((x) => -f(x), ...)` — or wrap the whole
picture in a flipping transform:

```ts
picture({ transform: Transform.translation(cx, cy) })
```

A canvas transform maps the whole scene at render time; geometry stays
in whatever space you authored it.
