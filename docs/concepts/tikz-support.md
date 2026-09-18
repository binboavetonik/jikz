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
| `(θ:r)` polar | `polar(θ, r)` — clockwise angles, so TikZ's θ is `-θ` here | 🟡 convention |
| `(A)`, `(A.north)`, `(A.30)` | `'A'`, `'A.north'`, `'A.30'` — numeric anchors are screen angles (`270` = top) | 🟡 convention |
| `($(A)!0.5!(B)$)`, `!2cm!`, `!(P)!` projection | `A.toward(B, 0.5)`, `A.towardByDistance(B, 20)`, `P.project(A, B)` | ✅ |
| `!θ:` rotation modifier | `p.rotateAround(c, θ)` | ✅ |
| `(A \|- B)`, `(A -\| B)` | `A.horAt(B)`, `A.verAt(B)` | ✅ |
| `++(dx,dy)` / `+(dx,dy)` relative | `p.add(dx, dy)`; on the pen `lineBy(dx, dy)` only | 🟡 pen verbs, Phase 2 |
| `\coordinate (P) at …` | `pic.coordinate('P', p)`; mid-path `pen.coordinate('P')` | ✅ |
| `xyz`, `canvas polar`, `node cs`, `intersection cs`, `tangent cs` | intersections via `intersect*()` functions; the rest have no analogue | 🟡 |
| lengths `1cm`, `10pt` | pixels only | ❌ Phase 2 |
| colours `blue!30!white` | CSS colours only; no mixing | ❌ Phase 2 |
| a `frame: 'math'` picture (y up, counter-clockwise, `A.90` = top) | — | ❌ Phase 2, the item that removes both 🟡 rows above |

## Paths and the pen

| TikZ | jikz | |
|---|---|---|
| `\draw`, `\fill`, `\filldraw`, `\path`, `\shade` | `pic.draw/fill/filldraw/path/shade(shape)` | ✅ |
| `(a) -- (b)`, `-\|`, `\|-`, `-- cycle` | `pen.lineTo`, `hvTo`, `vhTo`, `close()` | ✅ |
| `.. controls (c) and (d) ..` | `pen.curveTo(c, d, end)` (`quadraticTo`, `smoothCurveTo` too) | ✅ |
| `to[out=, in=, bend left=, looseness=]` | `pen.to(p, { out, in, bend, looseness })`; `Path.to` the same | ✅ |
| `node[…]{x}` on a path | `pen.label('x', { at \| pos, offset })` — text only, not a shape | 🟡 named/shaped mid-path nodes, Phase 2 |
| `coordinate (P)` on a path | `pen.coordinate('P')` | ✅ |
| `[opts]` mid-path | `pen.push({ style })` | ✅ |
| `rectangle`, `circle`, `ellipse`, `arc[start angle, end angle, radius]`, `grid`, `parabola`, `sin`, `cos` | draw the shape (`rect()`, `circle()`, `arc()`, `parabola()`) as its own statement; the pen has only the SVG endpoint `arcTo` | 🟡 pen verbs, Phase 2 |
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
| `transform shape` | fused with `rotate`; `rotateText: false` keeps text upright | 🟡 Phase 2 |
| `label=<angle>:<text>`, `label distance`, `every label` | `labels: [{ text, at, distance, style }]`, `labelDistance`, `every.text` | ✅ |
| `pin=` (label with a connecting line) | — | ❌ Phase 2 |
| `text width`, `align`, `\\` line breaks | `\n` line breaks; no wrapping or alignment keys | 🟡 Phase 2 |
| `font=`, `text=` | `textStyle: { fontSize, fontFamily, fontWeight, fill }` | ✅ |
| `alias`, `name prefix` | — | ❌ |
| multipart nodes (`\nodepart`) | `rectangleSplit`, `circleSplit` shapes; one text | 🟡 |
| `right=of A`, `node distance` (positioning) | `pic.node('B', { rightOf: 'A', distance: 40 })` and the seven other directions | ✅ |
| `fit=(a)(b)` | `rectFit(points)` | 🟡 takes points, not nodes |

## Edges and `to`

| TikZ | jikz | |
|---|---|---|
| `\draw (A) -- (B)` (border to border) | `pic.edge('A', 'B')` — no tip by default, as TikZ | ✅ |
| `\draw[->]`, `<-`, `<->` | `arrowEnd: '->'` / `'<-'` / `'<->'`, or `'stealth'`, `'latex'`, `'to'`, `'\|'`, `'\|\|'`, `'*'`, `'o'`, `'square'`, `'diamond'`, `'roundCap'` | ✅ 10 tips |
| `{Stealth[length=3mm, open]}`, `>>` | tips are names only; no per-use size or multiplicity | ❌ Phase 2 |
| `bend left=`, `out=`/`in=`, `looseness=` | `bendAngle`, `out`/`in`, `looseness` | ✅ |
| `loop above` … | `loop: 'above'` | ✅ |
| `node[midway, above]{x}` on an edge, several of them | `label: { text, pos, offset, style }`, `labels: [...]` | ✅ |
| `sloped` labels | — | ❌ Phase 2 |
| `shorten <`, `shorten >` | `shortenStart`, `shortenEnd` (edges only) | 🟡 |
| custom `to path` | routing is `straight` / `-\|` / `\|-` / `bezier` + `bendPoints` | 🟡 Phase 2 routers |

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
| `preaction`/`postaction`, `path picture`, `use as bounding box`, `even odd rule`, `blend mode`, fadings | — | ❌ Phase 2 (fadings: ext roadmap) |
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
