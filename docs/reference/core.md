# Reference: core

The value layer everything stands on. Full API: <a href="../api/index.html" target="_blank">generated reference</a> (`npm run docs:api`).

## Point

Immutable 2D point + the calc operators:

```ts
point(40, 130)
polar(-35, 190)        // screen-convention polar
origin                 // point(0, 0)
```

| method | TikZ calc |
|---|---|
| `a.toward(b, t)` | `(a)!t!(b)` |
| `a.towardByDistance(b, d)` | `(a)!d!(b)` |
| `a.midpoint(b)` | `(a)!0.5!(b)` |
| `a.horAt(b)` / `a.verAt(b)` | `(a \|- b)` / `(a -\| b)` |
| `a.add(p)` | `(a)+(p)` |
| `a.distanceTo(b)` | veclen |
| `a.angleTo(b)` | direction a→b, screen-convention degrees |

`PointLike` = `Point | { x, y } | [x, y]` — accepted everywhere a
point is.

## Transform

Affine matrix (`a b c d e f`) with composition:

```ts
Transform.translation(160, 100)
Transform.scaling(2)
t.compose(other)
```

Passed to `picture({ transform })` as a canvas transform — the whole
scene (strokes and markers included) maps through it. See
[Coordinate system](../concepts/coordinate-system.md#the-escape-hatch).

## Anchors

`AnchorSpec` — the union every anchor-accepting API takes:
`'north' | 'north east' | … | 'ne' | number` (numeric = degrees,
screen convention). `anchorOnRect` is the fallback resolver; unknown
names throw `AnchorError` listing the valid ones.

## Utils

`EPSILON`, `degToRad`, `radToDeg`, `normalizeAngle`, `approxEqual`,
`clamp`, `lerp` — small, exact, dependency-free.
