# jikz

[![CI](https://github.com/binboavetonik/jikz/actions/workflows/ci.yml/badge.svg)](https://github.com/binboavetonik/jikz/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40ozan.e%2Fjikz)](https://www.npmjs.com/package/@ozan.e/jikz)

A TikZ-inspired coordinate and drawing library for JavaScript/TypeScript.
Programmatic, precise SVG graphics — nodes, edges, anchors, conics,
patterns, decorations — with a fluent API modeled on TikZ's mental
model, not on a scene graph.

- **Zero runtime dependencies.** Rendering is string-first through jikz's
  own `SVGBuilder`; KaTeX is an *optional* peer for math labels.
  Tree-shakeable: `import { point }` costs under 1 kB gzipped, a
  `picture()` about 29 kB plus only the shape sets you hand it
  (`allShapes` adds 14 kB).
- **Runs anywhere.** `toSVG()` works in Node, workers, and SSR with no
  DOM; `mount()` attaches a live tree in the browser.
- **TikZ semantics.** Named nodes with boundary-aware edges, compass
  anchors, `\path`/`\draw`/`\fill`/`\filldraw` verbs, inner/outer sep,
  bend/out/in edge routing, fill patterns, snake/zigzag decorations.

## Install

```sh
npm install @ozan.e/jikz
# optional, for LaTeX math labels:
npm install katex
```

## Documentation

**https://binboavetonik.github.io/jikz/** — the site opens on the
**gallery**: 100 examples rendered live, each with its source one click
away. The documentation lives in the sidebar next to it:

- **[TikZ → jikz mapping](https://binboavetonik.github.io/jikz/concepts/tikz-mapping)** —
  if you know TikZ, start here: the idiom-by-idiom translation table.
- **[Coordinate system](https://binboavetonik.github.io/jikz/concepts/coordinate-system)** —
  SVG screen space, clockwise angles, and porting rules.
- **[Two API levels](https://binboavetonik.github.io/jikz/concepts/two-api-levels)** —
  `picture()` vs `SVGRenderer`.
- **[ViewBox, sizing & fit](https://binboavetonik.github.io/jikz/concepts/viewbox-and-fit)**
  and **[Node, SSR & browser](https://binboavetonik.github.io/jikz/concepts/node-ssr-browser)**.
- **[Examples](https://binboavetonik.github.io/jikz/)** — every card is a
  real module in
  [`examples/`](https://github.com/binboavetonik/jikz/tree/master/examples),
  type-checked and snapshot-tested.

(Links are absolute because npm resolves relative README links against
the package homepage.)

## Quick start

```ts
import { picture, point, basicShapes } from '@ozan.e/jikz'

const svg = picture({ shapes: basicShapes })
  .node('A', { at: point(60, 60),  shape: 'circle',    width: 60, height: 60, text: 'A' })
  .node('B', { at: point(220, 60), shape: 'rectangle', width: 90, height: 50, text: 'B' })
  .edge('A', 'B', { arrowEnd: 'stealth', label: 'hello' })
  .toSVG({ width: 280, height: 120 })   // string — works in Node

// In a browser, mount into a container instead:
//   .mount(document.getElementById('out'), { width: 280, height: 120 })
// …and hand it attachPanZoom for wheel-zoom + drag-pan:
//   .mount(el, { fit: true, panZoom: attachPanZoom })
```

Shape names come from the set the picture was given: `basicShapes` is
the four core shapes (rectangle, circle, ellipse, diamond), `allShapes`
the whole catalogue, and any `{ ...allShapes, ...circuitShapes, house }`
mix is a set too. A bare `picture()` resolves no names — hand it a kind
directly instead (`shape: allShapes.star`), which also skips the set.

Edges between bare node names auto-resolve to the **boundary point**
facing the other endpoint (like `\draw (A) -- (B)` in TikZ). Pin a
specific anchor with a string spec: `.edge('A.north', 'B.south')` —
aliases and angles work too (`'A.ne'`, `'A.270'`).

Bare geometry uses TikZ's path verbs:

```ts
import { picture, circle, rect, point } from '@ozan.e/jikz'

picture()
  .filldraw(circle(point(60, 60), 40), { style: { stroke: '#2563eb', fill: '#dbeafe' } })
  .draw(rect(130, 20, 80, 80))
  .toSVG({ width: 240, height: 120 })
```

## Fluent path statements — `pen()`

TikZ threads an implicit pen through
`\draw (a) -- (b) node[right]{x} -- cycle`; `pic.pen()` is exactly
that as a chainable statement:

```ts
const pic = picture()

pic.pen({ style: { stroke: '#0f172a', strokeWidth: 1.6 } })
  .moveTo(40, 170)  .label('A', { at: 'south west' })
  .lineTo(300, 170) .label('B', { at: 'south east' })
                    .label('c', { pos: 0.5, offset: -10 })  // rides the segment
  .lineTo(300, 90)  .label('C', { at: 'north east' })
  .close()
```

- **Verbs**: `moveTo`/`lineTo`/`to` (`--`), `hvTo`/`vhTo` (`-|`,`|-`),
  `curveTo`/`smoothCurveTo`/`quadraticTo` (`.. controls ..`),
  `through`/`bendTo`, `arcTo`/`circularArcTo`, `close()` (`-- cycle`).
  `to()` doubles as TikZ's `to` operation: `to('B', { out: 30, in: 150 })`
  or `to('B', { bend: 'left' })` draw a single Bézier whose control
  points derive from the angles — `to('B')` with no keys stays `--`.
- **Labels**: `.label(text, { at, distance })` hangs on the current
  pen position; `{ pos, offset }` rides the operation just drawn by
  arc length (TikZ `node[midway]`) — including curves and both legs of
  a corner. The pen never moves for a label.
- **Named coordinates**: `.coordinate('A')` names the pen position
  (TikZ `coordinate (A)`); every endpoint argument also takes a name
  string — `pen.moveTo('A').lineTo('B')`. `pic.coordinate('O', p)`
  does the same outside a pen, and names resolve in `edge('A', 'B')`
  and `pic.resolve('A')` too.
- **Mid-statement restyling**: `.push(options)` starts a new styled
  run from the pen position — options inherit and override, `mode` can
  switch — so one statement can mix dashed and solid legs.

## Two API levels

- **`Picture` (primary)** — a declarative scope: named nodes, edges by
  name, path verbs, bare text; compiles via `toSVG()`/`mount()`.
  Start here.
- **`SVGRenderer` (escape hatch)** — imperative `renderNode` /
  `renderEdge` / `renderCircle` / … for when you need explicit control
  of layering, groups, or incremental drawing. Both share the same
  style system and builder substrate.

## Conventions (read this once)

- **Coordinates are SVG screen space**: units are pixels, **y grows
  downward**, origin at the top-left.
- **Angles follow the screen convention**: 0° = east, increasing
  **clockwise** (matching `Math.atan2(dy, dx)` and SVG `rotate()`).
  So 90° = south (down) and **270° = north (up)**.
- **Compass anchor names always mean what you see**: `north` is the
  visual top of a shape, `north east` the visual top-right corner —
  same as TikZ's page output.
- ⚠️ **Numeric anchors differ from TikZ**: in TikZ `(A.90)` is the top
  of the node; in jikz `A.90` is the bottom (90° = south) and `A.270`
  is the top. Named anchors match TikZ; bare numbers match the screen.
- Edge `out`/`in`/`bendAngle` use the same angle convention. Positive
  bend is to the **left** of travel (`bend left`); labels sit on the
  left by default (TikZ `auto=left`).

## What's in the box

| Area | Contents |
|---|---|
| `core` | Immutable `Point` with TikZ operators (`toward` = `(A)!t!(B)`, `horAt`/`verAt` = `\|-`/`-\|`), affine `Transform` |
| `geometry` | Line, Circle, Arc, Rectangle, Polygon, Triangle, Ellipse, Parabola, Hyperbola, function plotting (Cartesian/parametric/polar) with scatter plot marks (`circle`, `square`, `triangle`, `diamond`, `pentagon`, `plus`, `cross`, `asterisk`, `oplus`, `otimes` — open or `*Filled`), pairwise intersections |
| `node` | `Node` (any shape + text + inner/outer sep + TikZ-style `labels` = `label=<angle>:<text>`), `Edge` (auto boundary anchors, bend/out/in/looseness, labels, arrow tips), **33 shape kinds** via `allShapes`, TikZ-style positioning (`nodeAbove`, …) |
| `picture` | Named-node registry, named coordinates (`pic.coordinate('A', p)`), string anchor resolution (`'A.north'`), fluent path statements (`pic.pen()` — TikZ `\draw (a) -- (b) node[right]{x} -- cycle` as a chain, with `pos` labels, named endpoints, mid-statement restyling via `push`), `path`/`draw`/`fill`/`filldraw`/`shade` verbs with TikZ-style shape labels (`draw(l, { label: { text, at: 'east' } })` = `node[right]` inside a `\draw`), bare `text` with directional placement (`pic.text(p, 'h', { at: 'south east' })` = `\node[below right] at (p) {h}`), `toSVG`/`mount` with fixed or auto-fit viewBox (`{ fit: true }` sizes from content, TikZ-style) |
| `path` | Chainable path builder, decorations (snake, zigzag, coil, bumps, saw, brace…), operations (offset, double, smooth, join), SVG path import (`pathFromSVG` parses any `d` string — absolute/relative, `H`/`V`/`S`/`T`, arcs — into a drawable/decoratable/measurable `Path`) |
| `render` | `SVGRenderer` + `SVGBuilder` (string/DOM), 12 TikZ fill patterns, linear/radial gradients, named shadings (`axis`/`radial`/`ball` + TikZ `left color`/`ball color`/… keys), drop shadows, clip paths, double lines, layers, 10 arrow tip kinds — `stealth`, `latex`, `to`, `bar`, `||`, `circle`, `o`, `square`, `diamond`, `roundCap` — plus TikZ spellings `->`/`<-`/`<->`/`*` (color follows the edge stroke). Every geometry type is renderable — uncommon shapes fall back to their path outline |
| `layout` | `chain`, `matrix`, `tree`, `layered` (Sugiyama DAG) and `graph` (force-directed Fruchterman–Reingold + circular) auto-layout builders |
| `text` | `measureText` — deterministic per-character font metrics, identical in Node, workers and the browser (so SSR output doesn't reflow on hydration); powers auto-sized nodes (`node({ text })` with no width/height). Opt into the browser's own canvas measurement with `setTextMeasurementBackend('canvas')`. `placeText` — directional label placement for bare text (same ray math as node labels) |

## Styling

Three interchangeable forms, all typed:

```ts
// 1. Inline object (the canonical form)
pic.draw(edge, { style: { stroke: '#2563eb', strokeWidth: 2 } })

// 2. TikZ's option list — an array of named preset objects, merged
//    left-to-right (later wins), mixable with inline overrides:
import { thick, dashed, red } from '@ozan.e/jikz'
pic.draw(edge, { style: [thick, dashed, red] })
pic.draw(edge, { style: [thick, { stroke: '#2563eb' }] })

// 3. TikZ string syntax (compat; unknown names warn instead of
//    failing silently)
parseStyleString('thick, dashed, red')
```

**Named styles** — TikZ's `\tikzset`. Register a style once, reference it
by name (string form) or by the frozen preset it returns (typed form):

```ts
import { registerStyle, parseStyleString } from '@ozan.e/jikz'

const brand = registerStyle('brand', { stroke: '#2563eb', strokeWidth: 2 })
registerStyle('brandsoft', ['brand', dashed])   // compose named styles

pic.draw(edge, { style: [brand] })                 // typed
pic.draw(edge, { style: parseStyleString('brandsoft, dashed') })
```
Re-registering a name replaces it; registered names shadow built-ins.
`registerStyle` resolves its recipe eagerly (register dependencies
first); use lowercase names if you want them reachable from
`parseStyleString` (which lowercases).

Named fields use literal-union types: `dash: 'dashed'`,
`lineCap: 'round'` — typos are compile errors. Fill patterns are values:
`fillPattern: fillPatterns['north east lines']`, or a spec that tunes
one, `{ pattern: fillPatterns.grid, color: '#2563eb', scale: 1.5 }`. `DASH_PATTERN_NAMES` and `PRESET_OBJECTS` export the
catalogs for introspection.

## LaTeX math labels

Inject KaTeX and any text containing `$...$` renders as math inside a
`<foreignObject>`:

```ts
import katex from 'katex'
import { SVGRenderer, katexAdapter } from '@ozan.e/jikz'

const renderer = new SVGRenderer(undefined, undefined, {
  mathRenderer: katexAdapter(katex),
})
```

```ts
pic.node('E', { at: point(100, 60), shape: 'circle', text: '$e^{i\\pi}+1=0$' })
```

Reading KaTeX from a global `<script>` tag or `globalThis.katex` still
works but is deprecated (one-time warning). Without a math renderer,
math text falls back to plain italic.

## Extending jikz

Shapes are values, and arrow tips, fill patterns and decorations are
registries — add your own without touching library source:

```ts
import { AnchoredPolygon, defineShape, definePattern, registerArrowTip, registerDecoration, picture, point } from '@ozan.e/jikz'

// 1. Custom shape: declare vertices, get anchors/bounds/contains/SVG for free
class House extends AnchoredPolygon {
  readonly type = 'house'
  // ...center/width/height/innerSep/outerSep fields + constructor...
  get vertices() {
    const hw = this.width / 2, hh = this.height / 2
    return [
      point(this.center.x - hw, this.center.y + hh),
      point(this.center.x - hw, this.center.y),
      point(this.center.x, this.center.y - hh),   // roof apex
      point(this.center.x + hw, this.center.y),
      point(this.center.x + hw, this.center.y + hh),
    ]
  }
  moveTo(center) { return new House({ center, width: this.width, height: this.height }) }
  resize(width, height) { return new House({ center: this.center, width, height }) }
}

// A shape kind: the factory plus how it sizes. No registration and no
// module augmentation — the name lives in whatever set you build.
const house = defineShape('house', (o) => new House(o))

picture({ shapes: { house } })
  .node('H', { shape: 'house', at: point(80, 60), width: 60, height: 50 })
// …or skip names entirely: .node('H', { shape: house, at: … })

// 2. Custom arrow tip (marker artwork in a 10×10 box, +x = travel direction)
registerArrowTip('pennant', {
  filled: true,
  end:   { d: 'M 0 0 L 10 5 L 0 5 Z', refX: 9 },
  start: { d: 'M 10 0 L 0 5 L 10 5 Z', refX: 1 },
})

// 3. Custom fill pattern (SVG tile fragment) — a value, like a shape
const wavy = definePattern('wavy', {
  width: 12, height: 6, defaultLineWidth: 1,
  createContent: (color, lw) =>
    `<path d="M0 3 Q3 0 6 3 T12 3" fill="none" stroke="${color}" stroke-width="${lw}"/>`,
})
pic.filldraw(rect(0, 0, 60, 40), { style: { fillPattern: wavy } })

// 4. Custom path decoration
registerDecoration('heartbeat', (path, options) => myTransform(path, options))
```

Registered names for arrow tips and decorations are accepted everywhere
built-ins are — `edge(a, b, { arrowEnd })`, `decoratePath` — and unknown
names throw errors listing the known ones. Those two stay registries on
purpose: their tables are small, and nearly every edge draws a tip, so
there is nothing to save by making callers carry one.

Shapes and fill patterns are values instead: hand the ones you use to
the picture or the style, and a drawing that never fills with a pattern
does not carry the twelve tiles.

Shapes work the other way round: a picture is given a **shape set**
(`picture({ shapes: allShapes })`, or just the sets you use), and the
names in it are what `node({ shape: … })` accepts. Because the set is
an ordinary object, TypeScript reads both halves off it — the names
autocomplete, misspellings are compile errors, and
`shapeOptions` is typed per name (`{ shape: 'star', shapeOptions:
{ points: 8 } }` checks against the star factory). Nothing is global,
so two extensions can never disagree about what a name means, and a
picture carries only the shapes you hand it. Passing the kind itself —
`node({ shape: allShapes.star })` — skips names altogether.

A picture is typed by its set, so a helper that takes one names the set
it expects — `function bay(pic: Picture<typeof allShapes>)` — or takes
its own parameter, `function bay<S extends ShapeSet>(pic: Picture<S>)`,
to accept any. A bare `Picture` means `Picture<{}>`: no names, which is
what `picture()` with no shapes gives you.

To compile pictures to a non-SVG backend, implement the 4-method
`PictureRenderer` interface and call `picture().renderWith(yourRenderer)`.

## Circuit diagrams (ext/circuits)

Electrical symbols — jikz's analogue of `\usetikzlibrary{circuits.ee}` —
live in the `ext/circuits` package and are opt-in:

```ts
import { picture, circuitShapes, wire, junctionDot, circuit, point } from '@ozan.e/jikz'

// circuitShapes is jikz's \usetikzlibrary{circuits.ee}
const pic = picture({ shapes: circuitShapes })
  .node('V1', circuit.voltageSource({ at: point(60, 120), rotate: 90 }))
  .node('R1', circuit.resistor({ at: point(140, 60), variant: 'iec' }))
  .node('C1', circuit.capacitor({ at: point(220, 120), rotate: 90 }))

wire(pic, ['V1.in', point(60, 60), 'R1.in'])
wire(pic, ['R1.out', point(220, 60), 'C1.in'])
pic.fill(junctionDot(point(220, 60)))
pic.toSVG({ width: 320, height: 210 })
```

Symbols: `resistor` (ANSI/IEC), `capacitor` (+polarized), `inductor`,
`diode` (+Zener/LED), `switch` (open/closed), `voltage source`,
`current source`, `ground`, `op amp`. All have intrinsic sizes, ports
at their lead tips (`'in'`/`'out'`; op-amp: `'-'`, `'+'`, `'out'`), and
rotate with `node({ rotate })`. Place a symbol by its terminal with
`node({ at, anchor: 'in' })`; annotate with `labels` (symbols never
stretch to fit text).

### Two ways to reference symbols

**Typed builders and ports** are the recommended, code-first route —
autocomplete for every option and variant, compile errors for typos:

```ts
// circuit.* builders return ordinary NodeOptions (typed variants)
pic.node('R1', circuit.resistor({ at: p, rotate: 90, variant: 'iec' }))
pic.node('D1', circuit.diode({ at: q, variant: 'led' }))

// symbol instances expose typed port Points — no strings at all
const u1 = opAmp({ center: point(200, 120) })
pic.node('U1', { shape: u1 })
pic.edge(r1.out, u1.minus, { arrowEnd: 'none' })
```

Both produce the same objects and mix freely (`circuit.resistor(...)`
is just `NodeOptions` under the hood). Use strings when specs come
from data, builders when they come from code.

One caveat on the typed accessors: they read the instance you built, and
`node({ shape: r1, rotate: 90 })` rotates a *copy*. So `r1.out` keeps
reporting its pre-rotation point while `pic.resolve('R1.out')` gives the
rotated one — on a rotated node, go through the picture (or a
`"R1.out"` edge endpoint, which resolves the same way).

**Strings** remain the TikZ-familiar, data-driven route:
`node({ shape: 'resistor' })` still works — the circuits extension
set gives the picture its shape names, so they autocomplete and are
compile-checked too — but `"name.port"` endpoint specs resolve through
`Picture` at runtime, where a typo'd port throws `AnchorError` (with
the known names in the message).

## Logic gates (ext/gates)

Digital logic — jikz's analogue of TikZ's `shapes.gates.logic` — ships
as the opt-in `ext/gates` package, as another shape set:

```ts
import { picture, gateShapes, gates, point } from '@ozan.e/jikz'

// gateShapes is jikz's \usetikzlibrary{shapes.gates.logic.US}
const pic = picture({ shapes: gateShapes })
  .node('X', gates.xor({ at: point(90, 70) }))   // Sum
  .node('C', gates.and({ at: point(90, 150) }))  // Carry
  .coordinate('a', point(20, 50))
  .coordinate('b', point(20, 90))
  .edge('a', 'X.in1', { arrowEnd: 'none' })
  .edge('b', 'X.in2', { arrowEnd: 'none' })
  .edge('a', 'C.in1', { arrowEnd: 'none' })
  .edge('b', 'C.in2', { arrowEnd: 'none' })
pic.toSVG({ width: 230, height: 190 })
```

Gates: `and`, `nand`, `or`, `nor`, `xor`, `xnor`, `not`, `buffer` —
ANSI distinctive shapes (`variant: 'iec'` draws the rectangular body;
pass `text` for the `&`/`≥1`/`=1`/`1` symbol). Two-input gates expose
`in1`/`in2`/`out` ports; `not`/`buffer` expose `in`/`out`. Negated gates
draw a bubble; rotate with `node({ rotate })`.

Shape instances expose typed port accessors for the code-first route,
and the arity is in the type: `gate()` and the per-kind factories hand
back a `BinaryGate` (`in1`/`in2`/`out`) or a `UnaryGate` (`in`/`out`),
so `andGate().in` is a compile error rather than an `AnchorError` at
render time — and when one is wrong at runtime, the error names the
ports that shape does answer to. The rotation caveat above applies here
too: a rotated gate's ports come from the picture, not the instance.

## Gallery

The site's landing page renders every example through the library
itself — the code behind each card's `</>` toggle is exactly what
produced the preview. Every example is a real module in `examples/`:
type-checked by `tsc` and snapshot-tested by `vitest`, so the gallery
can never drift from the library's API.

```sh
npm run dev    # the docs site, gallery first, against the live src/
```

## Develop

```sh
npm install
npm test          # vitest, incl. SVG-output + example-gallery snapshot suites
npm run lint      # eslint (correctness rules; style is by convention, see CONTRIBUTING.md)
npm run build     # tsc typecheck (src + examples) + vite library build → dist/
npm run dev       # docs site with the live gallery (vitepress dev)
```

`scripts/audit-probes*.ts` are manual numerical sanity checks (known
values for intersections, arcs, path operations); run one with
`npx vite-node scripts/audit-probes.ts` and read the PASS/FAIL lines.

Layout: `src/{core,geometry,node,picture,path,render,layout,text,utils}`,
with complex node shapes in `src/geometry/complex/`. The example gallery
lives in `examples/` (one self-contained module per card, registered in
`examples/manifest.ts`). Tests in `test/` mirror `src/`.

## Status

Pre-1.0 (`0.x`): the API is settling but not frozen. Notable recent
breaking change — **anchor angles adopted the screen convention**
(named anchors unchanged in meaning; numeric anchors flipped 90°↔270°
relative to the old math convention). See *Conventions* above.

## License

MIT
