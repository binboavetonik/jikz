# Changelog

## Unreleased — the 0.9 consolidation

0.9 settles the vocabulary before 1.0 freezes it. It is one breaking
release rather than several: every call takes one option bag, every
label is the same `Label`, every piece of text is styled by the same
`TextStyle`, style names are strings anywhere a style goes, and the
root import is the core vocabulary only. The migration is mechanical;
`scripts/codemod-0.9.ts` is the exact one the repository ran on its
own examples, tests and docs, and the table below is what it does.

### Upgrading to 0.9

| 0.8 | 0.9 |
|---|---|
| `pic.node('A', { at, shape }, { style, textStyle, className })` | `pic.node('A', { at, shape, style, textStyle, className })` — one bag |
| `pic.edge(a, b, { bendAngle }, { style })` | `pic.edge(a, b, { bendAngle, style })` |
| `pic.edge(a, b)` drew a stealth arrow | draws a plain line, as `\draw (a) -- (b)`; write `arrowEnd: 'stealth'` (or `'->'`) for the arrow. Layout builders' edges too: pass `edgeOptions: { arrowEnd }` |
| `label: 'x', labelPos: 0.3, labelOffset: -8` on an edge | `label: { text: 'x', pos: 0.3, offset: -8 }`; several: `labels: [...]` |
| `labels: [{ text, at, options: { fontSize, style: { stroke } } }]` | `labels: [{ text, at, style: { fontSize, fill } }]` |
| `pen.label('x', { options: { fontSize } })` | `pen.label('x', { style: { fontSize } })` |
| `pic.text(p, 'x', { fontSize: 10, style: { stroke: c } })` | `pic.text(p, 'x', { style: { fontSize: 10, fill: c } })` |
| `NodeLabel`, `DrawLabel` types | `Label`; `TextStyle` for `textStyle`/`label.style`/`text().style` |
| `'fill-opacity'`, `'stroke-opacity'` keys | `fillOpacity`, `strokeOpacity` |
| `borderRadius` (rectangles only) | `roundedCorners` (any path) |
| `clip: { shape: 'circle', cx, cy, r }` | `clip: circle(point(cx, cy), r)` — any shape, path or node |
| `import { thick, red } from '@ozan.e/jikz'` | `from '@ozan.e/jikz/styles'` |
| `import { circuit, gates, chart, petri } from '@ozan.e/jikz'` | `from '@ozan.e/jikz/circuits'`, `/gates`, `/dataviz`, `/petri` |
| unknown style name → `console.warn` and skip | throws `JikzError` (`code: 'unknown-name'`) listing what is known |
| `applyPreset('nope')` → `{}` with a warning | throws |
| `catch (e) { /* e.message */ }` | every jikz error is a `JikzError` with a `code`; `AnchorError` extends it |
| `console.warn` from the library | `setWarningHandler(fn \| null)` to redirect or silence |

### Breaking

- **One option bag per call.** `pic.node(name, options)` and
  `pic.edge(from, to, options)` take their render keys — `style`,
  `textStyle`, `className`, `id`, `attributes`, `animate` — in the
  same object as their geometry, as a TikZ statement takes one option
  list. The third/fourth positional argument is gone.
- **One `Label`, one `TextStyle`.** `NodeLabel` and `DrawLabel` are
  now the single `Label` (`text`, `at`, `distance`, `frame`, `pos`,
  `offset`, `style`), used by node `labels`, edge `label`/`labels`,
  the draw verbs and the pen. A label's `options: TextOptions` is
  `style: TextStyle` (`fill`, `fontSize`, `fontFamily`, `fontWeight`);
  so is a node's `textStyle` and `pic.text()`'s `style`. Edges carry
  `labels: Label[]` and `Edge.labelPoint(label)`; `labelPos` and
  `labelOffset` are the label's `pos` and `offset`.
- **Edges draw no arrow by default**, matching `\draw (A) -- (B)`.
  `arrow()` still adds one; so does `arrowEnd: '->'`.
- **Style keys have one spelling.** The `'fill-opacity'` and
  `'stroke-opacity'` aliases are gone; `borderRadius*` is
  `roundedCorners` and rounds any path, not just rectangles; `clip`
  takes a shape instead of a descriptor.
