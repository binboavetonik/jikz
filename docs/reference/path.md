# Reference: path

Paths are jikz's compound geometry: multi-segment, multi-subpath
curves. Two construction styles — the builder (`path()`) for paths as
*data*, the pen (`pic.pen()`) for paths as *statements*. Full API:
<a href="../api/index.html" target="_blank">generated reference</a> (`npm run docs:api`).

## `Path` builder

```ts
path()
  .moveTo(p)            // lift + start subpath
  .lineTo(p)            // straight segment
  .curveTo(c1, c2, p)   // cubic Bézier
  .quadraticTo(c, p)    // quadratic Bézier
  .arcTo(r, largeArc, sweep, p)  // SVG endpoint arc
  .close()              // Z
```

Inspection: `segments`, `length`, `pointAt(t)`, `bounds`,
`toSVGPath()`.

## Path operations (`src/path/PathOperations.ts`)

| function | purpose |
|---|---|
| `offsetPath(p, d)` | parallel curve at signed distance |
| `doublePath(p, spacing)` | TikZ `double` as two real offset paths |
| `smoothPath(p, tension)` | polyline → spline |
| `subPath(p, t0, t1)` | the `t0..t1` portion (arc-length param) |
| `reversePath(p)` | reverse direction |
| `concatPaths(...)` | join end-to-start |

All demoed in [`examples/path-operations.ts`](../../examples/path-operations.ts).

## Decorations (`src/path/PathDecorations.ts`)

TikZ `decorations.pathmorphing` — transform any base path:

| function | TikZ decoration |
|---|---|
| `snakePath(base, { amplitude, wavelength })` | `snake` |
| `zigzagPath(base, { amplitude, wavelength })` | `zigzag` |
| `coilPath(base, { amplitude })` | `coil` |
| `bracePath(a, b, amplitude, side)` | `brace` (annotation) |
| `bracketPath(a, b, amplitude, side)` | square-bracket annotation |

The two annotations span from `a` to `b` and stand `amplitude` off
that span, on `side` (`'left'` of a→b by default). `amplitude` has to
be a visible fraction of the span or the brace flattens: the curl
radius is half of it, capped at a quarter of the span so the two
halves cannot fold through each other. See
[`examples/braces.ts`](../../examples/braces.ts).

## SVG path import (`pathFromSVG`)

`pathFromSVG(d)` parses any SVG `d` string — absolute and relative
commands, the `H`/`V` shorthands, the `S`/`T` smooth forms, and elliptical
arcs — into a `Path`. That makes an icon exported from a drawing tool
a first-class jikz path: drawable, decoratable, measurable,
splittable.

```ts
import { pathFromSVG, subPath } from '@ozan.e/jikz'

const glyph = pathFromSVG('M 10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80')
pic.draw(subPath(glyph, 0.2, 0.8), { style: { stroke: '#2563eb' } })
```

## Arc math (`src/path/arcMath.ts`)

Center↔endpoint parameterization conversions (`centerToEndpoint`,
`endpointToCenter`, …) — the machinery behind `Arc` and
`pen().circularArcTo`. You rarely call these directly.

## The pen (`pic.pen()`)

Verbs: `moveTo`, `lineTo`/`to` (with `out`/`in`/`bend`), `hvTo`,
`vhTo`, `curveTo`, `smoothCurveTo`, `quadraticTo`, `through`, `bendTo`,
`arcTo`/`circularArcTo` (SVG endpoint form), `close`; TikZ's
operations `rectangle`, `circle`, `ellipse`, `arc({ start, end |
delta, radius | xRadius, yRadius })`, `grid`, `parabola`, `sin`,
`cos`; `label`, `node` (a real named node), `coordinate`, `push`.
Points are `PointLike`, a name (`'A.north'`) or `rel(dx, dy)`.
Options: `mode`, `style`, `shortenStart`, `shortenEnd`.

Covered in [tutorial 5](../tutorials/05-paths-and-pen.md). Summary:
one statement compiles to one path per style run; `label({ at })` hangs
on the pen position, `label({ pos, offset })` rides the last segment;
`coordinate(name)` names the position; `push(options)` restyles
mid-statement.

## Routers (`src/node/routers.ts`)

`edge(a, b, { route })` takes an `EdgeRouter`, `(from, to, edge) =>
Path`, in place of the built-in routing — TikZ's `to path`.
`straightRouter`, `orthogonalRouter({ first })` and `busRouter({ x |
y })` are exported; arrows, labels (`pos`), bounds and `shorten*`
follow the routed path.

## rotatePath

`rotatePath(p, deg, center?)` — rotate a path around a point (or its
bounds center).
