# What jikz supports, and how it lines up with TikZ

jikz is not a TikZ interpreter. It is a TypeScript library built on
TikZ's *model* — nodes with anchors, paths as statements, one option
list per statement, styles that cascade by kind — rendered as SVG with
screen coordinates. This page is the honest inventory: what carries
over one-to-one, what carries over with a different spelling, what is
partial, and what is not there. For the spelling itself, see the
[TikZ → jikz mapping](./tikz-mapping.md).

Legend: ✅ supported · 🟡 partial (note says what is missing) ·
❌ not supported (with where it sits on the roadmap, if anywhere).

## Coordinates and calc

| TikZ | jikz | |
|---|---|---|
| `(x,y)` canvas coordinates | `point(x, y)` — px, y down | ✅ |
| `(θ:r)` polar | `polar(θ, r)` — in a `frame: 'math'` picture exactly TikZ's; in the default screen frame θ is clockwise | ✅ |
| `(A)`, `(A.north)`, `(A.30)` | `'A'`, `'A.north'`, `'A.30'` — numeric anchors follow the picture's frame (`A.90` is the top in `frame: 'math'`) | ✅ |
| `($(A)!0.5!(B)$)`, `!2cm!`, `!(P)!` projection | `A.toward(B, 0.5)`, `A.towardByDistance(B, 20)`, `P.project(A, B)` | ✅ |
| `!θ:` rotation modifier | `p.rotateAround(c, θ)` | ✅ |
| `(A \|- B)`, `(A -\| B)` | `A.horAt(B)`, `A.verAt(B)` | ✅ |
| `++(dx,dy)` relative | `rel(dx, dy)` as the point of any pen verb; `+(dx,dy)` (no pen move) is `pen.position.add(…)` | ✅ |
| `\coordinate (P) at …` | `pic.coordinate('P', p)`; mid-path `pen.coordinate('P')` | ✅ |
| `xyz`, `canvas polar`, `node cs`, `intersection cs`, `tangent cs` | intersections via `intersect*()` functions; the rest have no analogue | 🟡 |
| lengths `1cm`, `10pt` | `cm(1)`, `pt(10)`, `length('3mm')`; `picture({ unit: cm(1) })` for coordinates | ✅ |
| colours `blue!30!white` | `color('blue!30!white')`, `mix(a, b, t)`, `defineColor`, the 19 xcolor names | ✅ |
| y up, counter-clockwise, `A.90` = top | `picture({ frame: 'math', unit })` — mapped at insertion; geometry stays screen space | ✅ |

## Paths and the pen

| TikZ | jikz | |
|---|---|---|
| `\draw`, `\fill`, `\filldraw`, `\path`, `\shade` | `pic.draw/fill/filldraw/path/shade(shape)` | ✅ |
| `(a) -- (b)`, `-\|`, `\|-`, `-- cycle` | `pen.lineTo`, `hvTo`, `vhTo`, `close()` | ✅ |
| `.. controls (c) and (d) ..` | `pen.curveTo(c, d, end)` (`quadraticTo`, `smoothCurveTo` too) | ✅ |
| `to[out=, in=, bend left=, looseness=]` | `pen.to(p, { out, in, bend, looseness })`; `Path.to` the same | ✅ |
| `node[…]{x}` on a path | `pen.label('x', { at \| pos, offset })` for text; `pen.node('n', { pos, shape, … })` for a real named node | ✅ |
| `coordinate (P)` on a path | `pen.coordinate('P')` | ✅ |
| `[opts]` mid-path | `pen.push({ style })` | ✅ |
| `rectangle`, `circle`, `ellipse`, `arc[start angle, end angle, radius]`, `grid`, `parabola`, `sin`, `cos` | `pen.rectangle()`, `.circle()`, `.ellipse()`, `.arc({ start, end, radius })`, `.grid()`, `.parabola()`, `.sin()`, `.cos()` | ✅ |
| `plot` | `plot()`, `plotParametric()`, `plotPolar()`, `plotFromPoints()` with `marks` | ✅ as shapes |
| `svg "…"` | `pathFromSVG(d)` | ✅ |
| `pic`, `let`, `foreach` | functions returning items; JS loops; `let` is a variable | ✅ by construction |
| `edge` from a path | `pic.edge(a, b, …)` as its own statement | ✅ |

## Nodes