- **Unknown style names throw** instead of warning, with the known
  names in the message — like unknown shapes and tips always did.
- **The root import is the core vocabulary.** The extension modules
  and the preset objects moved to their subpaths (`/circuits`,
  `/gates`, `/dataviz`, `/petri`, `/styles`), so `red`, `double`,
  `wire` and forty other short names no longer sit in the root
  namespace.

### Added

- **Style names anywhere a style goes.** `style: ['thick', 'dashed',
  { stroke }]`, `style: 'brand'`, scope `style: 'hot'`,
  `every: { edge: 'thick' }` — a string resolves against the
  picture's own `styles`, then `registerStyle`, then the built-in
  presets.
- **Per-picture styles and arrow tips.** `picture({ styles: { brand:
  {…}, soft: ['brand', 'dashed'] } })` is `\tikzset` scoped to one
  picture; `picture({ arrowTips })` resolves tip names before the
  global registry. Two libraries can no longer disagree about a name.
- **`every` — kind-scoped defaults.** `picture({ every: { node, edge,
  path, text } })` and `scope({ every })` are TikZ's `every node`,
  `every edge`, `every path` and `every label`. Precedence, weakest
  first: path-mode baseline → `every.<kind>` → scope `style` → the
  item's own `style`. `every.text` reaches node text, labels and bare
  text, and is folded in at insertion so placement measures the same
  font that renders.
- **Relative placement in the picture.** `pic.node('B', { rightOf:
  'A', distance: 40 })` — and `leftOf`, `above`, `below`,
  `aboveLeft`, `aboveRight`, `belowLeft`, `belowRight` — is TikZ's
  `right=of A`: the reference may be a node or coordinate name, an
  `Anchorable` or a point; `distance` is the border-to-border gap.
- **`roundedCorners` on any path** (TikZ `rounded corners=<inset>`):
  straight-segment corners become tangent arcs, capped at half the
  shorter adjacent segment, via the new `roundCorners(path, inset)`.
  Rectangles keep the native `rx`/`ry`.
- **`JikzError`** with a stable `code` (`unknown-name`,
  `duplicate-name`, `unknown-anchor`, `invalid-argument`,
  `unsupported`, `no-pen-position`, `layout`, `render`) on every error
  the library throws, and **`setWarningHandler`** for every warning
  it emits.
- **`pic.add()` — a layout result joins the picture.** `tree()`,
  `layered()`, `graph()`, `chain()` and `matrix()` return `{ nodes,
  edges }`, and until now the only ways to draw one were a renderer
  loop or re-declaring every node by hand (`pic.node(n.text, { at:
  n.center, shape: n.shape, … })`, which the positioning-tour example
  did). `pic.add(result, { nodes, edges })` takes the result whole —
  or any flat list of nodes and edges — with render options per kind.
  Nodes that carry a name register under it, so `pic.edge('CEO',
  'CFO')`, `'QA.north'` and `resolve()` work on laid-out nodes exactly
  as on declared ones; unnamed nodes just paint. Inside a `scope`, the
  names resolve into picture space like everything else there. The two
  tree examples use it now.

- **Subpath exports.** `@ozan.e/jikz/circuits`, `/gates`, `/dataviz`,
  `/petri`, `/layout` and `/styles` (the preset objects) resolve to
  the same modules the root re-exports — the root surface is
  unchanged. They exist so a consumer can take a narrower import, and
  so the ext modules have an address of their own ahead of the root
  slimming down. Each subpath has `import` and `require` conditions
  with paired declarations, plus `typesVersions` for the `node10`
  resolver; `check:pkg` covers all of them.

  To serve the `require` condition, the build now emits one CommonJS
  file per module next to the ES one, and the UMD bundle is built by a
  second config (`vite.config.umd.ts`): Rollup's name deconfliction
  leaks between a preserved-modules output and a single-file one in
  the same build, and the UMD came out with `function math.x(...)` in
  it. The install grows by the CJS tree (about 1 MB unpacked).

- **`Path.to()` takes routing options.** `path().moveTo(a).to(b, {
  bend: 'left' })` and `to(b, { out: 30, in: 150 })` draw the same
  cubic the pen's `to()` and an edge would; with no options it is the
  straight segment it always was.

