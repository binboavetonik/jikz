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
- `siblingDistance` — minimum whitespace between any two nodes at the
  same depth, along the perpendicular axis.

Sibling subtrees are packed by **contour**, not by bounding box
(Reingold–Tilford, via Buchheim et al. 2002's linear-time formulation).
Two subtrees are pushed apart only at the depths where they actually
collide, so a leaf can tuck in beside a sibling whose subtree is wide
only further down. Drawings come out 15–20% narrower than bounding-box
packing on random trees, and a parent sits exactly midway between its
outermost children, so its edges are symmetric.

`align: 'rank'` (default `'parent'`) lines every depth level up into one
column: the inter-level gap is `levelDistance` between the two levels'
widest nodes, so org-chart/pipeline trees read as clean tiers. Per-node
`sep` only applies in the default `'parent'` mode.

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

## layered

```ts
layered({ at: point(40, 40), grow: 'down', rankSep, nodeSep })
  .node('config', { shape: 'circle', minWidth: 40, minHeight: 40 })
  .node('db', { shape: 'circle', minWidth: 40, minHeight: 40 })
  .node('cache', { shape: 'circle', minWidth: 40, minHeight: 40 })
  .node('api', { shape: 'circle', minWidth: 40, minHeight: 40 })
  .edge('config', 'db')
  .edge('config', 'cache')
  .edge('db', 'api')
  .edge('cache', 'api')   // api has two parents — tree() can't express this
  .build()   // → { nodes, edges, level(), incoming(), outgoing(), ... }
```

Sugiyama-style DAG layout. Nodes are declared by name and edges by name
pair; a node may have any number of parents. `rankSep` / `nodeSep` are
edge-to-edge gaps (the same rule as `tree`). The full pipeline:

1. **Cycle removal** — DFS back-edges are reversed for layout; the
   original direction is restored at render.
2. **Rank assignment** — network simplex (Gansner et al. 1993) with
   TikZ's top/bottom balance pass; `edge(a, b, { minLength: n })`
   stretches an edge across `n` ranks.
3. **Dummy nodes** — edges spanning several ranks are split into dummy
   chains, collapsed into `Edge.bendPoints` at render.
4. **Crossing minimization** — weighted-median + transpose sweeps
   (TikZ's GansnerKNV1993) with a weighted bilayer cross count
   (Barth et al., via dagre); `edge(a, b, { weight: w })` makes an edge
   count heavier in the keep-best comparison.
5. **Coordinate assignment** — selectable via `coordinates`, see below.

### `coordinates` — cross-axis placement

Step 5 decides where nodes sit *within* a rank. Ranks and left-to-right
order are identical either way; only the spacing differs.

| | `'gansner'` (default) | `'brandes-koepf'` |
|---|---|---|
| Method | network simplex on an auxiliary graph (edge nodes weighted 8/2/1 by dummy-ness) + left/right balance | four extreme alignments (upper/lower × left/right), median-averaged |
| Source | Gansner et al. 1993 §5, as in TikZ's `NodePositioningGansnerKNV1993` | Brandes & Köpf 2002 |
| Result | optimal for its objective — the most balanced, symmetric drawings | heuristic; long edges still straight, spacing slightly less symmetric |
| Cost | superlinear — the auxiliary graph has \|V\|+\|E\| vertices and the simplex does full work per pivot | linear in V+E |

```ts
layered({ grow: 'down', coordinates: 'brandes-koepf' })
```

Measured on a chain-like DAG (n nodes, ~2n edges), median of 3:

| nodes | `'gansner'` | `'brandes-koepf'` |
|---:|---:|---:|
| 200 | 284 ms | 5 ms |
| 500 | 2,244 ms | 10 ms |
| 1,000 | 12,867 ms | 18 ms |
| 2,000 | 56,812 ms | 36 ms |
| 4,000 | — | 68 ms |

Keep the default for hand-authored diagrams, where it is both prettier
and fast enough. Switch to `'brandes-koepf'` for generated graphs past a
couple of hundred nodes.

One visible difference beyond speed: given a lone parent with two
children, every position between them is an optimum of Gansner's
objective, and the balance pass does not break the tie — the parent ends
up flush with one child. Brandes–Köpf centers it.

### Clusters — `.cluster(name, members, options?)`

Group nodes into a subgraph box, Graphviz's `subgraph cluster_x`:

```ts
layered({ grow: 'down', clusterPadding: 14 })
  .node('auth').node('rate').node('route').node('log')
  .edge('auth', 'rate').edge('rate', 'route')
  .cluster('policy', ['auth', 'rate'])                  // nested…
  .cluster('gateway', ['policy', 'route'], { label: 'gateway' })
  .build()   // → result.clusters, result.getCluster('gateway')
```

**Clusters nest**: a member may be a node *or* another cluster, which
must already be declared. Each entity belongs to at most one cluster, so
the nesting is a tree.

Each cluster comes back with `bounds`, a ready-made `rect`, its `label`,
its `depth`, its `parent`, its `children`, and `nodes` — every node
inside it, nested clusters included. Paint the boxes **before** the nodes
and edges, and **outermost first** (`sort((a, b) => a.depth - b.depth)`)
so a nested box lands on top of its parent.

The box is a layout constraint, not a post-hoc bounding box (`rectFit`
already does that). Members are kept contiguous at **every level of
nesting**, and left/right border vertices are inserted on **every** rank
a cluster spans — including ranks it has no member on — so a foreign edge
passing the cluster is pushed clear of the box instead of routed through
it. `clusterPadding` (default 12) is the gap between a box and its
contents, overridable per cluster; a parent always encloses its children
even when a child asks for more padding than its parent.

Because it constrains the layout, adding a cluster can move nodes: the
border chains give the coordinate pass structure it did not have before.
The box also counts as content, so `at` anchors the box rather than the
leftmost node.

Not supported: overlapping clusters (a node or cluster in two parents
throws), per-cluster `rankdir`, and edges attached to a cluster rather
than to a node in it.

Demos: [`examples/layout-layered.ts`](../../examples/layout-layered.ts),
[`examples/dependency-graph.ts`](../../examples/dependency-graph.ts),
[`examples/class-hierarchy.ts`](../../examples/class-hierarchy.ts).

## Placement helpers

- `nodeCircle(center, radius, names)` — nodes evenly on a ring
  ([K5 example](../../examples/complete-graph.ts)).
- `rectFit(points)` — tight bbox around a subset (TikZ `fit`;
  [fit example](../../examples/fit-library.ts)).
- `src/node/Positioning.ts` — TikZ `positioning`-library primitives
  (`below=of`-style) the builders use internally.