| TikZ | jikz | |
|---|---|---|
| `\node[shape, draw, fill] (A) at (p) {text}` | `pic.node('A', { at, shape, text, style })` — one option bag | ✅ |
| `\usetikzlibrary{shapes.*}` (33 shapes) | `picture({ shapes: allShapes })` — every TikZ shape, plus multipart splits | ✅ |
| `minimum width/height/size`, `inner sep`, `outer sep` | `minWidth`, `minHeight`, `innerSep`, `outerSep` | ✅ |
| auto-size to text | omit `width`/`height` | ✅ |
| `anchor=`, `at=` | `anchor`, `at` | ✅ |
| `rotate=` | `rotate` | ✅ |
| `transform shape` | a node's `rotate` always rotates the node, as TikZ; scope transforms rotate nodes too (TikZ needs `transform shape` for that); `rotateText: false` keeps text upright | 🟡 no way to keep nodes unrotated in a transformed scope |
| `label=<angle>:<text>`, `label distance`, `every label` | `labels: [{ text, at, distance, style }]`, `labelDistance`, `every.text` | ✅ |
| `pin=` (label with a connecting line) | `pins: [{ text, at, edge }]` | ✅ |
| `text width`, `align`, `\\` line breaks | `textWidth` (wraps), `align`, `\n` | ✅ |
| `font=`, `text=` | `textStyle: { fontSize, fontFamily, fontWeight, fill }` | ✅ |
| `alias` | `alias: 'x'` or a list | ✅ |
| `name prefix` | — | ❌ |
| multipart nodes (`\nodepart`) | `rectangleSplit`, `circleSplit` shapes; one text | 🟡 |
| `right=of A`, `node distance` (positioning) | `pic.node('B', { rightOf: 'A', distance: 40 })` and the seven other directions | ✅ |
| `fit=(a)(b)` | `rectFit(points)` | 🟡 takes points, not nodes |

## Edges and `to`

| TikZ | jikz | |
|---|---|---|
| `\draw (A) -- (B)` (border to border) | `pic.edge('A', 'B')` — no tip by default, as TikZ | ✅ |
| `\draw[->]`, `<-`, `<->` | `arrowEnd: '->'` / `'<-'` / `'<->'`, or `'stealth'`, `'latex'`, `'to'`, `'\|'`, `'\|\|'`, `'*'`, `'o'`, `'square'`, `'diamond'`, `'roundCap'` | ✅ 10 tips |
| `{Stealth[length=3mm, open]}`, `>>` | `arrowEnd: { tip: 'stealth', length: 12, open: true }`, `['stealth', 'stealth']`; `width`, `scale`, `fill`, `color`, `reversed`, `sep` | ✅ |
| `bend left=`, `out=`/`in=`, `looseness=` | `bendAngle`, `out`/`in`, `looseness` | ✅ |
| `loop above` … | `loop: 'above'` | ✅ |
| `node[midway, above]{x}` on an edge, several of them | `label: { text, pos, offset, style }`, `labels: [...]` | ✅ |
| `sloped` labels | `label: { text, pos, sloped: true }` on edges, pens and draw verbs | ✅ |
| `shorten <`, `shorten >` | `shortenStart`, `shortenEnd` on edges and pen statements | ✅ |
| custom `to path` | `route: (from, to) => Path`; `straightRouter`, `orthogonalRouter()`, `busRouter()` | ✅ |

## Styles and keys

| TikZ | jikz | |
|---|---|---|
| `[thick, dashed, red]` | `style: ['thick', 'dashed', 'red']` or the preset objects from `@ozan.e/jikz/styles` | ✅ |
| `\tikzset{brand/.style={…}}` | `picture({ styles: { brand: {…} } })` per picture, `registerStyle('brand', …)` globally; recipes may name other styles | ✅ |
| `every node`, `every edge`, `every path`, `every label` | `picture({ every: { node, edge, path, text } })`; scopes add their own | ✅ |
| `line width`, `ultra thin` … `ultra thick` | `strokeWidth`, the named presets | ✅ |
| `dashed`, `densely dotted`, `dash pattern=`, `dash phase` | `dash: 'dashed'`, `strokeDasharray`, `strokeDashoffset` | ✅ |
| `fill opacity`, `draw opacity`, `opacity` | `fillOpacity`, `strokeOpacity`, `opacity` | ✅ |
| `rounded corners=<inset>` | `roundedCorners: inset` on any path | ✅ |
| `double`, `double distance` | `doubleLine: { spacing }` | ✅ |
| `pattern=`, `pattern color=` | `fillPattern: fillPatterns['north east lines']`, or `{ pattern, color, scale }` — all 12 tiles | ✅ |
| `shade`, `left color`, `ball color`, `shading angle` | `pic.shade(shape, { leftColor, … })`; `gradient` specs | ✅ |
| `drop shadow` | `dropShadow` | ✅ |
| `\clip` | `style: { clip: shape }` on an item, `clip` on a scope | ✅ |
| `preaction`/`postaction` | `preactions: [style]`, `postactions: [style]` on any item | ✅ |
| `path picture` | `pathPicture: (inside) => …` on a draw verb, clipped, between fill and stroke | ✅ |
| `use as bounding box` | `useAsBoundingBox: true` | ✅ |
| `even odd rule` | `fillRule: 'evenodd'` | ✅ |
| `blend mode`, fadings | — | ❌ fadings: ext roadmap |
| unknown key | a `JikzError` with code `unknown-name` listing what is known | ✅ |

