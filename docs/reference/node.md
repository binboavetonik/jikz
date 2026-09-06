# Reference: node

The `Node` — jikz's TikZ `\node`: a named, anchored, optionally
text-bearing shape. Full API details: [generated API](../api/)
(`npm run docs:api`).

## NodeOptions

| key | type | purpose |
|---|---|---|
| `at` | `PointLike` | placement (the node's `center` unless `anchor` redirects it) |
| `shape` | `ShapeSpec` | any `SHAPE_TYPES` string, a registered custom name, or a `Shape` instance |
| `shapeOptions` | `ShapeOptions` | forwarded to the shape (e.g. circuit `variant`) |
| `width` / `height` | `number` | explicit size; omit both to auto-fit the text |
| `minWidth` / `minHeight` | `number` | floor for auto-sizing (TikZ `minimum width`) |
| `innerSep` / `outerSep` | `number` | text-to-border padding / border-to-outside gap (TikZ `inner/outer sep`) |
| `text` | `string` | node content; `$...$` goes through KaTeX |
| `labels` | `NodeLabel[]` | TikZ `label=<angle>:<text>` — see below |
| `labelDistance` | `number` | default gap for all labels (TikZ `label distance`) |
| `rotate` | `number` | degrees; the anchor compass rotates with the shape |
| `anchor` | `AnchorSpec` | place the node *by* this anchor (TikZ `at + anchor=`) |

Factories: `node(opts)`, `rectNode`, `circleNode`, `ellipseNode`,
`diamondNode`.

## Labels

```ts
labels: [
  { text: '$\\alpha$', at: 'north' },
  { text: 'rim', at: 'south east', options: { fontSize: 9 } },
  { text: 'far', at: 'east', distance: 18 },
]
```

- `at`: named anchor, alias (`'ne'`), or numeric angle (screen
  convention, 270 = north).
- `distance`: **border-to-border gap** — outer sep included, font size
  accounted for. Default: the node's `labelDistance`.
- `options`: `fontSize`, `fontFamily`, `style`, …

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
