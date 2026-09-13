# Changelog

## Unreleased

### Added

- **`ext/mindmap` — mind maps (TikZ `mindmap`).** `mindmap(root, …)`
  lays a concept tree out radially with TikZ's own per-level sizes,
  level distances and sibling angles (`conceptLevels`, and
  `smallConceptLevels` for its `small mindmap`), returning plain
  values: where each concept sits, how big it is, and a fillable path
  per link. The link is `circleConnectionBar`, a port of PGF's
  `circle connection bar` decoration — a cap flaring out of one rim
  across the decoration's 20° span, a bar at `0.175 × min(radius)`, and
  a mirrored cap flaring into the other. Fill it and never stroke it,
  as TikZ does, and draw bars before circles so they vanish underneath.
  Concept colours cascade to descendants that name none. Where two
  circles crowd closer than the two flares want — TikZ's own
  `small mindmap` level 1 does — the straight section is dropped and
  the flares alone carry the link, since PGF's bar rectangle would have
  negative width there. Not ported: `circle connection bar switch
  color`, which shades a bar between two concept colours; the bar is an
  ordinary path, so `style: { gradient }` covers it.

- **`ext/spy` — magnified insets (TikZ `spy`).**
  `spy(pic, { on, at, magnification, size })` draws a region twice: an
  outline where it lives and a magnified copy where there is room,
  optionally joined by a line (`connect spies`). TikZ collects its
  scope into a box and replays it under the lens; jikz replays the
  container's own items into a clipped, scaled scope, so `spy()` must
  be called *after* whatever it magnifies (or handed `content`). The
  outline's size falls out of the arithmetic TikZ expresses by
  inverting the lens: an inset `size` across at magnification `m` shows
  `size / m` of the original. `lens: 'circle'` clips to a disc, and
  strokes thicken with the lens exactly as TikZ's canvas transform
  thickens them.
- **`ItemContainer.adopt(items)`** — append already-built items from
  another container's `items`. Unlike the drawing verbs it registers no
  names, which is what makes drawing a picture inside itself possible:
  `node()` refuses a duplicate name, and a replayed item needs no
  registry because an edge resolved its endpoints when it was created.
  This is the seam `ext/spy` is built on.

- **`ext/fadings` — opacity masks (PGF `fadings`, TikZ `path fading`).**
  PGF builds a fading from a picture and reads its *luminance* as
  alpha; SVG masks follow the same rule, so each fading is the gradient
  that paints one and `fading` is a new style key on any path, backed
  by a `<mask>` through `DefsManager` like gradients and clip paths.
  `fading` on a scope is TikZ's `scope fading`. PGF's predeclared
  fadings port exactly: the axial four (`east`/`west`/`north`/`south`,
  each naming the side it disappears towards) hold full opacity for the
  first quarter and full transparency for the last, ramping across the
  middle half; the radial ones put the rim at half the shading radius
  with the fuzzy band eating inward, and `fuzzy ring 15 percent` peaks
  halfway across that band. `axialFading`/`circleFading`/`ringFading`
  generate the same shapes at any angle or percentage —
  `axialFading` is also what TikZ's `fading angle` amounts to. Two
  limits: `fit fading=false` has no equivalent, since an unfitted mask
  would have to be rebuilt per element rather than shared as a def, and
  `\tikzfadingfrompicture` is not supported — every fading is a
  gradient, as all of PGF's own are.
- **`ext/turtle` — turtle graphics (TikZ `turtle`).** `forward`/`back`/
  `left`/`right`/`home` and the `fd`/`bk`/`lt`/`rt` shortcuts, over a
  heading and a step, tracing an ordinary `Path`. TikZ's
  `turtle/distance` (1cm) and `turtle/direction` (90, up the y-up page)
  carry over — the latter as `-90`, since angles here are jikz screen
  degrees. The turns are named rather than signed, so a TikZ turtle
  program ports unchanged; only an explicit `direction` flips. Three
  verbs go past TikZ's keys because L-systems need them and TikZ
  supplies them there instead: `jump()` (move without drawing),
  `push()` and `pop()`.
- **`ext/lindenmayer` — L-systems (PGF `lindenmayersystems`).** A
  system is rules plus optional symbol overrides, exactly as
  `\pgfdeclarelindenmayersystem` takes them; `lindenmayer(system, …)`
  expands and traces it with a turtle, returning a `Path`. PGF's
  default alphabet is carried over character for character — `F` draw,
  `f` move, `+`/`-` turn by `leftAngle`/`rightAngle`, `[`/`]` save and
  restore — along with `step=5pt` and `angle=90`, and a symbol with
  neither rule nor action is skipped, which is what makes pure
  rewriting symbols work. `kochCurve` and `hilbertCurve` ship as the
  PGF manual declares them, swapped `+`/`-` and all. Two departures:
  randomization is seeded (so a picture stays reproducible) and reads
  `randomize step percent` as an actual percentage of the step —
  PGF adds an absolute `rand·percent/20`, which at its manual's own
  `step=2pt, randomize step percent=50` can hand back a negative step;
  and `expandLSystem` refuses past a million symbols rather than
  hanging on a runaway order.
- **`ext/automata` — finite automata (TikZ `automata`).** TikZ ships
  this as `\tikzset` styles rather than shapes, and the port keeps that
  shape: `state` is a circle with `minimum size=2.5em` (25 at the
  default 10pt font), `state with output` is the existing `circle
  split`, and `initial` is an ordinary edge — `initialArrow(state)`
  returns where it starts and where its `start` label sits, since
  `edge()` already takes a bare point and clips to the boundary. The
  one new shape is `accepting`: TikZ's `accepting by double` thickens
  the stroke on the node's own path, so `DoubleCircle` puts two real
  rings at `radius ± separation/2` — the nominal circle stays exactly a
  plain state's size, anchors report the outer ring (what TikZ's
  `outer sep=.5\pgflinewidth+.3pt` buys), and both rings wind alike so
  the disc still fills solid behind a label. `separation` defaults to
  the line width plus TikZ's `double distance` (0.6); widen it when you
  draw with a thicker pen.
- **`ext/er` — entity-relationship diagrams (TikZ `er`).** The smallest
  library in the TikZ tree, ported at the same size: four styles over
  the geometric primitives, no new shapes. `entity` is a rectangle at
  `4×2\baselineskip`, `relationship` a diamond with TikZ's tighter
  `inner sep=1pt`, `attribute` an ellipse at `1.5\baselineskip`. The
  minimums live in the shape factories, so `{ shape: 'entity' }` and
  `er.entity()` size identically. `er.keyAttribute()` is named but
  draws as `attribute`: TikZ separates the two by `font=\itshape`
  alone, and jikz has no italic for node text yet.
- **`ext/angles` — angle marks (TikZ `angles`).** `angleMark(a, b, c)`
  and `rightAngleMark(a, b, c)` port TikZ's `angle` and `right angle`
  pics, middle argument the vertex. TikZ splits a pic into background
  code (a filled wedge behind the path) and foreground code (a stroked
  arc in front); with no host path to straddle, both come back as plain
  values on one `AngleMark` — `wedge` to `fill()`, `outline` to
  `draw()`, `labelAt` for the text — so paint order is call order.
  TikZ's defaults are carried over exactly: `angle radius=5mm` (with
  the non-positive fallback to 12), `angle eccentricity=0.6`, and the
  right angle's √2 label push. Argument order stays significant —
  `(a, b, c)` and `(c, b, a)` mark the two different angles at `b` —
  and `sweep` reports the measure TikZ computes internally and
  discards. Two departures: points may be any `PointLike`, not only
  node names as TikZ requires, and the arrowed form
  (`pic [draw, ->]`) has no equivalent, since jikz honors `arrowEnd`
  on edges only.
