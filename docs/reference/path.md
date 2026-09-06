# Reference: path

Paths are jikz's compound geometry: multi-segment, multi-subpath
curves. Two construction styles — the builder (`path()`) for paths as
*data*, the pen (`pic.pen()`) for paths as *statements*. Full API:
[generated reference](../api/) (`npm run docs:api`).

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
| `bracePath(a, b, amplitude)` | `brace` (annotation) |
| `bracketPath(a, b, amplitude)` | square-bracket annotation |

## Arc math (`src/path/arcMath.ts`)

Center↔endpoint parameterization conversions (`centerToEndpoint`,
`endpointToCenter`, …) — the machinery behind `Arc` and
`pen().circularArcTo`. You rarely call these directly.

## The pen (`pic.pen()`)

Covered in [tutorial 5](../tutorials/05-paths-and-pen.md). Summary:
one statement compiles to one path per style run; `label({ at })` hangs
on the pen position, `label({ pos, offset })` rides the last segment;
`coordinate(name)` names the position; `push(options)` restyles
mid-statement.

## rotatePath

`rotatePath(p, deg, center?)` — rotate a path around a point (or its
bounds center).