- **A picture can be given a math renderer.** `$...$` labels needed
  KaTeX injected through `new SVGRenderer(…, { mathRenderer })`, which
  the picture layer never exposed — so `toSVG()` and `mount()` had no
  way to reach it and every static render showed its dollar signs.
  Three ways in now, most specific first:

  ```ts
  picture({ shapes, mathRenderer: katexAdapter(katex) })  // per picture
  pic.toSVG({ width, height, mathRenderer })              // per render
  setDefaultMathRenderer(katexAdapter(katex))             // per process
  ```

  Prefer the first. The last exists for a harness that renders
  pictures it does not build — and it is the explicit replacement for
  reading `globalThis.katex`, which stays deprecated and now resolves
  last.

  KaTeX cannot be imported for you: it is an optional peer, a static
  import would make it mandatory for everyone, and a dynamic one is
  async while `toSVG()` is not.

- **`MathRenderer` can say how it wants to be embedded, and
  `mathjaxAdapter` uses it.** The interface was documented as "anything
  that can turn a TeX string into an HTML fragment", and that HTML went
  into a `foreignObject` — which needs a live document's CSS and web
  fonts. So *every* provider inherited KaTeX's limitation, and no
  amount of injection could produce a self-contained SVG.

  An adapter now declares `output: 'html' | 'svg'`. HTML keeps the
  `foreignObject` path unchanged; SVG is inlined directly, which is
  what MathJax's SVG output produces — glyph paths needing no
  stylesheet and no fonts, so the math survives in a standalone file,
  an `<img>` tag, Inkscape or a PDF converter. KaTeX cannot do this at
  all; HTML+CSS and MathML are its only outputs.

  | | output | renders in |
  |---|---|---|
  | `katexAdapter` | HTML in a `foreignObject` | a live document only |
  | `mathjaxAdapter` | inlined SVG paths | anywhere an SVG renders |

  Two rules keep the seam open. `output` is **optional** and defaults
  to `'html'`, so every adapter written before it — including
  hand-written ones — works untouched. And an unrecognised value is
  treated as `'html'` rather than throwing, so a newer adapter
  degrades on an older jikz instead of breaking it.

  Both shipped adapters are written against the public interface with
  no privileged access, which is the only thing that makes "write your
  own" true rather than decorative.

### Fixed

- **A node's multi-line text rendered on one line.** `measureText`
  sizes a node for every `\n`-separated line, but a newline inside
  `<text>` is whitespace to SVG — so `text: 'line one\nline two'`
  produced a box two lines tall with both lines run together on one.
  Lines are now `<tspan>`s: centred on the node (and on an edge label),
  hanging below the first line for bare `renderText`. Single-line text
  serializes byte-for-byte as before, so no existing output moves.

- **`Path.bendTo()` bent the wrong way, and not like anything else.**
  `Path.through()`/`bendTo()` carried their own control-point
  arithmetic (`0.2`/`0.4` chord factors, sign flipped), so
  `path().bendTo(b, 30)` bent to the *right* while `pen.bendTo(b, 30)`,
  `to(b, { bend: 30 })` and `edge(a, b, { bendAngle: 30 })` all bend
  left. `bendTo` is now `to(end, { bend: angle })` on the shared
  `bezierControlPoints` model, and `through(p, end)` genuinely passes
  through `p` — two cubics with a continuous tangent at the point
  (Catmull-Rom, as `smoothPath` uses), where the old single cubic only
  bulged toward it. Both verbs on the pen change accordingly; no
  example used either, so no snapshot moved.

- **`Edge` assigned two `readonly` fields through a cast.** The
  arrow-spec normalisation and the "curve keys imply bezier routing"
  rule mutated `this` after construction via `(this as { … })`. Both
  are computed before the fields are assigned now. No behaviour change.

### Changed

