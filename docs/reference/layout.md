# Reference: layout

Structure in, coordinates out. The three builders return plain
geometry — `{ nodes, edges }` — that you render with `SVGRenderer`
or `picture`. Full API: [generated reference](../api/) (`npm run
docs:api`).

## chain

```ts
chain(point(60, 70), { spacing: 46 })
  .node({ text: 'q0', shape: 'circle', width: 40, height: 40 })
  .node({ text: 'q1', ... })
  .going('below')          // redirect the chain
  .node({ text: 'q2', ... })
  .build()                 // → { nodes, edges }
```

TikZ's chains library: successive nodes positioned along the current
direction; consecutive pairs pre-wired as edges.
Demo: [`examples/layout-chain.ts`](../../examples/layout-chain.ts).

## matrix

```ts
matrix({ at: point(50, 40), columnSep: 26, rowSep: 18 })
  .rows([
    ['a11', 'a12', 'a13'],
    ['a21', 'a22', 'a23'],
  ])
  .build()   // → { cells } — rows of Nodes (null = empty cell)
```

TikZ's `\matrix of nodes`: column/row separation, per-column
alignment. Demo: [`examples/layout-matrix.ts`](../../examples/layout-matrix.ts).

## tree

```ts
tree({ at: point(220, 35), grow: 'down', levelDistance, siblingDistance })
  .root('CEO')
    .child('CTO')
      .children(['Eng', 'QA'])
      .parent()
    .parent()
    .child('CFO')
  .build()   // → { nodes, edges }, nodes named by their text
```

Hierarchical auto-layout; `grow`: `'down' | 'up' | 'left' | 'right'`.
Node extents are **auto-measured**, and the two spacing options are
edge-to-edge gaps:

- `levelDistance` — whitespace between a node's far edge and its
  children's near edges along the growth axis.
- `siblingDistance` — whitespace between sibling subtree bounding boxes
  along the perpendicular axis.

Override the level gap per node with `.sep(d)` (builder) or
`TreeNodeSpec.sep` (spec):

```ts
tree({ grow: 'right' })
  .root({ text: '', name: 'root', width: 0, height: 0, minWidth: 0, minHeight: 0 })
    .sep(16)                 // invisible spacer root hugging its children
    .child('1.e4')
    .build()
```

Demos: [`examples/layout-tree.ts`](../../examples/layout-tree.ts),
[`layout-tree-horizontal.ts`](../../examples/layout-tree-horizontal.ts),
[probability-tree](../../examples/probability-tree.ts).

## Placement helpers

- `nodeCircle(center, radius, names)` — nodes evenly on a ring
  ([K5 example](../../examples/complete-graph.ts)).
- `rectFit(points)` — tight bbox around a subset (TikZ `fit`;
  [fit example](../../examples/fit-library.ts)).
- `src/node/Positioning.ts` — TikZ `positioning`-library primitives
  (`below=of`-style) the builders use internally.