- **`ext/dataviz` — data visualization (TikZ `datavisualization`).**
  Scaled axes with Heckbert "nice number" ticks, gridlines, tick and
  axis labels, a legend, and `line`/`scatter`/`bar` series builders —
  no more hand-rolled axes. `chart(pic, { series, … })` is the one-call
  builder: domains infer from the data (`domain: 'auto'`, widened to
  nice tick boundaries; bar series pin the baseline at 0), labeled
  series collect into a framed legend at the north-east corner of the
  plot area. `axes(pic, …)` returns a `ChartFrame` — the `x`/`y`
  scales, plot area, and resolved ticks plus `.line()/.scatter()/.bars()`
  builders — so custom drawing stays in data space, and `legend()`
  works standalone. Pure drawing on the public container verbs: no
  shapes to register, composes with any shape set.
- **Markings along a path (TikZ `decorations.markings`).**
  `markPath(guide, …specs)` places arrow tips or plot marks at
  positions along any guide — a `Path` or anything with an SVG outline
  (`Arc`, `Circle`, shapes; the new `PathLike` union converts through
  `pathFromSVG`). `{ mark: 'stealth', at: 0.5 }` is TikZ's
  `mark=at position … with \arrow{…}`; `between: [a, b]` + `step` is
  the repeated form; `scale` sizes the artwork. Tips rotate with the
  tangent, plot marks stay upright, and marks inherit the path's
  stroke color. Names resolve arrow-tip first, then plot mark —
  `{ plotMark: 'circle' }` forces the scatter namespace for names both
  claim. Returns a `MarkedPath` renderable (base path + resolved
  marks), dispatched by `SVGRenderer` like `Plot`.
- **Text along a path (TikZ `decorations.text`).**
  `textAlongPath(guide, text, options)` flows text along any
  `PathLike` via SVG `<textPath>`: the guide goes into `<defs>`
  (never painted) and the text rides it, staying selectable, crisp
  type. `anchor: 'middle'` centers on the midpoint (startOffset
  derives from the anchor unless given); `side: 'right'` walks the
  guide backwards to flip the text to the other side — arcs included,
  via dense resampling (`Path.reverse` drops arc/quadratic segments).
  Text color follows the text convention (the resolved stroke) unless
  `color` is set. KaTeX cannot flow along a curve — plain text only.

- **Graph layout — `graph()` (force-directed + circular).** A unified
  builder for arbitrary graphs (cycles, undirected, disconnected — no
  structural assumptions, unlike `tree`/`layered`). `.force({ seed })`
  runs a seeded Fruchterman–Reingold spring embedder (repulsion +
  attraction + cooling, viewport-clamped, deterministic per seed);
  `.circular()` places nodes on a ring sized from the node count
  (`order: 'given' | 'degree'`). The result mirrors `LayeredResult`
  (`{ nodes, edges, getNode, toRenderables, bounds }`).
- **`ext/gates` — logic gates.** The opt-in `registerGates()` package is
  jikz's `shapes.gates.logic`: `and`/`nand`/`or`/`nor`/`xor`/`xnor`/
  `not`/`buffer` with ANSI distinctive shapes (D-shape, concave-OR,
  triangle) and IEC rectangular bodies (`variant: 'iec'`); negated gates
  draw a bubble, and `gates.*` builders mirror `circuit.*`. A gate's
  arity is part of its type: `gate(kind)` and the per-kind factories
  return a `BinaryGate` (ports `in1`/`in2`/`out`) or a `UnaryGate`
  (`in`/`out`), both extending the abstract `LogicGate` that carries the
  drawing and the `out` port every gate has — so `andGate().in` is a
  compile error rather than an `AnchorError` at render time.
  `UNARY_GATE_PORTS`, `BINARY_GATE_PORTS` and `GATE_PORTS` (the union)
  are the matching compile-time vocabularies, pinned against the runtime
  port tables. Built entirely on the `registerShape`/port seams shared
  with ext/circuits.
- **SVG path import.** `pathFromSVG('M … C … Z')` parses any SVG `d`
  string — absolute/relative, `H`/`V`/`S`/`T` shorthand, implicit
  `M`→`L`, arcs with packed flags, sign-separated/exponent numbers —
  into a `Path` (the inverse of `toSVGPath()`), so imported paths can be
  drawn, decorated, measured and transformed. `parsePathData` exposes
  the raw segment normalization; `rotatePathData` now reuses the same
  parser (`Path.rotate` + `toSVGPath(precision)`), and `toSVGPath` gained
  an optional precision argument for compact output.
- **Named style registry (`\tikzset`).** `registerStyle('name', recipe)`
  defines a reusable style; `parseStyleString('name, …')` and
  `resolveStyle([...])` resolve it alongside the built-in presets, and
  the frozen object it returns works in the array form
  (`style: [name, …]`). Recipes compose other names (`['brand', dashed]`)
  eagerly; re-registering replaces, and registered names shadow
  built-ins. `hasStyle`/`registeredStyleNames` introspect the namespace.
- **The `shade` verb + named shadings.** `pic.shade(obj, { … })` is
  TikZ's `\shade` — a gradient fill spanning the shape's bounding box.
  Accepts an explicit `gradient` spec or the TikZ color keys
  (`leftColor`/`rightColor`, `topColor`/`bottomColor`, `innerColor`/
  `outerColor`, `middleColor`, `ballColor`, `shading: 'axis' | 'radial' |
  'ball'`). New builders `axisShading`/`radialShading`/`ballShading` +
  `resolveShading` turn those keys into the existing `GradientSpec`.
- **The `to` path verb.** `pen.to(point, { out, in, bend, looseness })`
  now draws TikZ's `to[out=…, in=…]` curved connector — a single Bézier
  whose control points derive from the angles. `bend: 'left' | 'right'`
  is the symmetric shorthand (30° default); `to(point)` with no keys
  stays a straight `--`. The underlying Bézier math was extracted from
  `Edge` into a shared `bezierControlPoints` helper (`out`/`in`/`bend`/
  `looseness`/`outLooseness`/`inLooseness`), so edges and pen segments
  now route through one implementation.
- **More arrow tips.** `circle` (`*`), `openCircle` (`o`), `square`,
  `diamond`, `roundCap`, and `doubleBar` (`||`) join `stealth` / `latex` /
  `to` / `bar`, all registered through the same public `registerArrowTip`
  seam (10 built-in tips; TikZ spellings resolve to them).
- **Plot marks.** `plot()` / `plotParametric()` / `plotPolar()` /
  `plotFromPoints()` / `plotFromCoords()` accept a `marks` option
  (`{ name, size, every }`) that draws scatter markers at each — or every
  Nth — sampled point. Marks inherit the plot's stroke color; open marks
  stroke it and `*Filled` marks fill with it. TikZ spellings accepted:
  `*`, `+`, `x`/`X`, `o`.

### Changed

- **The ported-shape base moved out of the circuits extension.**
  `CircuitSymbol` and `symbolSize` are now `PortedShape` and
  `intrinsicSize` in `geometry/PortedShape` — logic gates were importing
  them from `ext/circuits/ports`, which made one extension depend on
  another's internals. `ext/circuits` keeps what is circuit-specific:
  `TwoTerminalSymbol`, `twoTerminalPorts` and the port-name constants.
- **`AnchorError` names the anchors the shape does answer to.** A typo'd
  port used to produce a message listing only cardinals; it now reads
  `… This shape's own anchors: "in1", "in2", "out".` when the shape has
  ports, and carries them as `error.known`.

- **`mount({ panZoom })` takes the `attachPanZoom` function.** The flag
  form is gone: pass the function itself, or an object carrying it
  alongside options.

  ```ts
  import { attachPanZoom } from '@ozan.e/jikz'
  pic.mount(el, { fit: true, panZoom: attachPanZoom })
  pic.mount(el, { fit: true, panZoom: { attach: attachPanZoom, maxScale: 6 } })
  ```

  Importing the controller is now the opt-in, so `Picture` no longer
  references it and a drawing that never pans stops carrying it:
  `import { picture, point }` drops from 101,661 to 96,838 bytes
  minified (29.2 kB gzipped). Behaviour, the controller API and the
  viewport-group wrapping are unchanged.