- **The cookbook renders real math.** Every `$...$` label in a gallery
  thumbnail used to show its dollar signs — the headless tools inject
  no math renderer, and `Picture.toSVG()` had no way to take one.
  `scripts/render-examples.ts` now installs MathJax's SVG output for
  the whole build.

  MathJax rather than KaTeX because these tools write standalone
  `.svg` files that the cookbook shows through an `<img>` tag, which
  loads no stylesheet and no web fonts. KaTeX needs both: injecting it
  here renders the visual markup and the MathML copy on top of each
  other, which was measured in a browser rather than guessed. MathJax
  SVG output is glyph paths, and the same browser check confirms it
  survives the `<img>` boundary intact.

  `fontCache: 'none'` is load-bearing — the default caches glyphs in
  `<defs>` and references them with `<use>`, whose ids collide once
  several formulas share a picture.

  Costs 54 KB across 100 committed thumbnails (+9%) and a dev-only
  `mathjax-full`; `npm audit --omit=dev` stays at zero.

- **`check:examples` stops at a nested viewport.** A nested `<svg>`
  establishes its own coordinate system, so reading its children's
  coordinates as picture pixels reported a 2468px overflow for a
  75px-wide formula — 14 false findings the moment real math appeared.
  It now measures only elements in the picture's own system, which is
  the rule it already applied to `foreignObject`. The `katex-math`
  allowance went with it: that example no longer produces a
  foreignObject, and an unused allowance hides the next regression.

## 0.8.0 — 2026-09-15

0.8.0 adds `ext/petri`, jikz's port of TikZ's `petri` library, and
settles two rendering behaviours that were quietly wrong: coordinates
are now rounded at the serialization boundary, and text takes the
colour it was asked for instead of falling back to black.

A minor rather than a patch release, because the public surface grows:
a whole ext module, `PIXEL_EPSILON`, the petri constants, and
`styleList` alongside `mergeStyles`.

**Upgrading.** No API changed, but two things can move a committed SVG:
rounded coordinates, and text that now honours an explicit `fill` (on
`text()`) or `textStyle` (on an edge label) instead of rendering black.
Regenerate any checked-in output and diff it.

### Added

- **`ext/petri` — Petri nets (TikZ `petri`).** `place` and
  `transition` shapes carrying the library's `minimum size=5ex` and
  `4mm`, `petriArcs` for its `pre`/`post`/`pre and post` flow arcs
  (`shorten` included), and `tokens()` for a marking. Token positions
  come straight from the table `\tikz@def@grow@tokens` hard-codes for
  one through nine, flipped for a y-down canvas — including the two
  arrangements that are not vertically balanced (three is slightly
  top-heavy, eight is two over three over three), carried over rather
  than quietly corrected. Past nine TikZ has no arrangement and fails
  quietly — the lookup expands to `\relax`, so every token lands on the
  place's centre; a ring is used instead. `colored tokens` and
  `structured tokens` are the `colors` and `labels` options, the
  latter carrying TikZ's white `\tiny` text for the caller to draw.
  Token spacing is held as a ratio of the token size rather than as
  TikZ's fixed `1.5ex`, so sizing the dots up spreads them to match
  instead of piling them into each other; at the default size it is
  exactly TikZ's length.

  Tokens are values rather than part of the place: a place and its
  dots are two paints, which one shape's `toSVGPath()` cannot carry.
  TikZ's `tokens=n` expands to child nodes for the same reason.

  The builders also stand jikz's default node minimum (20) down, so
  the shapes' own TikZ minimums apply — without that a transition
  drawn as the usual thin bar comes back 20 wide.

### Fixed

- **Edge labels ignored `textStyle`.** A node's own text has always
  taken its colour, size, family and weight from `textStyle`; an edge's
  label read none of them and was pinned to the pen at 12pt sans. It
  now honours the same four keys, so an edge label styles like any
  other node text. `style.fill` is deliberately *not* the knob here —
  on an edge that already paints the path, a filled lens under a bend —
  which is what makes this different from bare text, where nothing else
  consumed it. With no `textStyle`, labels follow the pen exactly as
  before, and `font-weight` is emitted only when asked for, so no
  existing drawing changes.