## Scopes and transformations

| TikZ | jikz | |
|---|---|---|
| `\begin{scope}[style, shift, rotate, scale]` | `pic.scope({ style, every, transform, scale, opacity, clip }, s => …)` | ✅ |
| `transform canvas` | `picture({ transform })` | ✅ |
| `pgfonlayer`, `on background layer` | `SVGRenderer.defineLayers/onLayer` (renderer level only) | 🟡 |
| `local bounding box` | `pic.contentBounds()` for the whole picture | 🟡 |
| `baseline`, `trim` | `{ fit: true, padding }` | 🟡 |

## Layouts and graph drawing

| TikZ | jikz | |
|---|---|---|
| `chains`, `matrix of nodes`, `trees` (`child {…}`) | `chain()`, `matrix()`, `tree()` builders; `pic.add(result)` puts them in the picture | ✅ |
| graphdrawing `layered layout`, `spring layout`, `simple necklace layout` | `layered()`, `graph().force()`, `graph().circular()` | ✅ |
| `\graph { a -> b }` DSL | builder calls | 🟡 no string DSL |
| `mindmap` | — | ❌ ext roadmap |

## Decorations, markings, text along paths

| TikZ | jikz | |
|---|---|---|
| `decorations.pathmorphing` (snake, zigzag, coil, bumps, saw, random) | `snakePath()`, `zigzagPath()`, … and `decoratePath(path, name)`; register your own | ✅ |
| `decorations.pathreplacing` braces | `bracePath()`, `bracketPath()` | ✅ |
| `decorations.markings` | `markPath(path, marks)` | ✅ |
| `decorations.text` | `textAlongPath()` | ✅ |
| `decorations.fractals`, `.footprints`, `.shapes` | — | ❌ ext roadmap |

## Libraries with a jikz module

| TikZ | jikz | |
|---|---|---|
| `circuits.ee` | `@ozan.e/jikz/circuits` — 16 symbols, typed ports, `wire()` | ✅ |
| `shapes.gates.logic.US/IEC` | `@ozan.e/jikz/gates` | ✅ |
| `petri` | `@ozan.e/jikz/petri` | ✅ |
| `datavisualization` | `@ozan.e/jikz/dataviz` — `chart()`, `axes()`, `legend()`, nice ticks | ✅ |
| `intersections`, `calc`, `through`, `positioning`, `fit`, `patterns`, `shadings`, `shadows`, `arrows` (legacy set), `svg.path`, `plotmarks` | core | ✅ |
| `angles`, `automata`, `er`, `lindenmayersystems`, `turtle`, `spy`, `fadings`, `mindmap`, `calendar`, `folding` | — | ❌ see the extension roadmap |

## Text and math

| TikZ | jikz | |
|---|---|---|
| `$…$` in a node | KaTeX (`katexAdapter`) or MathJax SVG (`mathjaxAdapter`), injected per picture | ✅ |
| mixed text and math in one label (`time $t$`) | not yet; use two labels | 🟡 |
| LaTeX inside a node (`\tabular`, `\textbf`) | plain text only | ❌ by design |

## Not supported, and why

- **3D**: `tikz-3dplot`, `xyz cs`, `\addplot3`. A projection stage
  is on the extension roadmap; surface plots with depth ordering are
  out for good.
- **pgfplots**: the 2D subset maps onto `@ozan.e/jikz/dataviz`; the
  option surface itself will not be replicated.
- **TeX macros** (`\def`, `\newcommand`, `\pgfmathsetmacro`): you have
  a programming language already.
- **`external`, `remember picture`/`overlay`, `babel`**: document-level
  TeX concerns with no meaning in a standalone SVG.
- **`animations` library**: jikz emits SMIL directly via `animate` on
  any item, which covers more than the TikZ library does.

## Where jikz goes beyond TikZ

String output with no DOM (`toSVG()` in Node, workers and SSR);
auto-fit viewBox; programmatic composition from data; typed shape sets
and ports (`gate().in1` is a compile error when the gate has no
`in1`); deterministic text measurement; pan/zoom on mounted pictures;
per-picture styles and arrow tips that cannot collide across libraries.