- **Fill patterns are values, like shapes.** A pattern is a
  `PatternKind` — a tile definition carrying its name — and the twelve
  TikZ tiles live in the `fillPatterns` set:

  ```ts
  style: { fillPattern: fillPatterns.dots }
  style: { fillPattern: { pattern: fillPatterns.grid, color: '#2563eb', scale: 1.5 } }
  const wavy = definePattern('wavy', { width: 12, height: 6, defaultLineWidth: 1, createContent })
  ```

  `registerPattern`, `getPatternDefinition`, `registeredPatternNames`,
  `isPatternName`, `PATTERN_DEFINITIONS` and the string form
  (`fillPattern: 'dots'`) are gone, as are the twelve `pattern *` style
  preset NAMES — the `patternDots`/`patternGrid`/… preset objects remain
  and now carry the value. The renderer no longer looks a pattern up, so
  it cannot throw for an unknown one, and a picture that never fills
  with a pattern no longer carries the tiles: `import { picture, point }`
  drops from 104 kB to 102 kB minified.

  Arrow tips and path decorations deliberately stay registries: their
  tables are small and nearly every edge draws a tip, so the ceremony
  would cost more than the bytes. CONTRIBUTING records that split.

- **Shapes are values; the global shape registry is gone.** A shape is
  now a `ShapeKind` — a factory plus the one flag Node needs to size it
  — and a *name* is a key in an ordinary object:

  ```ts
  const pic = picture({ shapes: { ...allShapes, ...gateShapes } })
  pic.node('A', { shape: 'and' })                 // resolved from the set
  pic.node('B', { shape: allShapes.star, shapeOptions: { points: 8 } })
  ```

  Because the set is a value, TypeScript reads the names *and* the
  per-name option types straight off it, so `ShapeRegistry`,
  `ShapeType`, `SHAPE_TYPES` and the `declare module` recipe are gone
  along with `registerShape`/`createShape`/`hasShape`/
  `registeredShapeNames`/`shapeTextAutoSize`. Two libraries can no
  longer disagree about what a name means — that collision used to be a
  TS2717 error in the consumer's build, unfixable without patching one
  of them. Unknown names throw at the `node()` call that used them,
  naming what IS in scope.

  Extensions are plain exports: `registerCircuits()` and
  `registerGates()` are replaced by the `circuitShapes` and `gateShapes`
  sets, and a custom shape is `defineShape('house', (o) => new House(o))`
  with no registration step. `picture()` and `Scope` are generic in
  their shape set; a helper that takes any picture types it as
  `Picture<any>`.

  This is what drops the floor a `picture()` import costs: 104 kB
  minified / 31 kB gzipped, down from 195 kB / 45 kB, because the
  catalogue is no longer welded onto `Node` by a global table. Ask for
  `allShapes` and you are back at the old size — by choice, now.

- **JavaScript sourcemaps ship with the ES modules.** Each `dist/**/*.js`
  has a `.js.map` beside it, and `src/` is included in the package so
  the maps (and the existing `.d.ts.map` files) resolve to real source
  in debuggers and go-to-definition. Maps carry mappings only, not a
  second copy of the source. The UMD build has no map.
- **KaTeX peer range widened to `>=0.16.0`.** The adapter only needs
  `renderToString`; verified against KaTeX 0.18.
- **Repository scaffolding for contributors.** `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.editorconfig`, an ESLint config
  (`npm run lint`, correctness rules only — no formatter), and a
  Bitbucket Pipelines CI that runs lint, build, tests, package checks
  and the docs build, plus build + test on Node 18. `prepublishOnly`
  now runs lint too.

- **The package is now tree-shakeable.** `package.json` declares
  `"sideEffects": false`, the ES build keeps one file per source module
  (`dist/index.js` is the entry; `module` and `exports.import` point at
  it) instead of a single 500 kB bundle, and the built-in shape, arrow
  tip and decoration registries fill their tables on first use rather
  than at import time. Nothing changes for callers: every registry
  lookup registers the built-ins first, so `shape: 'star'` still just
  works and a user `registerShape('star', …)` still wins over the
  built-in. Measured through a consumer's bundler: `import { point }`
  now costs 2 kB minified / 0.9 kB gzipped instead of 147 kB / 29 kB;
  `{ circle, intersectLineCircle }` 6 kB / 2 kB; a `picture()` about
  207 kB / 47 kB, which is its real floor because string shape lookup
  needs every shape. `test/build/tree-shaking.test.ts` bundles those
  imports with esbuild and fails if the geometry-only case grows past
  40 kB; `test/render/LazyBuiltins.test.ts` pins the registration
  order. The UMD build is unchanged.

### Fixed

- **`Path.scale()` mirrored arcs the wrong way.** A negative scale
  factor reflected each segment's endpoints but left arc `sweep` flags
  untouched and made `rx`/`ry` negative, so a mirrored arc kept bowing
  the direction it did before the flip — a half-circle mirrored about
  its chord came back identical. Reflections now flip `sweep` and keep
  radii positive.

- **Clipped scopes were measured by everything inside them.**
  `contentBounds()` — and so `{ fit: true }` — ignored a scope's
  `clip`, so a scope that both scaled and clipped (what `ext/spy`
  does) could inflate the viewBox many times over. Clipped scopes are
  now measured by the intersection of their content with the clip, in
  the scope's own coordinates, since SVG scales a `clip-path` by the
  element's own transform. A path clip still over-reports rather than
  parsing its `d`.

- **`ext/dataviz` review fixes.** Ten findings from code review, all
  pinned by tests:
  - `axes()` no longer throws on flat domains — a single `tickValues`
    entry, all-equal tick values, or an explicit `domain: [v, v]`
    (`exact` or not) widen by ±0.5 instead of crashing `linearScale`.
  - Non-finite data points are skipped by every series builder —
    line, scatter and bars — matching the `Plot` convention: a `NaN`
    used to land in the path data and blank the whole series element,
    and in a bar it produced a `NaN` rect. One `isFiniteSample`
    predicate backs all three. `dataDomain`/`mapSeries` skip them too,
    `niceTicks(NaN, …)` returns no ticks on a safe range, and a
    non-finite bar baseline falls back to 0.
  - Scatter marks styled by fill (`{ fill, stroke: 'none' }`) are no
    longer invisible — the mark color falls back from the style's
    stroke to its fill, then black.
  - A one-point `frame.line()` series still draws its marks (the
    path skips, the marker paints).
  - `legend()` defaults survive explicit `undefined` fields
    (`fontSize: undefined` no longer defeats the default font size) —
    per-field `??` instead of a spread.
  - The legend frame takes a style: `frame: { fill, stroke }` merges
    over the default light frame (dark canvases).
  - `niceNumber(0)`/negative/non-finite input returns 1 instead of
    `NaN`.
  - `frame.bars()` doc corrected: the baseline clamp covers the
    baseline only; out-of-domain values still draw outside the plot
    area (data is never clipped silently).
  - `drawMarks` parses the mark glyph once per series instead of once
    per point.
  - New reference page `docs/reference/ext-dataviz.md`.

- **The typed port accessors' rotation caveat is documented.** `r1.out`
  and `g.in1` read the instance you built, and `node({ shape: r1,
  rotate: 90 })` rotates a copy — so a rotated node's ports come from
  the picture (`pic.resolve('R1.out')`), not the instance. Unchanged
  behaviour, now stated in the README, on `PortedShape`, and pinned by a
  test.

