# Reference: node

The `Node` — jikz's TikZ `\node`: a named, anchored, optionally
text-bearing shape. Full API details: <a href="../api/index.html" target="_blank">generated API</a>
(`npm run docs:api`).

## NodeOptions

| key | type | purpose |
|---|---|---|
| `at` | `PointLike` | placement (the node's `center` unless `anchor` redirects it) |
| `shape` | `ShapeSpec` | a shape kind (`allShapes.star`, your own `defineShape(...)`) or a `Shape` instance. Through `pic.node`, also any name in the picture's shape set |
| `shapeOptions` | `ShapeOptions` | forwarded to the shape (e.g. circuit `variant`) |
| `width` / `height` | `number` | explicit size; omit both to auto-fit the text |
| `minWidth` / `minHeight` | `number` | floor for auto-sizing (TikZ `minimum width`) |
| `innerSep` / `outerSep` | `number` | text-to-border padding / border-to-outside gap (TikZ `inner/outer sep`) |
| `text` | `string` | node content; `$...$` goes through KaTeX |
| `labels` | `Label[]` | TikZ `label=<angle>:<text>` — see below |
| `style` / `textStyle` / `className` / `id` / `animate` | `RenderOptions` | paint, in the same bag (through `pic.node`) |
| `rightOf` / `leftOf` / `above` / `below` / `aboveLeft` / … + `distance` | `PlacementOptions` | TikZ `right=of A` (through `pic.node`) |
| `labelDistance` | `number` | default gap for all labels (TikZ `label distance`) |
| `rotate` | `number` | degrees; the anchor compass rotates with the shape |
| `textWidth` / `align` | `number` / `'left' \| 'center' \| 'right'` | wrap width (TikZ `text width`) and block alignment |
| `textStyle` | `TextStyle` | font and colour of the node's text — used for measuring too |
| `pins` | `Pin[]` | TikZ `pin=`: a label with a line to the border; `edge` styles the line |
| `alias` | `string \| string[]` | extra names (through `pic.node`) |
| `anchor` | `AnchorSpec` | place the node *by* this anchor (TikZ `at + anchor=`) |

Factories: `node(opts)`, `rectNode`, `circleNode`, `ellipseNode`,
`diamondNode`.

## Labels

```ts
labels: [
  { text: '$\\alpha$', at: 'north' },
  { text: 'rim', at: 'south east', style: { fontSize: 9 } },
  { text: 'far', at: 'east', distance: 18 },
]
```

- `at`: named anchor, alias (`'ne'`), or numeric angle (screen
  convention, 270 = north).
- `distance`: **border-to-border gap** — outer sep included, font size
  accounted for. Default: the node's `labelDistance`.
- `style`: a `TextStyle` — `fill`, `fontSize`, `fontFamily`, `fontWeight`.
- The same `Label` type rides edges (`pos`, `offset`) and draw verbs.

## Anchors

`node.anchor(spec)` resolves `'north'` … `'south west'`, aliases
(`'ne'`), and numeric angles (`45`, `270`) to boundary points. Also:
`bounds` (including pointers/heads on callouts), `center`,
`contains(p)`.

## Positioning

`src/node/Positioning.ts` holds the relative-placement helpers
(TikZ `positioning` library: `below=of A` style). Layouts
(`chain`/`matrix`/`tree`) build on these — see
[reference: layout](./layout.md).

## Examples

- [anchors](../../examples/anchors.ts) — the compass on one node
- [node-labels](../../examples/node-labels.ts) — distance semantics
- [node-auto-size](../../examples/node-auto-size.ts) — text-fitted sizing
