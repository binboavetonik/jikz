# Reference: geometry

Everything in `src/geometry` is **inert data** — geometry objects
describe shapes; painting happens when you hand them to a verb
(`pic.draw`, `r.renderCircle`, …). Every geometry type is renderable;
types without a dedicated render path fall back to their outline via
`toSVGPath()`.

Full API details: <a href="../api/index.html" target="_blank">generated API reference</a> (`npm run docs:api`).

## Lines

| factory | purpose |
|---|---|
| `line(a, b)` | segment between two points |
| `lineFromAngle(p, deg, len)` | ray from `p` at screen-convention angle |
| `horizontalLine(y, x0, x1)` / `verticalLine(x, y0, y1)` | axis-aligned shortcuts |

## Circles

| factory | purpose |
|---|---|
| `circle(c, r)` | center + radius |
| `circleFromCenterAndPoint(c, p)` | radius = `c.distanceTo(p)` |
| `circleFromDiameter(a, b)` | `ab` as diameter |
| `circleThrough(a, b, c)` | unique circle through 3 points (`null` if collinear) |
| `circleEnclosing2(a, b)` / `circleEnclosing3(a, b, c)` | minimal enclosing circle |

Properties: `center`, `radius`, `diameter`, `circumference`, `area`,
`foci` (both coincide), `pointAt(deg)`, `contains(p)`.

## Arcs

| factory | purpose |
|---|---|
| `arc(c, r, fromDeg, toDeg, sweep?)` | center/radius/angle range, screen convention |
| `arcThrough(a, b, c)` | arc through three points |
| `arcFromBulge(a, b, bulge)` | AutoCAD-style bulge factor |
| `arcFromRadius(a, b, r, largeArc?, sweep?)` | SVG endpoint parameterization |

## Rectangles

| factory | purpose |
|---|---|
| `rect(x, y, w, h)` | top-left + size |
| `rectFromCenter(c, w, h)` | centered |
| `rectFromCorners(a, b)` | any two opposite corners |
| `square(c, size)` | centered square |
| `rectFit(points)` | tight bbox around points (TikZ `fit` — see tutorial 7) |
| `rectFromBounds([x0, y0, x1, y1])` | from a bounds tuple |

## Polygons & triangles

`polygon(points)`, `regularPolygon(c, n, r)`, `equilateralTriangle`,
`regularSquare`, `pentagon`, `hexagon`, `star(c, points, outerR, innerR)`.

Triangles: `triangle(a, b, c)`, `rightTriangle`, `isoscelesTriangle`,
`equilateral` — with computed centers (`centroid`, `circumcenter`,
`incenter`, `orthocenter`) used by the
[triangle-centers example](../../examples/triangle-centers.ts).

## Conics

`ellipse(c, a, b)` — with `foci`, `pointAt(deg)`, `focalDistance`.
`parabola(vertex, focalLength)`, `hyperbola(c, a, b)`. The
[earth-orbit example](../../examples/earth-orbit.ts) sits the Sun on
`orbit.foci[1]`.

## Plots

`plot(fn, { domain, xScale, yScale, xOffset, yOffset })` — sampled
cartesian; `plotSin`, `plotCos`, `plotRose(petals, r, center)` —
polar. **Note**: y is not flipped (screen space); pass `(x) => -f(x)`
for math-convention plots. See
[`examples/riemann.ts`](../../examples/riemann.ts).

## Intersections

| function | computes |
|---|---|
| `intersect(a, b)` | dispatch on any supported pair |
| `intersectLineLine` / `intersectSegmentSegment` | line ∩ line |
| `intersectLineCircle` / `intersectSegmentCircle` | line ∩ circle |
| `intersectCircleCircle` | circle ∩ circle |
| `intersectLineArc` / `intersectSegmentArc` / `intersectArcArc` | arc variants |
| `intersectLineRect` | line ∩ rectangle |

All return `{ points: Point[] }` — empty when disjoint. Demoed by
[`examples/intersections.ts`](../../examples/intersections.ts) and
[perp-bisectors](../../examples/perp-bisectors.ts).

## Complex shapes (node shapes)

The 33 entries of `allShapes` — `cylinder`, `diamond`, `star`,
`cloud`, `callout`, `chamfered rectangle`, `forbidden sign`,
`magnifying glass`, `tape`, arrow shapes, split shapes, … — live in
`src/geometry/complex/`. They're primarily **node shapes**
(`picture({ shapes: allShapes }).node('x', { shape: 'cylinder' })`), each with full anchor
support. The complete visual gallery is
[`examples/shape-gallery.ts`](../../examples/shape-gallery.ts).

Custom shapes: `defineShape(name, factory)` — declare vertices, get
anchors/bounds/contains/SVG for free. See the README's *Extending
jikz* section.

## Rotated

`Rotated` wraps any shape with a rotation — `node({ rotate: 45 })`
uses it internally; anchors rotate with the shape, numeric anchors
stay screen-absolute.