- **`layered()` no longer throws on cyclic input, and its network simplex
  is ~5× faster.** Cycle removal reverses back-edges, so a 2-cycle a→b,
  b→a became two parallel a→b edges. The network simplex assumes a
  simple graph — its cut-value bookkeeping finds "the" tree edge between
  two vertices by endpoints — so parallel pairs were double-counted, cut
  values drifted, and a pivot could be chosen with no entering edge:
  `build()` threw "network simplex: no replacement edge found
  (infeasible)" (a 5-node, 9-edge graph reproduces it). Ranking now
  merges parallel edges first (`mergeParallelEdges`: weights summed,
  minLength maxed — dagre's `simplify`), and the pivot loop has a
  defensive cap so any future degeneracy degrades to a feasible ranking
  instead of a hang.

  The simplex internals moved from `Map`/`Set` keyed by object identity
  to integer-indexed typed arrays with iterative DFS (no recursion-depth
  limit). Iteration order is unchanged, so every pivot — and every
  snapshot — is identical; the per-pivot low/lim, cut-value and rank
  recomputation is just cheaper. A random 100-node / 200-edge cyclic
  graph builds in 0.9 s instead of 4.5 s with the default Gansner
  coordinates (0.06 s with `coordinates: 'brandes-koepf'`); the
  acyclic equivalent went from 0.19 s to 0.05 s.

- **Published types now resolve under every TypeScript module-resolution
  mode.** `exports` listed `types` last, so TypeScript only found
  `dist/index.d.ts` through a fallback bug, and the emitted declarations
  used extensionless relative imports that Node16/NodeNext ESM resolution
  rejects. `types` now comes first in each condition, a post-build step
  (`scripts/postbuild-dts.mjs`) appends `.js` to relative specifiers and
  writes `.d.cts` twins for the `require` condition, and
  `npm run check:pkg` (publint + arethetypeswrong) runs in
  `prepublishOnly` to keep it that way.

- **`tree()` no longer overlaps branches with variable node sizes in
  parent alignment.** The contour packing walked the facing contours in
  level lockstep and separated each pair on the cross axis only — correct
  when the growth-axis coordinate is a function of tree depth (uniform
  nodes, or `align: 'rank'`'s shared columns), but parent alignment
  places each child right after its own parent's far edge, so a
  shallow-but-wide node in one branch could reach past the near edge of a
  deeper node in a neighbouring branch. The lockstep walk never compared
  that pair and the branches' boxes overlapped.

  The layout engine now follows van der Ploeg, *"Drawing Non-Layered
  Tidy Trees in Linear Time"*: growth-axis positions are computed first
  (they are independent of the cross axis in both align modes), and each
  subtree carries its left/right contour as a piecewise function of the
  growth axis. Placing a sibling merge-scans those segments, so only
  nodes whose growth-axis ranges actually overlap demand separation —
  deep descendants are pushed clear of wide uncles, while subtrees whose
  ranges never meet still interleave on the cross axis (no degeneration
  to bounding-box packing). One engine now serves both `align` modes; the
  Buchheim lockstep walk, threads and shift/change machinery are gone.
  Children pack as tight as the contours allow (the previous engine's
  even-distribution redistribution is dropped) and parents still centre
  over their outermost children.

## 0.7.0

### Added

- **First-class pan/zoom for mounted pictures.**
  `picture().mount(el, { fit: true, panZoom: true })` now returns a
  `PanZoomController`: wheel zooms to the cursor (exponential factor, so
  trackpads are smooth and notched wheels match `wheelFactor` per click),
  pointer-drag pans with a 3px click-safe threshold (pointer capture is
  taken lazily at the threshold, so a plain click's compatibility event is
  never retargeted off the scene element under the cursor), two-pointer pinch
  zooms, and double-click resets to the fitted view. With `panZoom` the
  root svg fills its container and the browser letterboxes the viewBox, so
  the fitted view needs no pixel math and hidden (0×0) containers need no
  refit. All state lives in one `<g class="jikz-viewport">` wrapping the
  scene — panning mutates a single `transform` attribute, never re-renders.
  `wasDrag()` separates drags from clicks, `screenToUser()` converts
  client coordinates for hit-testing, `onTransform` reports every change
  so views survive remounts, and `destroy()` detaches all listeners.

  The transform math (`meetFit`, `screenToScene`, `sceneToScreen`,
  `zoomAtScreenPoint`, `panByScreenDelta`, `clampScale`) is exported as
  pure functions — DOM-free and unit-testable, matching the library's
  plain-data architecture. Cursor conversion uses viewBox letterbox math
  rather than `getScreenCTM`, so jsdom tests can stub the rect.

  New `SVGRendererOptions.viewportGroup` wraps the scene in the viewport
  group without interaction (inside any canvas-transform group), and
  `attachPanZoom(svg, viewBox, options)` attaches a controller to an
  already-mounted picture.

- **Declarative SMIL animation.** Every render call — nodes, edges, bare
  draws, text — accepts `animate: SVGAnimation | SVGAnimation[]`, emitted
  as `<animate>`/`<animateTransform>` children of the element. Plain data
  in the SVG tree: it serializes into `toSVG()` output (a saved static
  file still animates) and mounts unchanged. `SVGAnimation` covers
  `attributeName`, `values` or `from`/`to`, `dur`, `repeatCount`, `begin`,
  `keyTimes`, `calcMode`/`keySplines`, `fill`, and `kind: 'animateTransform'`
  with its `type` (`scale`/`rotate`/…). On nodes the animation lands on
  the wrapping `<g>`, so shape and label animate together. CSS animation
  stays available via `className`/`attributes`.

- **Tree truncation: `collapsed` and `maxDepth`.** Large trees can be
  laid out in windows: `TreeNodeSpec.collapsed: N` (or
  `.collapsed(N)` on the builder) lays a node out as a leaf and records
  the N withheld descendants on the result's new `collapsed` list — the
  bookkeeping that drill-in markers (`+N›`) and click-to-re-root build
  against. `tree({ maxDepth })` caps the layout at a depth with no
  markers, for pure display truncation. Expansion state, marker visuals
  and re-rooting stay app-side; see
  [`examples/large-tree-collapse.ts`](examples/large-tree-collapse.ts).

### Fixed

- **Elements with both text content and children no longer drop the
  children.** `SVGBuilder`'s serializer and DOM mounter treated `text`
  and `children` as mutually exclusive, which would have silently
  discarded `<animate>` children on `<text>` elements. Text now emits
  first, children after.

## 0.6.0

### Changed

- **Text measurement is deterministic across environments.** `measureText`
  used canvas in the browser and a table in Node, so a picture rendered
  server-side and re-rendered on the client measured differently and the
  diagram reflowed on hydration — auto-sized nodes, label placement and
  `{ fit: true }` viewBoxes all depend on it. The default backend is now
  a built-in per-character width table used identically in Node, workers
  and the browser.

  Accuracy improved substantially as a side effect. The old model charged
  every character the same 0.55 em, which over a sample of realistic
  labels was off by a mean of 42% and up to 148% (`"i"` measured 148% too
  wide, `"W"` 42% too narrow, `"CEO"` 24% too narrow — that last kind
  overflowed its own box). Widths now come from the Adobe core-14 AFM
  metrics: exact for Helvetica, Arial and Liberation Sans, for Times New
  Roman and Nimbus Roman, and for Courier clones. Bold widens
  proportional faces by 5%; full-width forms (CJK, kana, Hangul) advance
  a whole em instead of 0.55.

  Browser-only projects using a webfont with different metrics can opt
  back in with `setTextMeasurementBackend('canvas')`, at the cost of the
  SSR agreement. 29 example snapshots moved; auto-sized boxes now contain
  their text in cases where they previously clipped it.

- **`tree()` packs siblings by contour instead of bounding box.**
  Reingold–Tilford, via Buchheim et al. 2002's linear-time formulation,
  generalized for variable node sizes. Previously each subtree reserved
  its widest level's width at *every* level, so two subtrees whose widest
  levels sat at different depths could never interleave even when nothing
  collided — on random trees 74% of drawings carried reclaimable space,
  a mean of ~4 node widths (worst case ~13). Now they mesh: drawings are
  15–20% narrower, with `siblingDistance` still honored exactly and no
  overlaps.

  Two visible changes: layouts are tighter, and a parent now sits midway
  between its outermost children's *centers* (so its edges are
  symmetric) rather than at the center of their combined span. Three
  example snapshots moved accordingly.

- **Network simplex micro-optimizations.** Queue traversals use a head
  index instead of `Array.shift()`, and `balanceRanks` keeps one rank
  histogram instead of rebuilding it per vertex (O(V²) → O(V)). Layout
  output is unchanged; `layered()` builds are ~10% faster at a few
  hundred nodes. The dominant cost remains the per-pivot low/lim and
  cut-value recomputation — see `coordinates: 'brandes-koepf'` to avoid
  it entirely.

### Fixed

- **`layered()` options no longer lose their defaults to an explicit
  `undefined`.** `layered({ nodeSep: maybeUndefined })` spread the
  `undefined` over the default, and the option then reached the layout
  as `NaN`. Undefined entries are now dropped before merging.

- **Self-edges draw a real loop.** `edge('A', 'A')` produced a
  zero-length path that painted nothing, and `loopEdge` was worse than
  it looked: `'auto'` anchors resolve along the ray toward the other
  endpoint, which for a self-edge is `atan2(0, 0)` = 0, so *every* loop
  started and ended on the node's east boundary whichever way it bulged.
  Its angle table was wrong too — `loop above` put one control point
  above the node and the other below it, swinging the curve around the
  left side instead.

  Both ends now land on the boundary in the out and in directions, so
  the loop hangs off the named side and scales with the node instead of
  a fixed nominal chord. A new `loop: 'above' | 'below' | 'left' |
  'right'` option is TikZ's `to[loop above]`, and a self-edge with no
  angles given defaults to a loop above rather than painting nothing.
  Explicit `out`/`in`/`looseness`/anchors still win.

  `LOOP_ANGLES` is exported for the mapping. The three examples using
  self-loops (`dfa-acceptor`, `tcp-states`, `edge-routing`) had all
  hand-copied the old broken angles; they now use `loop: 'above'`.

- **`layered()` handles self-edges.** A self-loop used to enter the
  pipeline as an ordinary edge: it skewed the crossing counts, added a
  useless vertex to the coordinate simplex, and then rendered as a
  degenerate zero-length edge. It is now held out of the layout
  entirely — ranks and coordinates are identical with or without it —
  and re-attached at render time as a loop, defaulting to the side that
  does not collide with the rank direction (`'right'` for vertical
  growth, `'above'` for horizontal). `LayeredEdgeSpec.loop` overrides.
  `incoming`/`outgoing` report the node as its own neighbour.

- **`layered()` no longer hangs on some node sizes.** The network
  simplex tested edge tightness with `slack === 0`. Ranks are integers
  when it assigns ranks, but the coordinate pass feeds it separator
  edges whose length is `halfWidth + nodeSep + halfWidth` — measured text
  extents, so arbitrary reals. A slack of 7.1e-15 then made
  `feasibleTree` spin forever: `tightTree` refused to absorb the edge,
  `findMinSlackEdge` handed the same edge back, and shifting the tree by
  7.1e-15 changed nothing. Tightness and cut-value sign now carry a 1e-9
  tolerance. Latent since the coordinate pass landed; reachable with any
  font size or node text whose measurement happens to leave that residue.

- **KaTeX labels no longer wrap mid-formula in the browser.** KaTeX
  emits multiple `.base` spans (e.g. for `$A \cap B$`) and its CSS only
  applies `white-space: nowrap` per `.base`; the foreignObject's inner
  div now sets `white-space: nowrap` itself, so a box measured before
  KaTeX's web fonts load overflows symmetrically around the anchor
  point instead of wrapping the second base onto its own line.

### Added

- **Clusters — `layered().cluster(name, members, options?)`.** A subgraph
  box, Graphviz's `subgraph cluster_x`. The result carries each cluster's
  `bounds`, a ready-made `rect`, its member nodes and its label.

  It is a layout *constraint*, not a bounding box after the fact —
  `rectFit` already did that. Members are kept contiguous in every rank
  they occupy (crossing minimization gained an order-preserving group
  repair), and left/right border vertices go on every rank the cluster
  spans, including ranks it has no member on, so a foreign edge passing
  the cluster is pushed clear of the box rather than routed through it.
  Border vertices carry a per-vertex `gap` that overrides `nodeSep`, so
  the box hugs its contents; `clusterPadding` defaults to 12 and is
  overridable per cluster. Both coordinate assigners are supported.

  Two consequences worth knowing: adding a cluster can move nodes,
  because the border chains give the coordinate pass structure it did not
  have before; and the box counts as content, so `at` anchors the box
  rather than the leftmost node.

  **Clusters nest**: a member may be a node or another cluster, which
  must already be declared. Each entity has at most one direct parent, so
  the nesting is a tree. Contiguity is enforced at every level — the
  ordering repair recurses down the nesting path, and `groupPin` applies
  among a block's own contents, so a cluster's borders end up outside its
  members *and* outside any nested box. A parent absorbs its children's
  boxes, so nesting holds even when a child asks for more padding than
  its parent. Each cluster reports its `depth`, `parent` and `children`,
  and `nodes` is transitive; paint boxes outermost first.

  **Per-cluster growth direction**: `cluster(name, members, { grow })`
  gives a cluster its own rank direction — a left-to-right stage inside a
  top-to-bottom diagram. Such a cluster cannot be an ordering constraint,
  since two rank directions have no common rank assignment, so it is laid
  out as a graph in its own right, collapsed to a single placeholder node
  the size of its box, and the parent laid out around it; the sub-layout
  is then re-run at the position its placeholder ended up in. Re-running
  rather than translating keeps every coordinate coming from the layout
  itself.

  Edges crossing the boundary are given to the parent so it ranks the
  cluster correctly, then rebuilt against the real endpoints, so they
  attach to the node they name rather than to the box. Adjacency,
  `getNode` and `level()` all report real nodes — nothing internal leaks
  — and the cluster counts as a single rank of the outer graph. It
  composes in every direction: inside a plain cluster, containing one, or
  nested in another independently-grown cluster.

  **Edges may name a cluster**: `edge('client', 'svc')` arrives on the
  box border rather than on a node inside it, and cluster-to-cluster
  edges work the same way. Ranking still needs a real vertex, so the
  layout runs against a representative member — the cluster's entry (a
  member with no edge from inside) for an edge coming in, its exit for
  one going out — and only the drawn geometry uses the box. `Rectangle`
  is `Anchorable`, so the edge's usual boundary resolution does the
  clipping. For a cluster with its own `grow` the box *is* the
  placeholder the parent laid out against, so its edge is kept as the
  parent drew it instead of being rebuilt against a member.

  Ill-defined cases throw: a cluster to itself, a cluster to a node
  inside it, and one nested cluster to another.

  Overlapping clusters throw rather than laying out wrongly.

