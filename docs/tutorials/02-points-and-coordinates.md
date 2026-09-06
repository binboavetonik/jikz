# Tutorial 2: Points & coordinates

In which we stop hand-computing positions and let the calc operators
do it — the reason TikZ code survives edits.

## The problem with literals

Tutorial 1 placed everything with raw coordinates. That works until
you move one thing and recompute six others by hand. TikZ's answer is
the *calc library* — coordinates computed from other coordinates.
jikz builds those operators into `Point` itself.

## The operators

```ts
import { point, polar } from 'jikz'

const A = point(40, 130)
const B = point(260, 40)

A.toward(B, 0.5)            // TikZ (A)!0.5!(B) — the midpoint
A.toward(B, 0.25)           // a quarter of the way from A to B
A.towardByDistance(B, 30)   // TikZ (A)!30pt!(B) — 30px from A toward B
A.midpoint(B)               // shorthand for toward(B, 0.5)
A.horAt(B)                  // TikZ (A |- B) — A's horizontal, B's vertical
A.verAt(B)                  // TikZ (A -| B) — A's vertical, B's horizontal
A.add(point(10, -5))        // TikZ (A)+(10,-5)
A.distanceTo(B)             // length of AB
A.angleTo(B)                // direction A→B, screen-convention degrees
polar(-35, 190)             // TikZ (35:190) in math convention — see below
```

Remember: angles are [screen convention](../concepts/coordinate-system.md)
— 0° east, clockwise positive, 270° = north. TikZ's `(θ:r)` becomes
`polar(-θ, r)`.

## A worked example

The orthogonal-completion operators draw right-angle constructions
without a single computed coordinate:

```ts
import { picture, line, point } from 'jikz'

const pic = picture()
const A = point(40, 130)
const B = point(260, 40)

const mid = A.toward(B, 0.5)   // (A)!0.5!(B)
const corner = A.horAt(B)      // (A |- B)

pic.draw(line(A, B), { style: { stroke: '#94a3b8', dash: 'dashed' } })
pic.draw(line(A, corner), { style: { stroke: '#2563eb' } })
pic.draw(line(corner, B), { style: { stroke: '#2563eb' } })
```

Move `A` or `B` and the whole construction follows — that's the point
of calc-style code.

## Naming coordinates

TikZ's `\coordinate (P) at ...;` names a point so later statements can
reference it as `(P)`:

```ts
pic.pen()
  .moveTo(30, 90) .coordinate('P').label('P', { at: 'south west' })
  .lineTo(170, 40).coordinate('Q').label('Q', { at: 'north east' })

// later — string endpoints resolve by name:
pic.pen({ style: { stroke: '#94a3b8', dash: 'dashed' } })
  .moveTo('P')
  .vhTo('Q')                    // TikZ \draw (P) |- (Q)
```

Or register one directly: `pic.coordinate('P', point(30, 90))`.

## What to notice

- **`horAt`/`verAt` read as TikZ does**: `A.horAt(B)` = "horizontal
  from A, vertical *at* B" = `(A |- B)`. The method order matches the
  symbol order.
- **Everything returns new points.** Points are immutable values;
  operators never mutate.
- These are the same operators the
  [perpendicular-bisector example](../../examples/perp-bisectors.ts)
  uses to *construct* a circumcenter instead of looking it up.

Next: [Nodes, anchors & labels](./03-nodes-anchors-labels.md) —
points that draw themselves.