- **Bare text ignored an explicit `fill`.** `pic.text(p, s, { style:
  { fill } })` type-checked and rendered black: the renderer painted
  glyphs from `stroke` alone, because the merged style carries
  `DEFAULT_STYLE`'s `fill: 'none'` and reading that would have made
  every unstyled label invisible. It now asks what the *caller* wrote
  — a new `ownStyle()` beside `getStyle()`, with no defaults
  underneath — so an explicit `fill` paints and everything else still
  follows the pen. A scope's `fill` is unaffected and still never
  reaches text; that rule lives a layer up in `Picture.ts` and is
  where it belongs. `examples/layout-clusters.ts` and
  `examples/scope-groups.ts` were both asking for coloured labels and
  silently getting black ones — as is any drawing out there that passed
  a `fill` to `text()`, so committed SVG can shift on upgrade.

- **`star`, `pentagon`, `hexagon`, `regularPolygon` and
  `isoscelesTriangle` resolved to different things in TypeScript and at
  runtime.** `geometry/index.ts` exported the vertex-layer Polygon and
  Triangle factories explicitly *and* pulled `complex/`'s shape-kind
  factories of the same names in through `export *`. TypeScript took
  the explicit export; bundlers took the star one. So
  `star(point(120, 110), 80, 34, 5)` type-checked and then drew a
  default 10 px star at the ORIGIN — which is exactly what the
  `clipping` example shipped (an invisible clip mask) and what
  `honeycomb` shipped (one hexagon instead of a tiling). The complex
  barrel is now re-exported by name, minus those five; the shape kinds
  stay reachable as classes (`Star`, `RegularPolygon`,
  `IsoscelesTriangle`) and by name from `allShapes`/`complexShapes`.
  Guarded by `test/build/export-identity.test.ts`.

- **`Triangle.orthocenter` was wrong for every non-right triangle.**
  The hand-derived altitude intersection returned a point nowhere near
  the altitudes, so the `euler-line` example drew three "collinear"
  centers that visibly were not. Now computed from Euler's relation
  H = A + B + C − 2·O, which is exact and needs no case analysis.

- **Rotated shapes drew unrotated, at the origin.** `Rotated` reports
  its base shape's `type` so shape-set lookups stay transparent, which
  made the renderer's tag dispatch claim a rotated rectangle as a plain
  `Rectangle` and emit `<rect width height>` with no `x`/`y`. Any
  `pic.draw(rotated(rect(…), θ))` silently lost both the rotation and
  the position. `render()` now claims `Rotated` first and draws it
  through its (already correct) rotated outline.

- **A label on a bare point landed underneath its own marker.**
  `pic.draw(p, { label })` measured the gap from the mathematical
  point, while the renderer paints a disc of `strokeWidth * 3` around
  it. Point labels now anchor on that disc, so the gap is a real gap.

- **`bracePath` did not draw a brace.** It was a single smooth S
  through the midpoint, which renders as a shallow valley at any
  amplitude. It is now the TikZ `decoration={brace}` shape — four
  quarter-circle cubics: a curl off the span at each end, a straight
  body, and a pointed tip in the middle. The curl radius is half the
  amplitude, capped at a quarter of the span so short spans clamp
  instead of folding through themselves. The old tests asserted only
  `isEmpty === false`, which a straight line also satisfies; they now
  pin the tip, the feet and the mirror.

- **`mount({ fit: true })` crashed on a parabola or hyperbola.**
  Neither had a `bounds` getter, so `contentBounds` read `undefined`
  and failed with `Cannot read properties of undefined (reading '0')`
  four frames from the drawing that caused it. Both now report the
  extent of the parameter range they actually draw, and a renderable
  with no bounds gets a message naming it and pointing at
  `{ width, height }`.

- **`plotPolar`'s own doc example was in the wrong angle unit.** It
  hands the callback DEGREES; the JSDoc showed a bare `Math.cos(theta)`
  (radians), which draws a spiky mess — and the `polar-roses` example
  copied it. The doc now says so, and the example uses `plotRose`,
  which converts for you.

- **The generated API reference was unreachable from the docs site.**
  Every `reference/*` page links to the TypeDoc output, and the link
  went nowhere — on the published site VitePress's SPA router
  intercepted the click, failed to resolve `/api/` as one of its own
  routes and rendered its 404, while the static TypeDoc site sat right
  there. Locally it was worse: `vitepress dev` has no directory-index
  fallback for `public/` subdirectories, so even a direct visit to
  `/api/` returned an empty app shell. The links are now
  `<a href="../api/index.html" target="_blank">` — `target="_blank"`
  opts the click out of the router, and the explicit `index.html`
  resolves in dev as well as on a static host.

