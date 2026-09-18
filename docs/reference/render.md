# Reference: render

The render layer: `SVGRenderer` (imperative, geometry → SVG),
`SVGBuilder` (DOM-free element tree → string or live DOM), and the
complete style system. Full API: <a href="../api/index.html" target="_blank">generated reference</a>
(`npm run docs:api`).

## The complete `RenderStyle` key table

Every `style` option across the library resolves to this shape
(`src/render/StyleMapper.ts`):

| key | type | notes |
|---|---|---|
| `stroke` | `Color` | stroke paint |
| `strokeWidth` | `number` | px |
| `strokeOpacity` | `number` | |
| `strokeDasharray` | `string \| number[]` | raw SVG; beats `dash` when both set |
| `strokeDashoffset` | `number` | |
| `strokeLinecap` | `'butt' \| 'round' \| 'square'` | |
| `strokeLinejoin` | `'miter' \| 'round' \| 'bevel'` | |
| `strokeMiterlimit` | `number` | |
| `dash` | `DashPatternName` | TikZ names: `'dashed'`, `'dotted'`, `'dashdotted'`, `'densely dashed'`, `'loosely dashed'`, `'densely dotted'`, `'loosely dotted'` — sugar for `strokeDasharray` |
| `fill` | `Color` | |
| `fillOpacity` | `number` | |
| `fillRule` | `'nonzero' \| 'evenodd'` | TikZ `even odd rule` |
| `fillPattern` | `PatternKind \| FillPatternSpec` | a `fillPatterns.*` tile, or `{ pattern, color, scale, … }` |
| `gradient` | `GradientSpec` | linear/radial, multi-stop — compiles to `<defs>` |
| `dropShadow` | `DropShadowSpec \| boolean` | SVG filter primitive |
| `clip` | any shape, path or node (`toSVGPath()`) | TikZ `\clip` |
| `roundedCorners` | `number` | TikZ `rounded corners=<inset>`, on any path |
| `doubleLine` | `DoubleLineSpec \| boolean` | TikZ `double` |
| `opacity` | `number` | whole-element |

On any item's options (not the style): `preactions` / `postactions`
(TikZ `preaction`/`postaction`, a list of styles painted over the
invisible `path` baseline before/after the item).

## The array form — TikZ's option list as data

`style` accepts an array of partials; **later entries win**:

```ts
import { thick, dashed, red } from 'jikz/styles'

pic.draw(e, { style: [thick, dashed, red] })
pic.draw(e, { style: [thick, { stroke: '#2563eb' }] })   // override
```

All 53 presets (`src/render/presets.ts`): line widths
(`ultraThin`…`ultraThick`), dashes (`dashed`, `denselyDotted`, …),
stroke colors (`red`, `blue`, …), fill colors (`fillRed`, …), patterns
(`patternNorthEastLines`, …), shadows (`shadow`, `shadowSm`,
`shadowLg`), radii (`rounded`, …`roundedFull`), `double`. Frozen
objects; introspect via `PRESET_OBJECTS`.

### Naming your own — the style registry

`registerStyle(name, recipe)` is TikZ's `\tikzset{name/.style={…}}`.
The recipe is resolved once, at registration, and the call hands back
the frozen preset object — so one registration serves both the typed
array form and the string form:

```ts
import { parseStyleString, registerStyle } from '@ozan.e/jikz'
import { dashed, thick } from '@ozan.e/jikz/styles'

const wire = registerStyle('wire', [thick, { stroke: '#0f172a' }])
const hot  = registerStyle('hot wire', ['wire', { stroke: '#dc2626' }])

pic.draw(e, { style: hot })                                   // typed
pic.draw(e, { style: [wire, dashed] })                        // composed
pic.draw(e, { style: parseStyleString('hot wire, dashed') })  // string
```

A recipe may reference other registered names, so styles compose the
way TikZ's do; re-registering a name replaces it. `hasStyle(name)` and
`registeredStyleNames()` introspect the table. An unknown name throws
a `JikzError` (`code: 'unknown-name'`) whose message lists the names
that exist — a typo never renders as a silently-default line.

`style` takes names directly: `style: 'brand'`, `style: ['brand',
'dashed', { stroke }]`. A name resolves against the picture's own
`styles` (`picture({ styles })`) first, then the registry, then the
built-in presets. `parseStyleString` is the bridge from a comma
string (`'thick, dashed, red'`) to a resolved `RenderStyle`. Unlike
shapes and fill patterns — which became plain values in 0.7.0 — arrow
tips, decorations and styles keep a global registry as a convenience;
since 0.9 a picture can carry its own `styles` and `arrowTips`, which
resolve first, so nothing forces two libraries to share one table.

## Fill patterns

`fillPattern: fillPatterns.dots` — the twelve TikZ tiles live in the
`fillPatterns` set (`'north east lines'`, `'north west lines'`,
`'horizontal lines'`, `'vertical lines'`, `'grid'`, `'crosshatch'`,
`'dots'`, `'crosshatch dots'`, `'fivepointed stars'`, `'sixpointed
stars'`, `'bricks'`, `'checkerboard'`). Tune one with a
`FillPatternSpec` (`{ pattern, color, backgroundColor, scale, lineWidth,
rotation }`), or define your own tile with `definePattern(name, { width,
height, defaultLineWidth, createContent })` — a value you hand to a
style; nothing is registered.

## Arrow tips

`arrowStart` / `arrowEnd` on edges: `'stealth'`, `'latex'`, `'to'`,
`'bar'`, plus TikZ spellings `'->'`, `'<-'`, `'<->'`, `'|'`.
Arrowheads inherit the edge's stroke color.

## Layers

```ts
r.defineLayers(['background', 'main', 'foreground'])
r.setLayer('background')
r.onLayer('foreground', () => { ... })
```

Layers compile to ordered `<g>` groups. See
[`examples/double-layers.ts`](../../examples/double-layers.ts).

## SVGBuilder

The bottom of the stack: a DOM-free SVG element tree.
`builder.toString()` → markup (Node/SSR); `builder.mount(el)` → live
DOM. `toSVG()`/`mount()` on pictures are thin wrappers over this.
SVG.js-compatible conveniences (`marker`, `defs`, …) included.

## Animation (SMIL)

Every render call accepts `animate` — declarative SMIL emitted as
`<animate>`/`<animateTransform>` children of the element. It serializes
into `toSVG()` output, so even a saved static file animates:

```ts
pic.draw(circle(p, 5), {
  animate: { attributeName: 'opacity', values: '1;0.35;1',
             dur: '1.2s', repeatCount: 'indefinite' },
})
```

`SVGAnimation`: `attributeName`, `values` (or `from`/`to`), `dur`,
`repeatCount`, `begin`, `keyTimes`, `calcMode`/`keySplines`, `fill`, and
`kind: 'animateTransform'` for transform animation. Pass an array to run
several on one element. On nodes the animation lands on the wrapping
`<g>`, so shape and label pulse together. For app-controlled CSS
animation use `className`/`attributes` instead.

See [`examples/animation.ts`](../../examples/animation.ts).

## MathRenderer

The pluggable text renderer seam: `katexAdapter(katex)` turns `$...$`
into real math inside `foreignObject`; without it, `$...$` degrades to
italic. See [Node, SSR & browser](../concepts/node-ssr-browser.md).
