# TikZ → jikz mapping

You already know the mental model — this page is the translation
table. Every jikz snippet below is real, tested code (mirrored from
`examples/`, which the test suite type-checks and snapshot-renders).

The one thing to internalize first: **jikz uses SVG screen
coordinates.** y grows *down*, angles run *clockwise*, 0° = east,
270° = north. See [Coordinate system](./coordinate-system.md) for the
porting rules. Everything else maps one-to-one.

## Coordinates & points (TikZ calc library)

| TikZ | jikz |
|---|---|
| `(2,3)` | `point(2, 3)` |
| `(60:2)` — polar | `polar(60, r)` (screen convention; TikZ θ → `-θ`) |
| `(A)!0.5!(B)` — partway modifier | `A.toward(B, 0.5)` |
| `(A)!2cm!(B)` — distance modifier | `A.towardByDistance(B, 20)` |
| `(A)!0.5!(B)` midpoint | `A.midpoint(B)` |
| `(A |- B)` — vertical through A, horizontal through B | `A.horAt(B)` |
| `(A -| B)` — horizontal through A, vertical through B | `A.verAt(B)` |
| `\coordinate (P) at (2,3);` | `pic.coordinate('P', point(2, 3))` |
| `(P)` — reference by name | `'P'` (string endpoints resolve by name) |
| `(A)+(1,0)` — relative offset | `A.add(point(1, 0))` |

Units are pixels — TikZ's `2cm` is simply a number in jikz. Scale with
`xScale`/`yScale` options on plots, or a canvas `Transform`.

## Path verbs

| TikZ | jikz |
|---|---|
| `\draw (a) -- (b);` | `pic.draw(line(a, b))` |
| `\fill (c) circle (1);` | `pic.fill(circle(c, 1))` |
| `\filldraw[blue] (r);` | `pic.filldraw(rect(...), { style: { stroke: 'blue' } })` |
| `\path ...` (register without painting) | geometry objects are inert until a verb paints them |
| `\node {x} at (p);` | `pic.text(p, 'x')` |

## Fluent path statements — `pen()`

TikZ threads an implicit pen through one `\draw` statement;
`pic.pen()` is exactly that, chainable:

```tex
\draw (40,170) node[below left]{A} -- (300,170) node[below right]{B}
      node[midway,below]{c} -- (300,90) node[right]{C} -- cycle;
```

```ts
pic.pen({ style: { stroke: '#0f172a', strokeWidth: 1.6 } })
  .moveTo(40, 170)  .label('A', { at: 'south west' })
  .lineTo(300, 170) .label('B', { at: 'south east' })
                    .label('c', { pos: 0.5, offset: -10 })
  .lineTo(300, 90)  .label('C', { at: 'north east' })
  .close()
```

| TikZ inside a `\draw` statement | jikz pen method |
|---|---|
| `-- (b)` | `.lineTo(b)` |
| `.. controls (c1) and (c2) .. (b)` | `.curveTo(c1, c2, b)` |
| `(a) |- (b)` / `(a) -| (b)` | `.vhTo(b)` / `.hvTo(b)` |
| `-- cycle` | `.close()` |
| mid-path move (pen up) | `.moveTo(...)` between segments |
| `node[right]{x}` at the pen position | `.label('x', { at: 'east' })` |
| `node[midway]{x}` on the last segment | `.label('x', { pos: 0.5 })` |
| `coordinate (P)` mid-statement | `.coordinate('P')` |
| restyle mid-statement `[red, thick]` | `.push({ style: { stroke: 'red' } })` — later segments compile to a new path |
| `arc (0:90:1)` | `.circularArcTo(r, largeArc, sweep, to)` — SVG endpoint arcs |

Named endpoints work too: `pen.moveTo('P').vhTo('Q')` is
`\draw (P) |- (Q)`.

## Nodes

| TikZ | jikz |
|---|---|
| `\node[circle, draw] (A) at (p) {A};` | `pic.node('A', { at: p, shape: 'circle', text: 'A' })` — the name resolves against the picture's shape set |
| `minimum width=1cm` | `minWidth: 10` (px) |
| `inner sep=4pt` / `outer sep=2pt` | `innerSep: 4` / `outerSep: 4` |
| no size given → fits text | omit `width`/`height` — the node measures its text |
| `\usetikzlibrary{shapes.geometric}` shapes | `picture({ shapes: allShapes })` — the set you hand a picture is its shape library; `basicShapes` is the core four |
| `rotate=45` | `rotate: 45` |
| `at=(p), anchor=north` | `{ at: p, anchor: 'north' }` |

## Anchors

Named anchors (`north`, `south east`), aliases (`'ne'`), and numeric
angles work everywhere TikZ does — with the screen convention
(**270° = north**, not 90°):

| TikZ | jikz |
|---|---|
| `(A.north)` | `'A.north'` (string spec) or `pic.getNode('A').anchor('north')` |
| `(A.ne)` | `'A.ne'` |
| `(A.45)` | `'A.45'` |
| `(A)` — boundary point facing B | bare `'A'` as an edge endpoint — auto-resolves |

## Labels

| TikZ | jikz |
|---|---|
| `\node[label=north:$\alpha$] ...` | `labels: [{ text: '$\\alpha$', at: 'north' }]` |
| `label distance=8` | `labelDistance: 8` (node-wide default) |
| `label={[red]east:x}` | `labels: [{ text: 'x', at: 'east', options: { style: { stroke: 'red' } } }]` |
| `node[right]{x}` inside a `\draw` | `pic.draw(l, { label: { text: 'x', at: 'east' } })` |
| `node[midway, above]{x}` on an edge | `.edge('A', 'B', { label: 'x', labelPos: 0.5, labelOffset: 9 })` |