- **The API reference's own landing page linked to raw markdown.**
  `typedoc.json` used the guide's `docs/README.md` as the readme;
  TypeDoc copies repo-relative targets into `api/media/*.md`, which
  browsers show as plain text. The API site now has its own short
  landing page (`docs/api-readme.md`) plus header links back to the
  documentation, the cookbook and GitHub.

- **`Point.horAt`/`verAt` docs described the opposite operator.** The
  code was right (`horAt` is TikZ `|-`, `(this.x, other.y)`); the
  docstring, tutorial 2 and the README table read the mapping
  backwards.

- **Geometry predicates built on products of coordinates misjudged
  ordinary pixel-scale drawings.** Coordinates are SVG pixels, so values
  in the thousands are the normal case, but cross products, collinearity
  determinants and discriminants grow quadratically or worse with that
  magnitude while `EPSILON` stayed at 1e-10. Measured against the old
  code: `Line.isParallelTo` and `isPerpendicularTo` each returned false
  for 228 of 720 genuinely parallel or perpendicular pairs at direction
  length 2000; `intersectLineCircle` missed 735 of 1080 tangents and
  reported *no intersection at all* for a third of them, at R = 50 as
  much as at R = 1000; `circleThrough` and `Triangle.circumcenter`
  accepted collinear input and returned circumcentres upwards of 1e17 px
  from it.
  Each is now fixed at its own site rather than by widening one shared
  constant — `intersectLineCircle` compares the perpendicular distance
  from the centre against the radius, two lengths in the same units that
  classify at any scale, and a new `circumcenterOf()` works in
  coordinates relative to A and judges collinearity against
  `|AB| · |AC|`. The projection route is also more accurate on ordinary
  secants: worst on-circle residual 3.07e-12 against 8.87e-12 over 200k
  cases. Guarded by `test/geometry/NumericRobustness.test.ts`.

- **`Triangle.angleA`/`angleB`/`angleC` returned `NaN` for degenerate
  triangles.** `dot / (|ba| · |ca|)` lands just past 1 for collinear
  vertices — 464 of 1800 across scales 1 to 2000 — and `Math.acos` of
  that is `NaN`, which then spread to `angles` and made `isRight`
  quietly false. The quotient is now clamped into the acos domain.

- **`intersectCircleCircle` could return `NaN` coordinates.** Just
  inside the tangency band the half-chord's radicand goes negative; it
  is now clamped, and the tangent band widened so that near-tangent
  cases take the direct construction instead. That band is what makes
  them accurate, not just classified: worst tangent-point error
  4.69e-13 against 1.53e-5 with the band removed, since the half-chord
  cancels catastrophically there and `sqrt` turns relative error into
  its square root. The `d == 0` guard stays approximate on purpose —
  `d` is a divisor, and an exact guard puts circles that are coincident
  to within floating-point noise thousands of pixels apart.

### Changed

- **`PIXEL_EPSILON` joins `EPSILON`, and five defaults move to it.**
  One tolerance cannot serve both a length and a cross product. `EPSILON`
  (1e-10) keeps its meaning for quantities the same order as the geometry
  — lengths, distances, radii, angles, and normalized conic equations,
  which measurement showed were never at risk. The new `PIXEL_EPSILON`
  (1e-6) covers screen-space predicates over *products* of coordinates.
  It is the same split d3 makes between `d3-path` and `d3-shape`, and
  still far tighter than anything visible: at direction length 2000 it
  only conflates lines within 1e-11 degrees of parallel.
  `Line.isParallelTo`, `Line.isPerpendicularTo`, `intersectLineCircle`,
  `intersectSegmentCircle` and `intersectCircleCircle` now default to it.
  Callers passing an explicit `epsilon` are unaffected.

