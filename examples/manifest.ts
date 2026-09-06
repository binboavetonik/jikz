/**
 * Example registry — single source of truth for the demo page, the
 * docs, and the snapshot test suite.
 *
 * Each sibling file is a self-contained example: real, type-checked,
 * snapshot-tested TypeScript that imports from 'jikz' (aliased to
 * src/ in dev/test) and default-exports render(container). The raw
 * source is loaded alongside so the demo page's Code tab shows
 * exactly what ran — nothing is hidden in a harness.
 */

/**
 * Cookbook category — texample-style grouping by task/domain.
 * `docs/cookbook/` is generated from this data.
 */
export type DemoCategory =
  | 'geometry-math'
  | 'physics-engineering'
  | 'graphs-networks'
  | 'diagram-layout'
  | 'nodes-edges'
  | 'paths-decorations'
  | 'app-prototypes'

export interface DemoMeta {
  id: string
  category: DemoCategory
  title: string
  description: string
}

export interface Demo extends DemoMeta {
  /** The example's full source, as displayed in the Code tab. */
  source: string
  /** The example's default export. */
  render: (container: HTMLElement) => void
}

// Eagerly import every example module AND its raw source. manifest.ts
// itself is excluded from both globs.
const renderers = import.meta.glob<(container: HTMLElement) => void>(
  ['./*.ts', '!./manifest.ts'],
  { eager: true, import: 'default' },
)
const sources = import.meta.glob<string>(
  ['./*.ts', '!./manifest.ts'],
  { eager: true, query: '?raw', import: 'default' },
)

