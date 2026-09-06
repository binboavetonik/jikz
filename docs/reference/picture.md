# Reference: picture

`picture()` — the declarative registry that is jikz's main API.
Collects statements, resolves names, compiles to SVG. Full API:
[generated reference](../api/) (`npm run docs:api`).

Conceptual intro: [Two API levels](../concepts/two-api-levels.md).

## Construction

```ts
picture(options?: {
  transform?: Transform   // canvas transform — maps the whole scene
  scale?: number          // uniform canvas scale (composes with transform)
})
```

## Verbs

| method | TikZ | paints |
|---|---|---|
| `pic.draw(g, opts?)` | `\draw` | stroke |
| `pic.fill(g, opts?)` | `\fill` | fill |
| `pic.filldraw(g, opts?)` | `\filldraw` | both |
| `pic.path(g, opts?)` | `\path` | registers without painting |

All accept `{ style, label }` — `label: { text, at, distance, options }`
is TikZ's `node[right]{x}` inside the statement.

## Registry

| method | purpose |
|---|---|
| `pic.node(name, options, renderOpts?)` | register + paint a node |
| `pic.edge(from, to, edgeOpts?, renderOpts?)` | boundary-aware edge by name/anchor/point |
| `pic.coordinate(name, at)` | name a raw point (TikZ `\coordinate`) |
| `pic.getNode(name)` | look up (returns `Node \| undefined`) |
| `pic.pen(options?)` | start a fluent path statement |
| `pic.text(p, text, options?)` | bare text with directional placement |

Endpoint strings: `'A'` (auto-boundary), `'A.north'`, `'A.ne'`,
`'A.270'`, or a named coordinate.

## Output

```ts
pic.toSVG({ width, height })        // or { fit: true, padding }
pic.mount(element, sameOptions)     // browser: live DOM tree
```

Both are lazy: statements compile at output time, in registration
order. See [ViewBox, sizing & fit](../concepts/viewbox-and-fit.md).

## Examples

Nearly every card in [examples/](../../examples/) — start with
[flow](../../examples/flow.ts) and
[named-graph](../../examples/named-graph.ts).