- **Rendered coordinates are rounded to six decimal places.**
  `Math.sin`/`cos`/`pow`/`acos` are not required by ECMAScript to be
  correctly rounded, so emitting all 17 significant digits made output
  depend on the JS engine — the example snapshots once passed only on
  the machine that generated them and failed everywhere else on the
  first CI run. That was papered over in the test suite; it now happens
  in the renderer, so anyone diffing or caching generated SVG gets the
  same guarantee. Rounding covers numbers inside string attributes too,
  since that is where most of them are: `d` data carried 15018 of the
  16080 over-long decimals across the 100 examples. Text content is left
  alone — a label reading `pi = 3.14159265358979` means it. Trailing
  zeros are dropped, so example output falls from 750401 to 621471
  bytes, 17.2% smaller, while no rendered value moves: across the 40367
  numbers in the example snapshots the largest change is 2.6e-14.

- **`chart()`'s legend is auto-placed and framed.** `legend: true` was
  documented as "a framed legend" but never set `frame`, and always
  used the north-east corner — where a rising series puts its data. It
  now frames by default and picks whichever inside corner of the plot
  area holds the fewest series samples (bars counted over their whole
  column). `legend: { at }` and `legend: { frame: false }` override.

- **The y-axis label clears the topmost tick.** It was centred on the
  axis line one label-height above the plot, which put it on both the
  top tick label and the tick-label column.

- **The example gallery is checked, not just rendered.** `npm run
  check:examples` renders every example headlessly and measures the
  output for text overlapping text, text sitting on a point marker, and
  painted geometry escaping the mounted viewBox — the three defects the
  0.7.0 cookbook shipped. `npm run preview:examples` writes contact
  sheets to `.preview/` for the judgements a checker cannot make. Both
  share `scripts/render-examples.ts` with the cookbook generator, so
  nothing under `docs/cookbook/` is ever produced by hand.

- **Twenty-nine examples redrawn.** Labels that were parked at
  hand-computed offsets now use `label`/`labels` or `pic.text(p, …,
  { at })`, which measure the text and place it off the shape's own
  border. `free-body` gained the incline it was named for (the block is
  rotated onto a real wedge, with the angle marked); `golden-spiral`
  reassigns its immutable `Path` so the spiral exists; `clipping` and
  `honeycomb` benefit from the export fix above; `conics`,
  `normal-curve` and `layout-tree-horizontal` no longer clip.

- **Docs: a reference page for `ext/gates`**, which had none, plus
  `pathFromSVG` and the style registry (`registerStyle`) in the path
  and render references. `docs/README.md` no longer claims 50 examples
  or points at the retired `/demo/` page.

- **The docs site opens on the gallery.** The landing page renders every
  module in `examples/` live — a showcase grid with category chips, a
  `</>` toggle to flip a card to its source, and a copy button — with the
  documentation sidebar beside it (*Gallery* is its first entry; the old
  documentation map moved to `/overview/`). The standalone demo page and
  its separate Vite build are retired: `npm run dev` now starts the docs
  site alone, and `/demo/` redirects to the root.
- **README links are absolute.** npm resolves relative README links
  against the package homepage, which made the `docs/…` and `examples/`
  links on the npm page 404. CONTRIBUTING records the rule.

## 0.7.0 — 2026-09-14

0.7.0 is the first release after the move to GitHub, and it changes the
public model for shapes and fill patterns (see *Breaking*). 0.6.0 is the
previous published version; an earlier 0.7.0 section in this changelog
was never published, so everything below is new relative to 0.6.0.

### Breaking

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
  with no registration step.

  What to know when migrating:
  - A bare `picture()` is `Picture<{}>` and resolves **no** names —
    `shape: 'circle'` is a compile error and a runtime throw until the
    picture is given a set. Pass `basicShapes` (rectangle, circle,
    ellipse, diamond), `complexShapes` (the other 29), `allShapes`
    (both), an extension set, or any spread of them — or hand a kind
    directly (`shape: allShapes.star`), which needs no set.
  - `Picture` and `Scope` are generic in their set and a scope inherits
    the root picture's. A helper that takes any picture is generic too:
    `function stamp<S extends ShapeSet>(pic: Picture<S>)`; a bare
    `Picture` means `Picture<{}>`, which a picture with a set is not
    assignable to.
  - Layout builders (`chain`, `matrix`, `tree`, `layered`, `graph`) take
    kinds, never names: `shape: allShapes.circle`. They never had a set.
  - `ShapeKind`, `ShapeSet`, `ShapeSpec`, `ShapeOptionsOf` and
    `NodeOptionsFor` are exported for typing helpers and options.
  - `isShapeKind` requires the `kindName` that `defineShape` stamps, so
    an arbitrary function passed as `shape` is rejected instead of
    silently disabling text auto-sizing. Every shipped set is checked
    with `satisfies ShapeSet`.

  This is what drops the floor a `picture()` import costs — measured
  through a consumer's bundler: `{ picture, point }` is 97 kB minified /
  29 kB gzipped, down from 195 kB / 45 kB, because the catalogue is no
  longer welded onto `Node` by a global table. `basicShapes` adds
  52 bytes; `allShapes` adds 92 kB / 14 kB — by choice, now.

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

