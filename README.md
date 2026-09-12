# jikz

A TikZ-inspired coordinate and drawing library for JavaScript/TypeScript.
Programmatic, precise SVG graphics — nodes, edges, anchors, conics,
patterns, decorations — with a fluent API modeled on TikZ's mental
model, not on a scene graph.

- **Zero runtime dependencies.** Rendering is string-first through jikz's
  own `SVGBuilder`; KaTeX is an *optional* peer for math labels.
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

Full docs live in [`docs/`](docs/README.md):

- **[TikZ → jikz mapping](docs/concepts/tikz-mapping.md)** — if you know
  TikZ, start here: the idiom-by-idiom translation table.
- **[Coordinate system](docs/concepts/coordinate-system.md)** — SVG
  screen space, clockwise angles, and porting rules.
- **[Two API levels](docs/concepts/two-api-levels.md)** — `picture()`
  vs `SVGRenderer`.
- **[ViewBox, sizing & fit](docs/concepts/viewbox-and-fit.md)** and
  **[Node, SSR & browser](docs/concepts/node-ssr-browser.md)**.
- **[Examples](examples/)** — 50 type-checked, snapshot-tested
  modules; browse them live with `npm run dev`.

## Quick start

```ts
import { picture, point } from '@ozan.e/jikz'

const svg = picture()
  .node('A', { at: point(60, 60),  shape: 'circle',    width: 60, height: 60, text: 'A' })
  .node('B', { at: point(220, 60), shape: 'rectangle', width: 90, height: 50, text: 'B' })
  .edge('A', 'B', { arrowEnd: 'stealth', label: 'hello' })
  .toSVG({ width: 280, height: 120 })   // string — works in Node

// In a browser, mount into a container instead:
//   .mount(document.getElementById('out'), { width: 280, height: 120 })
```

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
| `core` | Immutable `Point` with TikZ operators (`toward` = `(A)!t!(B)`, `horAt`/`verAt` = `-\|`/`\|-`), affine `Transform` |
| `geometry` | Line, Circle, Arc, Rectangle, Polygon, Triangle, Ellipse, Parabola, Hyperbola, function plotting (Cartesian/parametric/polar) with scatter plot marks (`circle`, `square`, `triangle`, `diamond`, `pentagon`, `plus`, `cross`, `asterisk`, `oplus`, `otimes` — open or `*Filled`), pairwise intersections |
| `node` | `Node` (any shape + text + inner/outer sep + TikZ-style `labels` = `label=<angle>:<text>`), `Edge` (auto boundary anchors, bend/out/in/looseness, labels, arrow tips), **33 shape types** via `SHAPE_TYPES`, TikZ-style positioning (`nodeAbove`, …) |
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
`fillPattern: 'north east lines'`, `lineCap: 'round'` — typos are
compile errors. `DASH_PATTERN_NAMES` and `PRESET_OBJECTS` export the
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

The TikZ-style extension points are registries — add your own shapes,
arrow tips, fill patterns, and decorations without touching library
source:

```ts
import { AnchoredPolygon, registerShape, registerArrowTip, registerPattern, registerDecoration, point } from '@ozan.e/jikz'

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

registerShape('house', (o) => new House(o))
// Compile-time half of registration: augment ShapeRegistry so the name
// autocompletes and misspellings are compile errors.
declare module 'jikz' {
  interface ShapeRegistry { house: {} }
}
picture().node('H', { shape: 'house', at: point(80, 60), width: 60, height: 50 })

// 2. Custom arrow tip (marker artwork in a 10×10 box, +x = travel direction)
registerArrowTip('pennant', {
  filled: true,
  end:   { d: 'M 0 0 L 10 5 L 0 5 Z', refX: 9 },
  start: { d: 'M 10 0 L 0 5 L 10 5 Z', refX: 1 },
})

// 3. Custom fill pattern (SVG tile fragment)
registerPattern('wavy', {
  width: 12, height: 6, defaultLineWidth: 1,
  createContent: (color, lw) =>
    `<path d="M0 3 Q3 0 6 3 T12 3" fill="none" stroke="${color}" stroke-width="${lw}"/>`,
})

// 4. Custom path decoration
registerDecoration('heartbeat', (path, options) => myTransform(path, options))
```

Registered names are accepted everywhere built-ins are — `node({ shape })`,
`edge(a, b, { arrowEnd })`, `style: { fillPattern }`, `decoratePath` —
and unknown names throw errors listing the known ones. Shape-specific
options pass through `node({ shape: 'star', shapeOptions: { points: 8 } })`.

Shape names are type-checked: `ShapeType` is derived from the
augmentable `ShapeRegistry` interface, so built-ins and extension
names autocomplete in `node({ shape: … })` and misspellings are
compile errors. (Prefer not to register a name at the type level?
Pass a pre-constructed instance instead: `node({ shape: new House(...) })`.)

To compile pictures to a non-SVG backend, implement the 4-method
`PictureRenderer` interface and call `picture().renderWith(yourRenderer)`.

## Circuit diagrams (ext/circuits)

Electrical symbols — jikz's analogue of `\usetikzlibrary{circuits.ee}` —
live in the `ext/circuits` package and are opt-in:

```ts
import { picture, registerCircuits, wire, junctionDot, circuit, point } from '@ozan.e/jikz'

registerCircuits() // once, like \usetikzlibrary{circuits.ee}

const pic = picture()
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

**Strings** remain the TikZ-familiar, data-driven route:
`node({ shape: 'resistor' })` still works — the circuits extension
augments `ShapeRegistry`, so its shape names autocomplete and are
compile-checked too — but `"name.port"` endpoint specs resolve through
`Picture` at runtime, where a typo'd port throws `AnchorError` (with
the known names in the message).

## Logic gates (ext/gates)

Digital logic — jikz's analogue of TikZ's `shapes.gates.logic` — ships
as the opt-in `ext/gates` package, on the same `registerShape` seam:

```ts
import { picture, registerGates, gates, point } from '@ozan.e/jikz'

registerGates() // once, like \usetikzlibrary{shapes.gates.logic.US}

const pic = picture()
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
draw a bubble; rotate with `node({ rotate })`. Shape instances expose
typed port accessors (`x.out`) for the code-first route.

## Demo

The demo page renders every example through the library itself — the
code in each *Code* tab is exactly what produced the preview. Every
example is a real module in `examples/`: type-checked by `tsc` and
snapshot-tested by `vitest`, so the gallery can never drift from the
library's API.

```sh
npm run dev    # vite dev server; examples import the live src/
```

Then open `http://localhost:5173/demo/index.html` (vite port may vary).

## Develop

```sh
npm install
npm test          # vitest, incl. SVG-output + example-gallery snapshot suites
npm run build     # tsc typecheck (src + examples) + vite library build → dist/
npm run dev       # vite dev server (demo page)
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