Label placement is border-to-border (`distance` is a gap, outer sep
included), so font size never causes collisions.

## Edges & routing

| TikZ | jikz |
|---|---|
| `\draw (A) -- (B);` | `pic.edge('A', 'B')` — clips at node boundaries |
| `\draw[->] (A) -- (B);` | `{ arrowEnd: 'stealth' }` — also `'latex'`, `'to'`, `'->'`, `'<-'`, `'<->'`, `'bar'`, `'\|'` |
| `bend left=35` | `bendAngle: 35` (positive = left of travel) |
| `out=45, in=135` | `out: 45, in: 135` (screen convention) |
| `looseness=5` | `looseness: 5` |
| self-loop `(C) edge[out=240,in=300,loop] ()` | `.edge('C', 'C', { out: 240, in: 300, looseness: 5 })` |

## Styles

| TikZ | jikz |
|---|---|
| `[thick, red]` | `{ style: { strokeWidth: 2, stroke: 'red' } }` |
| `[thick, red]` as reusable data | `[thick, { stroke: 'red' }]` — typed array form, later entries win |
| `dashed` / `dotted` / `dashdotted` | `dash: 'dashed'` — full vocabulary incl. `densely dashed`, `loosely dotted`, … |
| `fill opacity=0.3` | `'fill-opacity': 0.3` |
| `double` | `doubleLine: { spacing: 5 }` |
| `pattern=north east lines` | `fillPattern: fillPatterns['north east lines']` — all 12 TikZ tiles in `fillPatterns` |
| `shade` / gradients | `gradient: { type: 'linear', angle: 45, stops: [...] }` |
| `drop shadow` | `dropShadow: { blur: 4, offsetX: 3, offsetY: 3, color: '#000' }` |

## Decorations (`shapes.misc`, `decorations.pathmorphing`)

| TikZ | jikz |
|---|---|
| `decorate, decoration={snake}` | `snakePath(base, { amplitude, wavelength })` |
| `decoration={zigzag}` | `zigzagPath(base, { amplitude, wavelength })` |
| `decoration={coil}` | `coilPath(base, { amplitude })` |
| braces / brackets annotation | `bracePath(p1, p2, amplitude)`, `bracketPath(p1, p2, amplitude)` |

## Plotting

| TikZ | jikz |
|---|---|
| `\draw plot (\x, {sin(\x)});` | `plot((x) => ..., { domain, xScale, yScale, xOffset, yOffset })` |
| polar plot | `plotRose(petals, radius, center)` etc. |

Note: `plot()` maps y **without flipping** (screen coords) — negate
the function to match math convention. The Riemann-sum example shows
the idiom.

## Intersections (`intersections` library)

| TikZ | jikz |
|---|---|
| `\path [name intersections={of=a and b}]` | `intersectLineCircle(l, c).points` |
| circle ∩ circle | `intersectCircleCircle(c1, c2).points` |
| line ∩ line | `intersectLineLine(l1, l2).points[0]` |

Results are plain `Point`s — draw them, label them, compute with them.

## Layouts (graph-drawing & positioning libraries)

| TikZ | jikz |
|---|---|
| chains library (`on chain, going below`) | `chain(at, { spacing }).node(...).going('below').build()` |
| `\matrix of nodes` | `matrix({ at, columnSep, rowSep }).rows([...]).build()` |
| trees (`child { node {...} }`) | `tree({ at, grow: 'down' }).root('A').child('B').build()` |
| `\node[fit=(a)(b)]` | `rectFit(corners)` — tight bbox + padding |
| nodes on a circle | `nodeCircle(center, radius, names)` |

## Scopes & layers

| TikZ | jikz |
|---|---|
| `pgfonlayer{background}` | `renderer.defineLayers([...])` + `renderer.onLayer('background', () => ...)` |
| canvas transformations | `Transform.translation(...)` on `picture({ transform })` |

## Math in labels (`$...$`)

Identical spelling: a label that is **wholly** math — `'$\\alpha$'`,
`'$x^2$'` — renders through KaTeX (an optional peer dependency, which
you inject: `new SVGRenderer(undefined, undefined, { mathRenderer:
katexAdapter(katex) })`). Without it, jikz falls back to plain italic
text and the diagram still works.

**Known limitation: a label may not mix text and math.** `'CuSO$_{4}$'`
renders its `$` as literal characters, because detection matches any
string containing `$…$` while extraction only unwraps a string that is
entirely math. Port `\node {time $t$}` as two labels, or as plain text
without the delimiters, until this is fixed. Pinned by
`test/render/RendererCollaborators.test.ts`.

## Circuits (`circuitikz` / `circuits.ee`)

`circuitShapes` is the `\usetikzlibrary{circuits.ee}` analogue.
Symbols via typed builders (`circuit.resistor({ variant: 'iec' })`) or
string specs (`shape: 'resistor'`); ports resolve as `'R1.out'` or
typed `r1.out` Points; `wire()` chains endpoints. See
[ext/circuits](../reference/ext-circuits.md) *(reference — coming in
Phase 3)*.

## What has no TikZ analogue

- **String output anywhere**: `pic.toSVG()` runs in Node, workers, SSR
  — no DOM, no canvas.
- **Auto-fit**: `pic.mount(el, { fit: true })` sizes the viewBox from
  content (TikZ always does this; in SVG you usually can't).
- **Programmatic composition**: examples like the chess DAG derive
  diagrams from data — the reason you wanted TikZ semantics *in
  JavaScript* in the first place.