- **The ported-shape base moved out of the circuits extension.**
  `CircuitSymbol` and `symbolSize` are now `PortedShape` and
  `intrinsicSize` in `geometry/PortedShape` — logic gates were importing
  them from `ext/circuits/ports`, which made one extension depend on
  another's internals. `ext/circuits` keeps what is circuit-specific:
  `TwoTerminalSymbol`, `twoTerminalPorts` and the port-name constants.

### Added

- **First-class pan/zoom for mounted pictures.**
  `picture().mount(el, { fit: true, panZoom: attachPanZoom })` returns a
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

  Handing `mount` the `attachPanZoom` function (or `{ attach: attachPanZoom, ...options }`)
  rather than a flag is the opt-in: `Picture` does not reference the
  controller, so a drawing that never pans does not carry it —
  `import { picture, point }` is 4.8 kB smaller minified for it.

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

- **`ext/gates` — logic gates.** The opt-in `gateShapes` set is
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
  port tables. Built entirely on the `defineShape`/port seams shared
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

- **The repository moved to GitHub:** https://github.com/binboavetonik/jikz.
  `repository`, `homepage` and `bugs` in `package.json` point there; CI is
  GitHub Actions (`.github/workflows/ci.yml`, Node 18 and 24), releases
  publish from a `v*` tag with npm provenance (`release.yml`), and the
  docs deploy to GitHub Pages (`docs.yml`). The Bitbucket repository
  stays as a read-only mirror so the URLs in already-published versions
  keep resolving.

- **`AnchorError` names the anchors the shape does answer to.** A typo'd
  port used to produce a message listing only cardinals; it now reads
  `… This shape's own anchors: "in1", "in2", "out".` when the shape has
  ports, and carries them as `error.known`.

- **JavaScript sourcemaps ship with the ES modules.** Each `dist/**/*.js`
  has a `.js.map` beside it, and `src/` is included in the package so
  the maps (and the existing `.d.ts.map` files) resolve to real source
  in debuggers and go-to-definition. Maps carry mappings only, not a
  second copy of the source. The UMD build has no map.

- **KaTeX peer range widened to `>=0.16.0`.** The adapter only needs
  `renderToString`; verified against KaTeX 0.18.

- **Repository scaffolding for contributors.** `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.editorconfig`, an ESLint config
  (`npm run lint`, correctness rules only — no formatter), and CI that
  runs lint, build, tests, package checks and the docs build, plus the
  Node 18 engines floor. `prepublishOnly` now runs lint too.

- **The package is now tree-shakeable.** `package.json` declares
  `"sideEffects": false` and the ES build keeps one file per source
  module (`dist/index.js` is the entry; `module` and `exports.import`
  point at it) instead of a single 500 kB bundle. Nothing registers at
  import time: shapes and fill patterns are values a picture or a style
  is handed (see *Breaking* above), and the two tables that remain
  — arrow tips and path decorations — fill on first use, so a user
  `registerArrowTip` still wins over a built-in of the same name.
  Measured through a consumer's bundler: `import { point }` costs 2 kB
  minified / 0.9 kB gzipped instead of 147 kB / 29 kB; `{ circle,
  intersectLineCircle }` 6 kB / 2 kB; `{ picture, point }` 97 kB /
  29 kB, plus only the shape sets you hand it. `test/build/
  tree-shaking.test.ts` bundles those imports with esbuild and fails if
  the geometry-only case grows past 40 kB or a picture starts carrying
  shapes it was not given; `test/render/LazyBuiltins.test.ts` pins the
  tip/decoration registration order. The UMD build is unchanged.

### Fixed

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