- **`Edge.bounds`.** `Edge` was in the `Renderable` union but had no
  `bounds`, so `pic.draw(someEdge)` with `{ fit: true }` threw a
  TypeError inside the bounds walk. Bend points and, on curved edges, the
  bezier control points are included, so a bent edge or a self-loop is no
  longer clipped by a fitted viewBox.

- **Scopes — `pic.scope(options, build)`.** TikZ's `\begin{scope}`. The
  picture's flat item list becomes a tree: a scope holds its own items,
  cascades a `style` onto the nodes, edges and shapes inside it, and can
  carry a `transform`/`scale`, `opacity`, `clip`, `className` and `id`
  as group properties. A scope accepts every verb a picture does,
  including nested scopes, and returns the container so the chain
  continues.

  This is mainly a *composition* primitive rather than a styling
  convenience: until now a picture had exactly one global transform, so
  the same sub-assembly could not be drawn twice at two positions
  without recomputing every coordinate by hand. Geometry inside a scope
  stays in the scope's own coordinates and the transform rides on a
  `<g>`, so strokes and arrow tips scale with it.

  Node names stay global to the picture, as in TikZ, and resolve into
  whichever container asks for them — so an edge declared at picture
  level can join nodes declared in different scopes, and `resolve()`
  always returns picture space. `{ fit: true }` folds scope transforms
  into the content bounds.

  Two carve-outs in the cascade, both deliberate: `path()` keeps its
  invisible baseline (an enclosing `stroke` must not make every `\path`
  visible), and text is not restyled (a scope `fill` for shapes must not
  recolor every label). `PictureRenderer` gains optional
  `beginGroup`/`endGroup`; the style cascade needs neither, so existing
  four-method backends keep working.

  Purely additive — a picture with no scopes emits byte-identical SVG.