// Display order and copy live here; code lives in the example files.
const meta: DemoMeta[] = [
  {
    id: "geometry",
    category: "geometry-math",
    title: "Bare geometry — draw / filldraw",
    description: "TikZ-style path verbs on raw geometry. `filldraw` strokes and fills; `draw` strokes only. No renderer methods in sight — the picture is its own compile target.",
  },
  {
    id: "points-tikz",
    category: "geometry-math",
    title: "Points & TikZ operators",
    description: "`toward` is TikZ's (A)!t!(B) interpolation; `horAt`/`verAt` are the |- and -| orthogonal-completion operators.",
  },
  {
    id: "intersections",
    category: "geometry-math",
    title: "Intersections",
    description: "Exact line-circle and circle-circle intersections, marked on the drawing.",
  },
  {
    id: "triangle-centers",
    category: "geometry-math",
    title: "Triangle centers & circumcircle",
    description: "Centroid, circumcenter, and the circumscribed circle through all three vertices.",
  },
  {
    id: "conics",
    category: "geometry-math",
    title: "Conic sections",
    description: "Ellipse, parabola, and hyperbola as first-class geometry.",
  },
  {
    id: "plotting",
    category: "geometry-math",
    title: "Function plotting — cartesian & polar",
    description: "Built-in plotting: sampled cartesian functions and polar curves.",
  },
  {
    id: "node-auto-size",
    category: "nodes-edges",
    title: "Auto-sized node",
    description: "No width/height given — the node measures its own text (canvas in the browser) and sizes the shape to fit.",
  },
  {
    id: "anchors",
    category: "nodes-edges",
    title: "Compass & angle anchors",
    description: "Every shape exposes named anchors (north … south west), aliases ('ne'), and numeric angles. Screen convention: 0° east, 270° = north.",
  },
  {
    id: "node-labels",
    category: "nodes-edges",
    title: "Node labels (TikZ label=)",
    description: "`labels` on a node are TikZ's `label=<angle>:<text>`: placed on the boundary (outer sep included), pushed out by `distance` — a border-to-border gap, so font size is accounted for. Accepts named anchors, aliases, and numeric angles (screen convention: 270° = north). `$...$` goes through KaTeX.",
  },
  {
    id: "node-to-node-edge",
    category: "nodes-edges",
    title: "Named-node edge (boundary-anchored)",
    description: "Reference nodes by name in `edge(...)`. A bare name resolves to the boundary point closest to the other endpoint — no manual padding. Swap to `'A.north'` / `'B.west'` to pin a specific anchor.",
  },
  {
    id: "shape-gallery",
    category: "nodes-edges",
    title: "Shape gallery — all SHAPE_TYPES",
    description: "Every shape-type string the library exports, iterated from jikz's own SHAPE_TYPES. Labels are placed from each shape's measured bounds, so pointers and arrow heads can't collide with them.",
  },
  {
    id: "edge-routing",
    category: "nodes-edges",
    title: "Edge routing — bends, out/in, loops",
    description: "bendAngle curves to the LEFT of travel when positive; out/in give absolute departure and arrival angles; a self-edge with looseness makes a loop.",
  },
  {
    id: "arrow-tips",
    category: "nodes-edges",
    title: "Arrow tips & TikZ specs",
    description: "stealth, latex, to, bar — plus the TikZ spellings ->, <-, <->. Arrowheads always take the edge's stroke color.",
  },
  {
    id: "path-builder",
    category: "paths-decorations",
    title: "Path builder + filldraw",
    description: "Chainable path construction — moveTo / lineTo / curveTo / close — then handed to `.filldraw()` so both stroke and fill apply in one verb.",
  },
  {
    id: "pen-statements",
    category: "paths-decorations",
    title: "Fluent path statements — pen()",
    description: "TikZ threads an implicit pen through \\draw (a) -- (b) node[right]{x} -- cycle: pic.pen() is exactly that. Segments compile to ONE path; .label(text, { at }) hangs a label on the current pen position without moving it, and { pos } rides the segment just drawn (TikZ node[midway]). Expansion is lazy, so the pen can be built across statements and still paints in registration order.",
  },
  {
    id: "pen-coordinates-restyle",
    category: "paths-decorations",
    title: "pen() — named coordinates & mid-statement restyling",
    description: "coordinate('P') names the pen position mid-statement (TikZ coordinate (P)); later statements reference names as endpoints — pen.moveTo('P').vhTo('Q') is \\draw (P) |- (Q). push(options) restyles mid-statement: subsequent segments compile to a NEW path whose options inherit and override the current run's, so one statement can mix dashed and solid legs.",
  },
  {
    id: "path-decorations",
    category: "paths-decorations",
    title: "Path decorations",
    description: "TikZ decorations: transform any base path into snakes, zigzags, and coils.",
  },
  {
    id: "dash-patterns",
    category: "paths-decorations",
    title: "Dash patterns",
    description: "TikZ dash vocabulary: dashed, dotted, dashdotted, and the densely/loosely variants. Each style name is a node label on an invisible zero-size anchor node at the line's end — TikZ's `\\draw[dashed] ... node[right] {dashed}` — not absolute text coordinates.",
  },
  {
    id: "braces",
    category: "paths-decorations",
    title: "Braces & brackets",
    description: "Annotation paths: curly braces and square brackets between two points.",
  },
  {
    id: "fill-patterns",
    category: "paths-decorations",
    title: "Fill patterns",
    description: "The 12 TikZ patterns — hatching, grids, dots, bricks, checkerboard, stars.",
  },
  {
    id: "styling",
    category: "paths-decorations",
    title: "Gradient, dash, shadow",
    description: "User-supplied `style` overrides the path-mode baseline. Linear gradients, dashed strokes, and drop shadows all flow through the builder's string pipeline — no DOM dependency.",
  },
  {
    id: "double-layers",
    category: "paths-decorations",
    title: "Double lines & layers",
    description: "Double-stroked paths (TikZ `double`) and z-order control via named layers.",
  },
  {
    id: "layout-chain",
    category: "diagram-layout",
    title: "Chain layout",
    description: "Chains position successive nodes and wire the edges for you.",
  },
  {
    id: "layout-matrix",
    category: "diagram-layout",
    title: "Matrix layout",
    description: "A TikZ matrix of nodes: rows of cells with column/row separation and automatic alignment.",
  },
  {
    id: "layout-tree",
    category: "diagram-layout",
    title: "Tree layout",
    description: "Hierarchical auto-layout: declare the tree, jikz positions every level.",
  },
  {
    id: "katex-math",
    category: "paths-decorations",
    title: "KaTeX math labels",
    description: "Any $...$ text renders through KaTeX (loaded from CDN on this page) inside a foreignObject — works in Node too. Without KaTeX it falls back to plain italic text.",
  },
  {
    id: "named-graph",
    category: "graphs-networks",
    title: "Named-node graph with anchored edges",
    description: "Four nodes plus four edges, referenced entirely by name. `'B.east'` / `'D.north'` pin specific anchors; bare `'A'` / `'B'` auto-resolve to the nearest boundary. No JS variables threaded through the scene.",
  },
  {
    id: "flow",
    category: "graphs-networks",
    title: "Flow diagram",
    description: "Three nodes and two labeled arrows — and the edge style uses the typed array form: [thick, { stroke }], TikZ's option list as data.",
  },
  {
    id: "pythagoras",
    category: "geometry-math",
    title: "Pythagorean theorem",
    description: "The texample classic: a 3-4-5 right triangle with outward squares computed from the side vectors — no hand-placed coordinates — and KaTeX area labels at each square's centroid. The right-angle marker is one pen corner statement (TikZ |-).",
  },
  {
    id: "snell",
    category: "physics-engineering",
    title: "Snell's law — interactive refraction",
    description: "LIVE: drag the slider to change the incidence angle — the whole card (slider + redraw) is the code below, re-rendering on every input. n1 sin(θ1) = n2 sin(θ2) computed in code; angle arcs and KaTeX \\theta labels derive from the actual ray directions via angleTo.",
  },
  {
    id: "complete-graph",
    category: "graphs-networks",
    title: "Complete graph K5 — nodeCircle",
    description: "Graph theory: nodeCircle lays the vertices on a ring, then every pair gets an edge referenced by name. Boundary anchoring means the chords clip at the node rims for free.",
  },
  {
    id: "riemann",
    category: "geometry-math",
    title: "Riemann sum",
    description: "Left-rule bars under a plotted curve. plot() maps y without flipping (screen coords), so the function is negated — the bars and the curve share one scale/offset pair. fill-opacity keeps the overlap readable.",
  },
  {
    id: "probability-tree",
    category: "graphs-networks",
    title: "Probability tree",
    description: "Statistics classic: two coin flips as a right-growing tree. The tree builder computes positions; edges carry the branch probabilities as labels — TikZ's edge from parent node [above] {1/2}.",
  },
  {
    id: "venn",
    category: "geometry-math",
    title: "Venn diagram",
    description: "Two set circles as nodes with translucent fills — their labels are node labels anchored north west / north east, so they track the circles. $A \\cap B$ sits at the centers' midpoint.",
  },
  {
    id: "fit-library",
    category: "diagram-layout",
    title: "rectFit — TikZ fit library",
    description: "TikZ's \\node[fit=(api)(cache)] : rectFit computes the tight rectangle around a subset of nodes' bounds; add padding, draw it dashed, and the backend grouping draws itself.",
  },
  {
    id: "angle-marking",
    category: "geometry-math",
    title: "Angle marking (angles & quotes)",
    description: "The TikZ angles library idiom: rays from one vertex via polar() — one pen statement with mid-path moves, \\draw (O) -- (A) (O) -- (B) (O) -- (C) — and each angle arc a pen statement whose KaTeX label rides the arc itself via pos/offset (TikZ's node[midway]) — everything derived from the ray angles, no hand-placed label points.",
  },
  {
    id: "unit-circle-derivative",
    category: "geometry-math",
    title: "Unit circle — porting a TikZ slide (derivative of sine)",
    description: "A line-for-line port of a Beamer TikZ slide: polar() for (θ:r) coordinates, arc() for the angle marker, a fluent pen statement for the wedge (fill mode), labels hung on the draw verbs themselves — { label: { at: 'east' } } is the node[right] inside a \\draw statement; KaTeX labels included. A canvas Transform.translation centers the origin (toSVG has no auto-fit). The one convention flip: TikZ angles run counterclockwise with y up, jikz clockwise with y down — so TikZ (θ:r) becomes polar(-θ, r) and arc(0:θ:1) becomes arc(o, r, 0, -θ, true).",
  },
  {
    id: "perp-bisectors",
    category: "geometry-math",
    title: "Perpendicular bisectors → circumcenter",
    description: "Construct the circumcenter instead of calling it: midpoints, side normals, two dashed bisectors, and intersectLineLine recovers O — which the circumscribed circle then proves. Vertex labels are pushed outward from the centroid, no hand-picked offsets.",
  },
  {
    id: "path-operations",
    category: "paths-decorations",
    title: "Path operations — offset / double / smooth / sub",
    description: "Path surgery: offsetPath parallels a curve on either side, doublePath renders TikZ's double line as two real paths, smoothPath turns a polyline into a spline, subPath highlights the middle 30–70% of it.",
  },
  {
    id: "tcp-states",
    category: "graphs-networks",
    title: "TCP state machine",
    description: "The texample classic: five states, bend edges with transition labels, and a self-loop for data transfer — edge routing (bendAngle, out/in, looseness) doing real diagram work.",
  },
  {
    id: "earth-orbit",
    category: "geometry-math",
    title: "Earth's orbit — ellipse foci",
    description: "Kepler's first law as geometry: the Sun sits at orbit.foci[1] (not the center!), Earth positions come from ellipse.pointAt(angle), and perihelion/aphelion labels ride outward from the center-to-planet ray.",
  },
  {
    id: "circle-through",
    category: "geometry-math",
    title: "Circle through 3 points",
    description: "circleThrough recovers the unique circle (null when collinear). Chords show the defining triangle, the center is marked, and point labels are pushed outward along the center-to-point ray.",
  },
  {
    id: "phyllotaxy",
    category: "geometry-math",
    title: "Sunflower phyllotaxy",
    description: "Biology's favorite spiral: 250 florets on a Vogel spiral — radius c·√n, angle n·137.508° (the golden angle). Ten lines of math, and the alternating fills make the Fibonacci arms visible.",
  },
  {
    id: "koch-snowflake",
    category: "geometry-math",
    title: "Koch snowflake",
    description: "The texample fractal classic, at recursion depth 4. The whole construction is point arithmetic: toward() splits each segment in thirds, polar() at (direction − 60°) places the equilateral bump. One pen statement paints the 768-segment outline as a single filldraw path.",
  },
  {
    id: "plate-diagram",
    category: "graphs-networks",
    title: "Bayesian network — plate diagram",
    description: "The graphical-model staple: latent and observed variables (the observed one shaded), a dashed dependency, and the repetition plate as a rectFit around the subset with the count in the corner — TikZ's \node[fit=(z)(x), label=below right:N]. No hand-computed box coordinates.",
  },
  {
    id: "chess-transposition-dag",
    category: "app-prototypes",
    title: "Chess prototype — transposition DAG",
    description: "Repertoire move trees are really DAGs: 1.d4 d5 2.c4 e6 3.Nf3 Nf6 and 1.d4 Nf6 2.c4 e6 3.Nf3 d5 arrive at the SAME Queen's Gambit Declined position. Nodes are plain circle() Anchorables (edges auto-resolve boundary points along the ray), the shared position gets the amber dashed 'transposition' style, and the merge edges use out/in headings so the two histories join like railway tracks.",
  },
  {
    id: "chess-pawn-skeleton",
    category: "app-prototypes",
    title: "Chess prototype — pawn-structure skeleton",
    description: "The textbook pawn-skeleton diagram (French Advance structure), auto-derived from square coordinates: the board grid is ONE multi-subpath pen statement, chains are thick translucent pen runs painted under the pawns, levers (\\u2026c5, \\u2026f6) are dashed stealth-arrow edges with TikZ edge labels, and the chain base is annotated with directional text. In the app, sq() maps FEN squares to points — the diagram derives itself from any position.",
  },
  {
    id: "chess-theme-radar",
    category: "app-prototypes",
    title: "Chess prototype — tactics theme radar",
    description: "Puzzle success rate by motif as a polar spider chart — the diagram charting libraries do badly and jikz does natively: rings and axes derive from polar(), both series are closed filldraw pen statements, and axis labels sit on compass placement. Overlaying the previous period (grey) shows training progress per theme at a glance.",
  },
  {
    id: "circuit-symbols",
    category: "physics-engineering",
    title: "Circuit symbol gallery — ext/circuits",
    description: "The circuits extension (jikz's \\usetikzlibrary{circuits.ee} analogue) ships symbols built ONLY on public seams: registerShape, port anchors, rotate. registerCircuits() registers the names at runtime, while a ShapeRegistry augmentation makes them known to the IDE — shape names autocomplete and misspellings are compile errors. The circuit.* builders used below are the fully-typed route: variants autocomplete too. Every symbol has an intrinsic size and never stretches to fit text.",
  },
  {
    id: "circuit-typed-api",
    category: "physics-engineering",
    title: "Two ways to reference symbols — strings vs typed builders",
    description: "The SAME circuit built twice. Top: string specs — shape names autocomplete via the ShapeRegistry augmentation, and 'R1.out'-style port strings resolve at runtime (typo'd ports throw AnchorError listing known names). Bottom: typed builders — circuit.resistor(...) returns ordinary NodeOptions with compile-checked variants, and symbol instances expose ports as Points (r1.out), so even port typos are compile errors. Both styles produce the same objects and mix freely; the RC-filter and op-amp cards use the typed style.",
  },
  {
    id: "circuit-rc-filter",
    category: "physics-engineering",
    title: "RC low-pass filter — ports, rotation, wires",
    description: "A full schematic composed from ports, not coordinates. Symbols are placed with the typed circuit.* builders (names, rotate, anchor — all compile-checked); voltage source and capacitor rotate 90° for vertical branches; wire() chains endpoints (name.port specs and raw points) with arrows off; junctionDot marks the output node; ground nodes are placed by their 'in' terminal (at + anchor, TikZ's at+anchor=). Every connection is 'R1.out', not a hand-computed point.",
  },
  {
    id: "circuit-opamp",
    category: "physics-engineering",
    title: "Inverting amplifier — multi-port op-amp, fully typed",
    description: "The op-amp is the multi-port validation of the port system — and the fully-typed workflow: symbol INSTANCES (opAmp(), resistor()) expose ports as Points (u1.minus/.plus/.out), so even wire endpoints autocomplete and a typo'd port is a compile error. Each instance doubles as its node's shape ({ shape: u1 }); the string path ('U1.-') still resolves against it at runtime. The feedback loop routes Rf around the top with wire() corners; the + input grounds with a single vertical drop.",
  },
]

export const demos: Demo[] = meta.map((m) => {
  const key = './' + m.id + '.ts'
  const render = renderers[key]
  const source = sources[key]
  if (!render || source === undefined) {
    throw new Error(`examples/${m.id}.ts is missing or has no default export`)
  }
  return { ...m, source: source.trim(), render }
})
