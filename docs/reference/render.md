# Reference: render

The render layer: `SVGRenderer` (imperative, geometry → SVG),
`SVGBuilder` (DOM-free element tree → string or live DOM), and the
complete style system. Full API: [generated reference](../api/)
(`npm run docs:api`).

## The complete `RenderStyle` key table

Every `style` option across the library resolves to this shape
(`src/render/StyleMapper.ts`):

| key | type | notes |
|---|---|---|
| `stroke` | `Color` | stroke paint |
| `strokeWidth` | `number` | px |
| `strokeOpacity` / `'stroke-opacity'` | `number` | aliases; camelCase wins if both set |
| `strokeDasharray` | `string \| number[]` | raw SVG; beats `dash` when both set |
| `strokeDashoffset` | `number` | |
| `strokeLinecap` | `'butt' \| 'round' \| 'square'` | |
| `strokeLinejoin` | `'miter' \| 'round' \| 'bevel'` | |
| `strokeMiterlimit` | `number` | |
| `dash` | `DashPatternName` | TikZ names: `'dashed'`, `'dotted'`, `'dashdotted'`, `'densely dashed'`, `'loosely dashed'`, `'densely dotted'`, `'loosely dotted'` — sugar for `strokeDasharray` |
| `fill` | `Color` | |
| `fillOpacity` / `'fill-opacity'` | `number` | aliases; camelCase wins |
| `fillPattern` | `PatternKind \| FillPatternSpec` | a `fillPatterns.*` tile, or `{ pattern, color, scale, … }` |
| `gradient` | `GradientSpec` | linear/radial, multi-stop — compiles to `<defs>` |
| `dropShadow` | `DropShadowSpec \| boolean` | SVG filter primitive |
| `clip` | `ClipSpec` | clip path |
| `borderRadius` / `borderRadiusX` / `borderRadiusY` | `number` | rectangles |
| `doubleLine` | `DoubleLineSpec \| boolean` | TikZ `double` |
| `opacity` | `number` | whole-element |

## The array form — TikZ's option list as data

`style` accepts an array of partials; **later entries win**:

```ts
import { thick, dashed, red } from 'jikz'

pic.draw(e, { style: [thick, dashed, red] })
pic.draw(e, { style: [thick, { stroke: '#2563eb' }] })   // override
```

All 53 presets (`src/render/presets.ts`): line widths
(`ultraThin`…`ultraThick`), dashes (`dashed`, `denselyDotted`, …),
stroke colors (`red`, `blue`, …), fill colors (`fillRed`, …), patterns
(`patternNorthEastLines`, …), shadows (`shadow`, `shadowSm`,
`shadowLg`), radii (`rounded`, …`roundedFull`), `double`. Frozen
objects; introspect via `PRESET_OBJECTS`.

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