- **`layered({ coordinates: 'brandes-koepf' })`.** A linear-time
  alternative to the default Gansner auxiliary-graph network simplex for
  cross-axis coordinate assignment (Brandes & Köpf 2002). Ranks and
  left-to-right order are unchanged — only the spacing within each rank
  differs. Long edges stay perfectly straight; spacing is slightly less
  symmetric than `'gansner'`, which remains the default because it is
  prettier and fast enough for hand-authored diagrams. On a chain-like
  DAG the difference is 284 ms → 5 ms at 200 nodes and 12.9 s → 18 ms at
  1,000; 4,000 nodes lay out in 68 ms where the default is impractical.
  The block compaction is iterative rather than the paper's recursion, so
  deep dummy chains cannot overflow the stack.
- **`tree({ align: 'rank' })`.** Align every depth level to one column
  (center-aligned tiers) for org-chart/pipeline trees; the inter-level
  gap is `levelDistance` between the two levels' widest nodes. Default
  `'parent'` keeps the per-parent tidy-tree behavior.
- **`layered()` — Sugiyama-style DAG layout.** Nodes and edges declared
  by name; multi-parent support; DFS cycle removal (back-edges reversed,
  original direction restored at render), network-simplex rank assignment
  (Gansner et al. 1993 + TikZ's balance pass), dummy nodes for multi-rank
  edges. `rankSep` / `nodeSep` are edge-to-edge gaps.
- **`layered()` crossing minimization.** Weighted-median + transpose
  sweeps (TikZ `CrossingMinimizationGansnerKNV1993`) with a weighted
  bilayer cross count (Barth et al., via dagre) and an early-stop
  keep-best loop. `LayeredEdgeSpec.weight` now genuinely biases the
  kept order.
- **`layered()` network-simplex coordinate assignment.** The secondary
  axis is computed by network simplex on an auxiliary graph (Gansner et
  al. 1993 §5: edge nodes weighted 8/2/1 by dummy-ness, weight-0
  separator edges) plus TikZ's left/right balance pass — balanced,
  symmetric drawings with straight multi-rank dummy chains. The
  secondary component of `at` now anchors the first box edge.
- **`Edge` bend points.** `EdgeOptions.bendPoints` renders a polyline
  path through intermediate points (TikZ `bend_points`), with `'auto'`
  endpoints aiming at the first/last point; used by `layered()` for
  multi-rank edges.
- **Examples: earth-orbit and euler-line use border-aware node
  labels.** Markers are now small circle nodes with `labels:` entries
  (measured, `distance`-gapped), so label text can no longer overlap
  the marker discs. The earth-orbit sun disc no longer overlaps the
  perihelion Earth dot (smaller radii).

### Changed

- **Size-aware tree layout.** `tree()` now auto-measures every node and
  treats `levelDistance` as an **edge-to-edge gap** along the growth
  axis (previously a center-to-center constant). Children align their
  near edges at the parent's far edge + gap, so horizontal trees with
  variable-width labels no longer overlap or waste columns.
- **Per-node `sep`.** `TreeNodeSpec.sep` and `TreeNodeBuilder.sep(d)`
  override `levelDistance` for a single node's children — e.g. a small
  gap under an invisible zero-size spacer root.
- Shared layout primitives extracted to `src/layout/shared.ts`
  (`measureNode`, `contentToNodeOptions`, axis helpers) for the other
  builders to consume.

## 0.5.0

Fluent pen statements, named coordinates, and real arc math.

### Added

- **`Pen` — fluent TikZ path statements (`pic.pen()`).** TikZ threads
  an implicit pen through `\draw (a) -- (b) node[right]{x} -- cycle`;
  `pic.pen()` is exactly that as a chain. Full verb vocabulary:
  `moveTo`/`lineTo`/`to` (`--`), `hvTo`/`vhTo` (`-|`,`|-`),
  `curveTo`/`smoothCurveTo`/`quadraticTo` (`.. controls ..`),
  `through`/`bendTo`, `arcTo`/`circularArcTo` (SVG endpoint arcs), and
  `close()` (`-- cycle`). `.label(text, { at })` hangs on the pen
  position; `{ pos, offset }` rides the operation just drawn by arc
  length (TikZ `node[midway]`) — lines, corners (both legs), curves,
  and arcs. `pen.push(options)` restyles mid-statement (options
  inherit and override; `mode` can switch). Pens register with the
  picture at `pic.pen()` time and expand lazily at render/bounds time,
  so they interleave with other calls and work with `{ fit: true }`.
- **Named coordinates.** `pic.coordinate(name, at)` (TikZ
  `\coordinate`) and `pen.coordinate(name)` name points mid-statement;
  names resolve everywhere node names do — `edge('A','B')`,
  `pic.resolve('A')`, and every pen verb endpoint
  (`pen.moveTo('A').lineTo('B')`). Anchors on a coordinate resolve to
  the point itself.
- **CSS-alias opacity keys.** `RenderStyle` accepts
  `'stroke-opacity'`/`'fill-opacity'` as documented aliases of the
  camelCase keys (camelCase wins when both are set).

- **Compile-time shape names via `ShapeRegistry`.** `ShapeType` is now
  `keyof ShapeRegistry`, an augmentable interface, instead of a closed
  union plus a `string & {}` escape hatch. Built-in shape names
  autocomplete in `node({ shape: … })`, and the circuits extension
  augments its nine symbol names in — `shape: 'op amp'` autocompletes,
  and misspellings like `shape: 'ressistor'` are compile errors.
  Compile-time assertions keep the interface in sync with the runtime
  `SHAPE_TYPES` list / `CIRCUIT_SHAPES`.
- **Typed-first circuit demos.** The symbol gallery, RC-filter, and
  op-amp cards now lead with the `circuit.*` builders and typed symbol
  instances (`u1.minus` / `u1.out` port Points); the strings-vs-typed
  comparison card moved up right after the gallery.
- **TikZ-style placement for bare text.** `pic.text(p, 'h',
  { at: 'south east', distance: 4 })` is `\node[below right] at (p) {h}`
  — compass names, aliases, or angles, with `distance` as a
  point-to-border gap (same ray math as `Node.labelPoint`; text
  anchors like `'base'` are rejected). Works for KaTeX math labels too.
  New exported helper `placeText(point, text, placement)` computes the
  placed center; new `PictureTextOptions` type extends `TextOptions`
  with `at`/`distance`.
- **Labels on the draw verbs.** `draw`/`fill`/`filldraw`/`path` accept
  `label`/`labels` (the shared `NodeLabel` vocabulary) —
  `pic.draw(l, { label: { text: 'x', at: 'east' } })` is TikZ's
  `\draw … node[right]{x}`. Placement references the shape's anchor
  (a horizontal line's `'east'` is its right endpoint), pushed outward
  by `distance`; desugared into text items at call time, so every
  backend (and KaTeX) supports them. New `DrawOptions` type.
- **`rotateText: false` on nodes** keeps the node's own text upright
  on a rotated node — the TikZ plain-`rotate` vs
  `rotate` + `transform shape` split, which jikz fuses by default.
  Labels are unaffected (positions follow `frame`; text always
  upright).
- **Circuit port-name vocabulary.** New constants + unions —
  `TWO_TERMINAL_PORTS`, `OPAMP_PORTS`, `GROUND_PORTS`, `CIRCUIT_PORTS`
  with `TwoTerminalPort`/`OpAmpPort`/`GroundPort`/`CircuitPort` types —
  so `const p: OpAmpPort = 'out'`; ``wire(pic, [`U1.${p}`])`` makes
  typo'd ports compile errors in user code. A test pins the constants
  equal to the runtime port tables.
- **Typed `shapeOptions` per shape name.** The `ShapeRegistry`
  interface values now carry the shape's options type:
  `node({ shape: 'star', shapeOptions: { points: 8 } })`
  autocompletes and excess/typo'd keys are compile errors. Typed for
  `star`, `regular polygon`, `rounded rectangle`, `chamfered
  rectangle`, and all circuit variants (via the extension's
  augmentation — `resistor` knows `variant: 'ansi' | 'iec'`); untyped
  shapes stay permissive. `NodeOptions`/`Picture.node` are generic
  over the shape spec; new exported `ShapeOptionsFor<S>`.
- **KaTeX-aware label sizing.** `MathRenderer` gains an optional
  `measure(tex)` — implemented by `katexAdapter` via an offscreen
  probe (browser-only; undefined headless) — and math foreignObjects
  now size to the rendered formula instead of a fixed 200×50 box.
  Placement estimates (`placeText`, node/draw labels, fit bounds)
  strip `$…$` delimiters and measure the TeX body via the shared
  `estimateLabelSize`. `DEFAULT_LABEL_DISTANCE` /
  `DEFAULT_LABEL_FONT_SIZE` moved to `text/placeText` (re-exported
  from `node/Node` — no API change).
- **Along-path draw labels.** Draw labels gain TikZ's `node[midway]`
  family: `{ pos: t, offset }` places the label at path parameter `t`,
  pushed `offset` px left of travel (matching `Edge`'s
  labelPos/labelOffset). Works on `Line` (new `pointAt`/`tangentAt`),
  `Arc`, and `Path` (numeric tangent); `Circle` rejects `pos` with a
  pointer to `{ at: <angle> }`. The angle-marking demo card now rides
  its arcs instead of hand-computing bisector points.
- **Auto-fit viewBox.** `toSVG({ fit: true, padding })` /
  `mount(container, { fit: true })` compute the viewBox from content
  bounds — TikZ's auto-sizing, so scenes straddling the origin need no
  hand-computed size or centering `Transform`. New
  `Picture.contentBounds()` and `PictureViewBox`; `SVGBuilder`'s
  viewBox gains an optional origin (`x`/`y`). Fit composes with the
  canvas transform (content bounds are mapped through it). The
  unit-circle demo card now uses it — the manual translation is gone.
- **`frame` option on labels.** `NodeLabel.frame` selects the frame
  `at` is interpreted in: `'local'` (node-label default — the label
  rides the node's rotation, TikZ `transform shape` label semantics)
  or `'screen'` (draw-label default — screen-absolute direction from
  the shape as drawn, TikZ page-frame path-node semantics; `'north'`
  is always the visual top, even on rotated shapes). Label text stays
  upright in both frames. On plain (unrotated) geometry both coincide.

### Breaking

- **`ShapeSpec` no longer accepts arbitrary strings.** Custom shapes
  registered at runtime with `registerShape('house', …)` must also be
  registered at the type level to be used by name:
  ```ts
  declare module 'jikz' {
    interface ShapeRegistry { house: {} }
  }
  ```
  Alternatively, pass a pre-constructed instance:
  `node({ shape: new House({ … }) })` (unchanged, no name needed).
- **`dist` now ships per-file `.d.ts`** instead of a single rolled-up
  `index.d.ts` (the rollup dropped the circuits module augmentation).
  `dist/index.d.ts` remains the types entry point.

### Fixed

- **Real arc math for `Path` `A` segments (SVG §F.6.5).**
  `Path.length` no longer assumes a quarter circle at the average
  radius; `Path.pointAt` no longer silently SKIPS arc segments;
  `Path.bounds` now includes arc bulge extremes (exact, not sampled).
  Endpoint→center conversion includes the mandatory radius correction
  and the degenerate cases (zero radius → line, `from == end` →
  omitted). Everything sampling `pointAt`/`length` — decorations,
  offset/smooth, fit viewBoxes on arc bulges, pen `pos` labels on
  arcs — was wrong on arc-containing paths and now works.
- **Opacity aliases were silently dropped.**
  `{ style: { 'fill-opacity': 0.15 } }` type-checked but rendered at
  `fill-opacity: 1` — the mapper only read camelCase, and
  `mergeStyles`' defaults shadowed the alias. Aliases are now
  normalized at merge time and read at render time.

## 0.4.0

Extensibility release: every TikZ-style extension point is now a
registry, plus an anchor-convention bugfix.

### Fixed

- **Inverted north/south anchors on complex shapes (bug).** Complex
  shapes (`star`, `cloud`, `signal`, `single arrow`, `double arrow`,
  `isosceles triangle`, `regular polygon`, `starburst`, `dart`, `kite`,
  `circular sector`) passed math-convention angles to `boundaryPoint`,
  so `anchor('north')` returned a point *below* center (and numeric
  anchors silently followed TikZ's convention instead of the documented
  screen convention). All compass anchors now follow `ANCHOR_ANGLES`
  (0° = east, 90° = south, 270° = north), matching the README and the
  geometry primitives. A cross-shape consistency suite
  (`test/geometry/AnchorConsistency.test.ts`) now pins the convention
  for every shape type.

### Added

- **Shape registry** — `registerShape(name, factory)`, `createShape`,
  `hasShape`, `registeredShapeNames`. Custom shapes are usable by name
  anywhere built-ins are: `node({ shape: 'house' })`, `Picture`, layout
  builders. New `NodeOptions.shapeOptions` forwards shape-specific
  options (`{ points: 8 }`) through `node({ shape: 'star' })`.
- **`AnchoredPolygon` base class** — define a custom shape by declaring
  only `vertices` + `moveTo`/`resize`; anchors (compass + custom via
  the `customAnchor` hook), `boundaryPoint` ray-casting, `contains`,
  `bounds`, and `toSVGPath` are derived. 9 built-in shapes migrated to
  it, eliminating ~800 lines of duplicated anchor/geometry code.
- **Arrow tip registry** — `registerArrowTip(name, def)` with TikZ-style
  marker artwork; `EdgeOptions.arrowStart`/`arrowEnd` accept registered
  names.
- **Fill pattern registry** — `registerPattern(name, def)`; custom
  patterns usable via `style: { fillPattern: 'my pattern' }`. Unknown
  patterns throw with the list of known names.
- **Decoration registry** — `registerDecoration(name, fn)`;
  `decoratePath(path, name, options)` consults it. **Behavior change:**
  unknown decorations now throw (with known names) instead of silently
  returning the original path.
- **Backend decoupling** — `Picture.renderWith(renderer)` compiles a
  picture through any object implementing the new `PictureRenderer`
  interface (4 methods); `toSVG()`/`mount()` are thin conveniences over
  it. `Renderer` is now generic: `Renderer<TEl, TCtx>`.
- **Injectable math rendering** — `new SVGRenderer(draw, style,
  { mathRenderer: katexAdapter(katex) })`. Reading KaTeX from the
  global scope still works but is **deprecated** (one-time warning) and
  will be removed in a future release.
- New exports: `DefsManager`, `LayerStack`, `MathRenderer`,
  `katexAdapter`, `resolveMathRenderer`, `isLaTeX`, `extractLaTeX`,
  `resolveArrowTipKind`, `getArrowTip`, `hasArrowTip`,
  `registeredArrowTips`, `getPatternDefinition`, `hasDecoration`,
  `registeredDecorations`, `rayEdgeIntersection`, `pointInPolygon`,
  `polygonBounds`, `PATH_MODE_STYLE`, `mergePathMode`, `ShapeSpec`.
- Renderables now carry discriminator tags (`kind` on Point/Path/Line/
  Arc/Node/Edge, `type` on shapes); the render guards consult tags
  first and keep structural checks as a legacy fallback — no more
  negative duck-typing (`!('arrowEnd' in obj)`) for built-ins.

### Changed (internal)

- `SVGRenderer` decomposed: def bookkeeping → `DefsManager`, layer
  stacks → `LayerStack`, math → injectable `MathRenderer`; arrow tips
  live in `render/ArrowTip.ts`. `SVGRenderer.renderPicture` delegates
  to `Picture.renderWith`.
- `chainFrom` no longer pokes private fields via `as any`
  (`ChainBuilderImpl.adoptNode`); `Transform.clone` no longer needs an
  `as unknown as Matrix` cast.

## 0.3.0

Typed styles: TikZ's option list as data, plus the marker fixes.

### Added

- **`dash` style field** with the TikZ dash vocabulary
  (`'dashed'`, `'densely dotted'`, …) as a literal-union type
  (`DashPatternName`, derived from the exported `DASH_PATTERN_NAMES`
  array). Previously `dash` wasn't a field at all — it was silently
  ignored, which is why the dash demo rendered solid lines.
- **Array form of `style`** — `style: [thick, dashed, red]` merges
  left-to-right (later wins, TikZ's rule), mixing named preset objects
  with inline overrides. Works on every verb and render call.
- **Named preset objects** exported from the package root (`thick`,
  `dashed`, `red`, `ultraThick`, `denselyDashed`, `patternBricks`,
  `shadowLg`, `roundedFull`, …): frozen, camelCase versions of the
  TikZ preset names; unknown names are now import/compile errors
  instead of silent no-ops. `PRESET_OBJECTS` for introspection.
- Unknown names in `parseStyleString`/`applyPreset` now `console.warn`
  instead of failing silently.

### Fixed (from user screenshots)

- **Arrowhead markers were clipped in browsers**: `SVGBuilder.marker()`
  emitted no `viewBox`, so marker artwork rendered unscaled and
  bottom-clipped (notched stealth heads, floating latex chevrons,
  stubby bars).
- **Start markers misrendered in some engines** (`auto-start-reverse`
  misapplied): start markers are now separate defs with pre-mirrored
  artwork and plain `orient="auto"`.

## 0.2.1

Shape-extent contract, TikZ arrow specs, and a real demo catalogue.

### Fixed

- **Shape extent contract**: every shape's drawn outline now stays
  inside its declared box (appendages like callout pointers, magnifier
  handles, and arrow head flares are drawn *inside*, not outside), the
  `width`/`height` getters agree with `bounds`, and `bounds` is
  centered on `at`. Previously 18 of 33 shapes drew outside their
  declared size and 6 were off-center, breaking label placement and
  layout math. Symmetric shapes (circle, star, regular polygon, …) may
  still grow to `max(w,h)` TikZ-style, but report it honestly.
- **TikZ arrow specs work**: `arrowEnd: '->' / '<-' / '<->'` (the most
  TikZ-natural spellings) previously rendered no arrowhead at all.
  `'<-'` redistributes the tip to the start, `'<->'` tips both ends.
- Removed all secret per-shape minimum sizes that silently overrode
  the declared width/height.
- Screen-convention corrections in shape defaults: magnifier handle
  and magnetic-tape tail now point down-right as documented.

### Changed

- **Demo catalogue rebuilt**: 25 demos (was 8) covering points/TikZ
  operators, intersections, triangle centers, conics, plotting,
  anchors, all 33 shapes, edge routing, arrow tips, path builder,
  decorations, dash patterns, braces, fill patterns, gradients,
  shadows, double lines, layers, chain/matrix/tree layouts, and KaTeX
  math. Shape-gallery labels are placed from measured `bounds`.
- `DEFAULT_SHAPE_OPTIONS` min size is now 20×20 so direct shape
  factories without explicit sizes produce visible (not zero-size)
  shapes.

## 0.2.0

The fundamentals release: uniform conventions, honest rendering, and a
finished core refactor. **Contains breaking changes.**

### Breaking

- **Anchor angles adopt the screen convention.** Named anchors
  (`north`, `south west`, …) are unchanged in meaning — `north` is the
  visual top — but previously resolved to the *opposite* side of the
  shape; that bug is fixed. **Numeric** anchors changed meaning:
  `A.90` was north, is now south (0° = east, clockwise positive, so
  north = 270°). Named anchors match TikZ; numbers match the screen.
- **`Node.above()/below()/leftOf()/rightOf()` use TikZ positioning
  semantics** — `distance` is now the edge-to-edge gap (previously
  anchor-to-center), matching `nodeAbove()`/`nodeAt()`. Use
  `Node.positioned()` for anchor-to-center placement.
- **Nodes with text but no explicit size now auto-size** from measured
  text (canvas in browsers, font-metrics table in Node) instead of
  collapsing to the 20px minimum. `textWidth`/`textHeight` remain as
  explicit overrides.
- **Bend direction corrected**: positive `bendAngle` / `bendLeft()`
  now genuinely bend left of travel (TikZ `bend left`); they
  previously bent right. Edge labels default to the left of travel
  (TikZ `auto=left`); they were on the right. `loopEdge('above'/
  'below')` loops on the correct side.
- **SVG.js removed.** The renderer emits through jikz's own
  `SVGBuilder` (string-first, zero dependencies, works in Node). The
  `@svgdotjs/svg.js` dependency and vite externals are gone.
- **Export surface trimmed**: pattern/gradient/shadow registry
  internals (`generatePatternId`, `normalizeGradientSpec`,
  `parseColorForFilter`, color helpers, …) are no longer exported from
  the package root. All remain available from deep paths.
- `node/shapes/` moved to `src/geometry/complex/` (deep imports only;
  package-root API unchanged).

### Added

- **`Picture.text(at, text, options)`** — bare centered text
  (TikZ `\node at (x,y) {…}`), KaTeX-aware.
- **`measureText()`** exported; powers node auto-sizing.
- **Every geometry type is renderable** in pictures: `Ellipse` gets a
  native element; Triangle/Parabola/Hyperbola/Plot/complex shapes
  render via a generic path fallback.
- **`SHAPE_TYPES`** exported const array — the single source of truth
  for `node({ shape })` strings (33 types).
- `isEllipse` guard; `renderEllipse` / `renderShape` on `SVGRenderer`.

### Fixed

- **KaTeX rendering works again** (was silently dead since the
  string-first refactor): math embeds via `foreignObject` +
  `builder.raw()`, no DOM required, no more swallowed TypeError or
  leaked empty elements.
- **Arrowheads follow the edge stroke color** (per-color marker
  variants; SVG markers can't inherit it).
- Positioning gaps measured from the correct edge of asymmetric shapes.

### Internal

- Snapshot suite rebuilt and expanded to 17 scenes covering named
  anchors, all 33 shapes, patterns, gradients, shadows, layers, double
  lines, KaTeX (stubbed), and full pictures.
- CI (build + test on Node 20/22). README with a conventions section.
- `node_modules`/`dist` no longer tracked in git.
