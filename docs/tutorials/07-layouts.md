# Tutorial 7: Layouts

In which we declare *structure* and let jikz compute *positions* —
chains, matrices, trees, rings, and fit-boxes.

The layout builders return plain geometry (`{ nodes, edges }`); you
render the pieces yourself, at either [API level](../concepts/two-api-levels.md).
Nothing is hidden, nothing is painted behind your back.

## Chain — successive nodes, auto-wired

TikZ's chains library: place a start, then keep `going` in a
direction. Edges between successive nodes come for free:

```ts
import { chain, point, SVGRenderer, allShapes } from 'jikz'

const { nodes, edges } = chain(point(60, 70), { spacing: 46 })
  .node({ text: 'q0', shape: allShapes.circle, width: 40, height: 40 })
  .node({ text: 'q1', shape: allShapes.circle, width: 40, height: 40 })
  .going('below')
  .node({ text: 'q2', shape: allShapes.circle, width: 40, height: 40 })
  .going('right')
  .node({ text: 'q3', shape: allShapes.circle, width: 40, height: 40 })
  .build()

const r = new SVGRenderer()
for (const e of edges) r.renderEdge(e, { style: { stroke: '#64748b' } })
for (const n of nodes) r.renderNode(n, { style: { stroke: '#2563eb', fill: '#dbeafe' } })
r.builder.mount(container, { width: 340, height: 180 })
```

## Matrix — rows of cells

TikZ's `\matrix of nodes`: column/row separation, automatic alignment,
gaps as `null`:

```ts
import { matrix, point, SVGRenderer } from 'jikz'

const { cells } = matrix({ at: point(50, 40), columnSep: 26, rowSep: 18 })
  .rows([
    ['a11', 'a12', 'a13'],
    ['a21', 'a22', 'a23'],
    ['a31', 'a32', 'a33'],
  ])
  .build()
```

## Tree — declare hierarchy, get coordinates

```ts
import { tree, point } from 'jikz'

const { nodes, edges } = tree({ at: point(220, 35), grow: 'down' })
  .root('CEO')
    .child('CTO')
      .children(['Eng', 'QA'])
      .parent()
    .parent()
    .child('CFO')
  .build()
```

`grow: 'right'` gives horizontal trees — the
[probability-tree example](../../examples/probability-tree.ts) lays out
two coin flips this way and hangs branch probabilities on the edges.

The tree measures every node and treats the two spacing options as
**edge-to-edge gaps**: `levelDistance` is the whitespace between a
node's far edge and its children's near edges along the growth axis;
`siblingDistance` is the whitespace between sibling subtrees. So a
parent with a long label pushes its children further than a short one
— see the [horizontal-tree example](../../examples/layout-tree-horizontal.ts).
Override the level gap per node with `.sep(d)` (or `TreeNodeSpec.sep`)
for spacer/invisible roots. For clean tier columns, pass `align: 'rank'`
— every depth level then shares one column, with the gap measured
between the two levels' widest nodes.

Nodes come back **named by their text**, which pairs with picture
edges:

```ts
for (const n of t.nodes) pic.node(n.text, { at: n.center, ... })
pic.edge('start', 'H', { label: '1/2' })
```

## Layered — DAGs

`tree` requires exactly one parent per node. When a node can have
several parents (a DAG), use `layered` — nodes and edges are declared
by name, ranks align into columns:

```ts
import { layered, point, allShapes } from 'jikz'

const { nodes, edges } = layered({ at: point(20, 20), grow: 'down' })
  .node('config')
  .node('db')
  .node('cache')
  .node('api')
  .edge('config', 'db')
  .edge('config', 'cache')
  .edge('db', 'api')
  .edge('cache', 'api')   // two parents
  .build()
```

`rankSep` / `nodeSep` are edge-to-edge gaps, exactly like `tree`'s
`levelDistance` / `siblingDistance`. Ranks come from network simplex
(Gansner et al. 1993), cycles are handled by reversing back-edges (the
rendered arrow keeps your original direction), and multi-rank edges bend
through intermediate points. Within each rank, weighted-median +
transpose sweeps minimize crossings (edge `weight` counts in the
comparison), and a second network-simplex pass assigns balanced,
symmetric coordinates — including straightening long-edge dummy chains.

## Two utilities that finish the job

**`nodeCircle`** — vertices evenly on a ring (the
[K5 example](../../examples/complete-graph.ts) draws all 10 chords,
boundary-clipped for free):

```ts
for (const n of nodeCircle(point(160, 110), 90, ['v1', 'v2', 'v3', 'v4', 'v5'])) {
  pic.node(n.text, { at: n.center, shape: allShapes.circle, ... })
}
```

**`rectFit`** — TikZ's `\node[fit=(api)(cache)]`: the tight rectangle
around a subset of nodes' bounds, plus your padding:

```ts
const corners = ['api', 'cache'].flatMap((name) => {
  const [x0, y0, x1, y1] = pic.getNode(name)!.bounds
  return [point(x0, y0), point(x1, y1)]
})
const fit = rectFit(corners)!          // null only for an empty set
pic.draw(rect(fit.x - pad, fit.y - pad, fit.width + 2 * pad, fit.height + 2 * pad),
  { style: { stroke: '#7c3aed', dash: 'dashed' } })
```

The [fit example](../../examples/fit-library.ts) draws a dashed
"backend" grouping around two services with exactly this.

## What to notice

- **Builders compute, you paint.** The returned nodes/edges are the
  same objects `SVGRenderer` and `picture` accept — no special
  "layout render mode".
- **Names survive layout.** Tree/matrix nodes are named by text, so
  post-layout edges stay string-addressed.
- Layouts compose with everything else: edge routing, labels, styles,
  `fit: true` sizing.

## Where to go next

You've seen the whole vocabulary. From here:

- [TikZ → jikz mapping](../concepts/tikz-mapping.md) — the full
  idiom table, for translating something specific.
- The [cookbook gallery](../../examples/) — 50 tested examples by
  domain: geometry, physics, graphs, chess, circuits.
- Reference docs *(coming in Phase 3)* — exhaustive per-module API.
