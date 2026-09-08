# Changelog

## Unreleased

### Added

- **`tree({ align: 'rank' })`.** Align every depth level to one column
  (center-aligned tiers) for org-chart/pipeline trees; the inter-level
  gap is `levelDistance` between the two levels' widest nodes. Default
  `'parent'` keeps the per-parent tidy-tree behavior.
- **`layered()` — Sugiyama-style DAG layout (minimal slice).** Nodes
  and edges declared by name; multi-parent support; longest-path rank
  assignment, barycenter ordering, center coordinates. `rankSep` /
  `nodeSep` are edge-to-edge gaps. Cyclic input throws for now.

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
