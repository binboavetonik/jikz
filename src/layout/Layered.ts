import { point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions, type LoopDirection } from '../node/Edge'
import {
  type LayoutGrowth,
  axesToPoint,
  perpendicularExtent,
  primaryExtent,
  primaryOf,
  primarySign,
  secondaryOf,
} from './shared'
import { Rectangle } from '../geometry/Rectangle'
import { gapBetween } from './brandesKoepf'
import { NetworkSimplex, networkSimplexRanks, type SimplexEdge, type SimplexVertex } from './networkSimplex'
import { minimizeCrossings } from './ordering'
import { assignCoordinatesBK } from './brandesKoepf'

/**
 * Options for the layered (Sugiyama) layout.
 */
export interface LayeredOptions {
  /**
   * Origin of the first rank (default: { x: 0, y: 0 }).
   */
  at?: PointLike

  /**
   * Growth direction (default: 'down').
   */
  grow?: LayoutGrowth

  /**
   * Edge-to-edge gap between rank boxes along the growth axis (default: 50).
   */
  rankSep?: number

  /**
   * Edge-to-edge gap between sibling node boxes within a rank (default: 30).
   */
  nodeSep?: number

  /**
   * Default node options applied to every node.
   */
  nodeOptions?: Omit<NodeOptions, 'at' | 'text'>

  /**
   * Default edge options applied to every connection.
   */
  edgeOptions?: EdgeOptions

  /**
   * Whether to create edges (default: true).
   */
  drawEdges?: boolean

  /**
   * Which algorithm assigns coordinates on the secondary (cross) axis —
   * the axis perpendicular to `grow`. Ranking and crossing minimization
   * are unaffected, so both settings produce the same ranks and the same
   * left-to-right order; only the spacing within each rank differs.
   *
   * - `'gansner'` (default) — network simplex on the Gansner et al. 1993
   *   auxiliary graph, the same choice TikZ's
   *   `NodePositioningGansnerKNV1993` makes. Optimal for its objective,
   *   so drawings come out maximally balanced and symmetric. Cost grows
   *   superlinearly: the auxiliary graph has |V|+|E| vertices and the
   *   simplex does full work per pivot, which dominates `build()` past a
   *   few hundred nodes.
   * - `'brandes-koepf'` — Brandes & Köpf 2002, a linear-time heuristic
   *   (four extreme alignments, median-averaged). Keeps long edges
   *   straight and is dramatically faster on large graphs; spacing is
   *   slightly less symmetric than `'gansner'`.
   *
   * Rule of thumb: keep the default for hand-authored diagrams, switch to
   * `'brandes-koepf'` for generated graphs of more than ~200 nodes.
   * Cyclic input reaches that threshold sooner: reversed back-edges tend
   * to span many ranks, and every rank an edge crosses adds a dummy
   * vertex to the auxiliary graph.
   *
   * @example
   * ```typescript
   * layered({ grow: 'down', coordinates: 'brandes-koepf' })
   * ```
   */
  coordinates?: 'gansner' | 'brandes-koepf'

  /**
   * Edge-to-edge gap between a cluster's box and the nodes inside it
   * (default: 12). Also the gap the box keeps from anything outside.
   */
  clusterPadding?: number
}

/**
 * A cluster declaration. `members` names nodes, or other clusters to
 * nest inside this one — a cluster must be declared before it can be
 * named as a member.
 */
export interface LayeredClusterSpec {
  name: string
  members: readonly string[]
  options?: ClusterOptions
}

/** Per-cluster overrides. */
export interface ClusterOptions {
  /** Gap between the box and its contents; defaults to `clusterPadding`. */
  padding?: number
  /** Text drawn with the cluster (the caller decides where to put it). */
  label?: string
  /**
   * Growth direction for this cluster's own contents, overriding the
   * layout's `grow` — a top-to-bottom diagram with a left-to-right
   * stage inside it, say.
   *
   * A cluster with its own `grow` cannot be a mere ordering constraint:
   * two rank directions have no common rank assignment. It is instead
   * laid out as a graph in its own right and collapsed to a single box
   * in its parent, which is then laid out normally — so edges crossing
   * the boundary attach to the nodes they name, but are routed by the
   * parent as far as the box.
   *
   * Ranking, ordering and coordinates inside such a cluster are decided
   * entirely by its own layout, so `weight` and `minLength` on an edge
   * that crosses the boundary have no effect on the inside.
   */
  grow?: LayoutGrowth
}

/** A laid-out cluster: its box, in picture coordinates. */
export interface LayeredCluster {
  name: string
  label?: string
  /** Bounding box as [minX, minY, maxX, maxY], padding included. */
  bounds: [number, number, number, number]
  /** The box as a renderable rectangle. */
  rect: Rectangle
  /** Every node inside, nested clusters included. */
  nodes: Node[]
  /** Enclosing cluster's name, when this one is nested. */
  parent?: string
  /** Directly nested clusters, in declaration order. */
  children: string[]
  /** Nesting level: 0 for a top-level cluster. */
  depth: number
}

/**
 * A node in a layered layout: a name (for edge addressing) plus options.
 */
export interface LayeredNodeSpec {
  name: string
  /** Node options; `text` defaults to `name`. */
  options?: Omit<NodeOptions, 'at'>
}

/**
 * An edge between two named nodes.
 */
export interface LayeredEdgeSpec {
  from: string
  to: string
  /** Minimum number of ranks this edge must span (default: 1). */
  minLength?: number
  /** Weight used by crossing minimization (default: 1). */
  weight?: number
  /**
   * Which side a self-edge (`from === to`) loops out on. Ignored on
   * ordinary edges. Defaults to the side that does not collide with the
   * rank direction: `'right'` for vertical growth, `'above'` for
   * horizontal.
   */
  loop?: LoopDirection
}

/**
 * Result of building a layered layout.
 */
export interface LayeredResult {
  /** All real nodes, in insertion order. */
  nodes: Node[]

  /** Laid-out clusters, in declaration order. */
  clusters: LayeredCluster[]

  /** Get a cluster by name. */
  getCluster(name: string): LayeredCluster | undefined

  /** All edges (multi-rank edges carry bend points). */
  edges: Edge[]

  /**
   * Real nodes at a specific rank (0 = first rank).
   *
   * Ranks describe the outer graph. A cluster given its own `grow` is
   * ranked internally by its own layout, so it counts as a single rank
   * here and all of its nodes are reported on it.
   */
  level(index: number): Node[]

  /** Total number of ranks. */
  levelCount: number

  /** Get a node by name. */
  getNode(name: string): Node | undefined

  /** Parent nodes (original edges into `node`). */
  incoming(node: Node): Node[]

  /** Child nodes (original edges out of `node`). */
  outgoing(node: Node): Node[]

  /** Bounding box [minX, minY, maxX, maxY]. */
  bounds: [number, number, number, number]

  /** Nodes + edges for rendering. */
  toRenderables(): (Node | Edge)[]
}

/**
 * Builder for the layered layout.
 */
export interface LayeredBuilder {
  node(name: string, options?: Omit<NodeOptions, 'at'>): LayeredBuilder
  /**
   * Group nodes into a cluster — TikZ's `\begin{scope}[…]` around a
   * subgraph, or Graphviz's `subgraph cluster_x`. Members are kept
   * contiguous in every rank they occupy, and the result carries a box
   * that encloses them and nothing else.
   */
  cluster(
    name: string,
    members: readonly string[],
    options?: ClusterOptions,
  ): LayeredBuilder
  edge(
    from: string,
    to: string,
    options?: { minLength?: number; weight?: number; loop?: LoopDirection },
  ): LayeredBuilder
  build(): LayeredResult
}

interface InternalVertex {
  name: string
  kind: 'node' | 'dummy'
  /** Cluster nesting path this vertex sits in; drives ordering contiguity. */
  group?: readonly string[]
  /** −1 pins to the front of its group, +1 to the back. */
  groupPin?: number
  /** Overrides `nodeSep` against rank neighbours (cluster borders). */
  gap?: number
  /** Set on the two border chains of a cluster. */
  border?: { cluster: string; side: 'left' | 'right' }
  resolvedOptions?: Omit<NodeOptions, 'at'>
  node?: Node
  rank: number
  secondary: number
  primaryHalf: number
  secondaryHalf: number
  inEdges: InternalEdge[]
  outEdges: InternalEdge[]
}

interface InternalEdge {
  /** Effective tail after cycle removal (equals origFrom unless reversed). */
  from: InternalVertex
  /** Effective head after cycle removal (equals origTo unless reversed). */
  to: InternalVertex
  /** Original tail (set on user-declared edges; undefined on sub-edges). */
  origFrom?: InternalVertex
  /** Original head (set on user-declared edges; undefined on sub-edges). */
  origTo?: InternalVertex
  /** True when the edge was reversed to break a cycle. */
  reversed?: boolean
  /**
   * Set when the caller named a cluster as an endpoint. The layout runs
   * against a representative member, but the drawn edge stops at the
   * cluster's box.
   */
  fromCluster?: string
  toCluster?: string
  minLength: number
  weight: number
  edge?: Edge
  /** Dummy vertices inserted along this edge (effective direction). */
  dummies?: InternalVertex[]
}

const DEFAULT_RANK_SEP = 50
const DEFAULT_NODE_SEP = 30
const DEFAULT_CLUSTER_PADDING = 12

/**
 * Weight on the edges chaining a cluster's border vertices rank to rank.
 * High enough that the coordinate pass straightens each side into a line
 * rather than letting the box wobble; the omega weights give dummy-to-dummy
 * edges another ×8 on top.
 */
const BORDER_CHAIN_WEIGHT = 16

/** Drop keys whose value is `undefined`, so spreads keep defaults. */
/** Longest shared prefix of two cluster paths. */
function commonPrefix(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
): readonly string[] {
  if (!a || !b) return []
  const out: string[] = []
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) break
    out.push(a[i]!)
  }
  return out
}

/** Name of the stand-in node an independently-grown cluster collapses to. */
function placeholderName(cluster: string): string {
  return `__cluster__${cluster}`
}

function isPlaceholder(name: string | undefined): boolean {
  return name !== undefined && name.startsWith('__cluster__')
}

function definedOnly<T extends object>(options: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(options) as [keyof T, T[keyof T]][]) {
    if (v !== undefined) out[k] = v
  }
  return out
}

function resolveNodeOptions(
  name: string,
  options: Omit<NodeOptions, 'at'> | undefined,
  nodeOptions: Omit<NodeOptions, 'at' | 'text'> | undefined,
): Omit<NodeOptions, 'at'> {
  return { ...nodeOptions, ...options, name, text: options?.text ?? name }
}

class LayeredBuilderImpl implements LayeredBuilder {
  private _options: LayeredOptions
  private _vertices = new Map<string, InternalVertex>()
  private _edges: InternalEdge[] = []
  private _dummies: InternalVertex[] = []
  private _dummyCounter = 0
  private _unitEdges: InternalEdge[] = []
  /**
   * Self-edges, held aside. A loop carries no ranking or ordering
   * information — it would only skew the crossing counts and add a
   * useless vertex to the coordinate simplex — so it stays out of the
   * layout entirely and is re-attached as a loop at render time.
   */
  private _selfEdges: { vertex: InternalVertex; loop?: LoopDirection }[] = []
  private _clusters: LayeredClusterSpec[] = []
  /** Border chains built during `build()`, keyed by cluster name. */
  private _borders = new Map<string, { left: InternalVertex[]; right: InternalVertex[] }>()
  private _ranks: Map<number, InternalVertex[]> = new Map()
  private _maxRank = 0

  constructor(options: LayeredOptions = {}) {
    this._options = {
      at: { x: 0, y: 0 },
      grow: 'down',
      rankSep: DEFAULT_RANK_SEP,
      nodeSep: DEFAULT_NODE_SEP,
      drawEdges: true,
      coordinates: 'gansner',
      clusterPadding: DEFAULT_CLUSTER_PADDING,
      // Explicit `undefined` must not clobber a default — passing an
      // optional through (`{ nodeSep: maybeUndefined }`) is ordinary
      // caller code, and a plain spread would turn it into NaN downstream.
      ...definedOnly(options),
    }
  }

  node(name: string, options?: Omit<NodeOptions, 'at'>): LayeredBuilder {
    if (this._vertices.has(name)) {
      throw new Error(`layered layout: duplicate node name "${name}"`)
    }
    this._vertices.set(name, {
      name,
      kind: 'node',
      resolvedOptions: resolveNodeOptions(name, options, this._options.nodeOptions),
      rank: 0,
      secondary: 0,
      primaryHalf: 0,
      secondaryHalf: 0,
      inEdges: [],
      outEdges: [],
    })
    return this
  }

  cluster(
    name: string,
    members: readonly string[],
    options?: ClusterOptions,
  ): LayeredBuilder {
    if (this._clusters.some((c) => c.name === name)) {
      throw new Error(`layered layout: duplicate cluster name "${name}"`)
    }
    if (this._vertices.has(name)) {
      throw new Error(
        `layered layout: cluster name "${name}" collides with a node of the same name`,
      )
    }
    for (const m of members) {
      const isNode = this._vertices.has(m)
      const isCluster = this._clusters.some((c) => c.name === m)
      if (!isNode && !isCluster) {
        throw new Error(
          `layered layout: cluster "${name}" references unknown node or cluster "${m}" ` +
            '(a nested cluster must be declared before the one that contains it)',
        )
      }
      // One direct parent per entity: overlapping clusters have no
      // well-defined box, and two parents would make nesting a DAG.
      const owner = this._clusters.find((c) => c.members.includes(m))
      if (owner) {
        throw new Error(
          `layered layout: "${m}" is already in cluster "${owner.name}" ` +
            '(a node or cluster may sit in only one cluster)',
        )
      }
    }
    this._clusters.push({ name, members, options })
    return this
  }

  /**
   * An edge with a cluster at one or both ends.
   *
   * Ranking, ordering and coordinates all need a real vertex, so each
   * cluster endpoint is stood in for by a representative member: the
   * cluster's entry point for an edge coming in, its exit for one going
   * out. Only the drawn geometry uses the box.
   */
  private clusterEdge(
    from: string,
    to: string,
    fromIsCluster: boolean,
    toIsCluster: boolean,
    options?: { minLength?: number; weight?: number; loop?: LoopDirection },
  ): LayeredBuilder {
    if (from === to) {
      throw new Error(`layered layout: cluster "${from}" cannot edge to itself`)
    }
    for (const [name, isCluster, other] of [
      [from, fromIsCluster, to],
      [to, toIsCluster, from],
    ] as const) {
      if (!isCluster && !this._vertices.has(name)) {
        throw new Error(`layered layout: edge references unknown node "${name}"`)
      }
      // An edge from a box to something already inside it has no
      // direction that means anything.
      if (isCluster && this.clusterNodes(name).includes(other)) {
        throw new Error(
          `layered layout: edge between cluster "${name}" and "${other}", ` +
            'which is inside it',
        )
      }
      if (isCluster && this._clusters.some((c) => c.name === other)) {
        const nested =
          this.clusterPath(name).includes(other) || this.clusterPath(other).includes(name)
        if (nested) {
          throw new Error(
            `layered layout: edge between nested clusters "${from}" and "${to}"`,
          )
        }
      }
    }

    const fromName = fromIsCluster ? this.clusterExit(from) : from
    const toName = toIsCluster ? this.clusterEntry(to) : to
    const fromVertex = this._vertices.get(fromName)!
    const toVertex = this._vertices.get(toName)!
    if (fromVertex === toVertex) {
      throw new Error(
        `layered layout: edge "${from}" → "${to}" resolves to a single node`,
      )
    }

    const internalEdge: InternalEdge = {
      from: fromVertex,
      to: toVertex,
      origFrom: fromVertex,
      origTo: toVertex,
      reversed: false,
      minLength: options?.minLength ?? 1,
      weight: options?.weight ?? 1,
      ...(fromIsCluster ? { fromCluster: from } : {}),
      ...(toIsCluster ? { toCluster: to } : {}),
    }
    fromVertex.outEdges.push(internalEdge)
    toVertex.inEdges.push(internalEdge)
    this._edges.push(internalEdge)
    return this
  }

  /**
   * The member an edge into `cluster` should aim at: one with no
   * incoming edge from inside, i.e. where the subgraph starts. Falls
   * back to the first declared member when every node has one (a cycle).
   */
  private clusterEntry(cluster: string): string {
    const inside = new Set(this.clusterNodes(cluster))
    for (const name of inside) {
      const v = this._vertices.get(name)!
      if (!v.inEdges.some((e) => inside.has(e.from.name))) return name
    }
    return [...inside][0]!
  }

  /** The member an edge out of `cluster` should leave from — its exit. */
  private clusterExit(cluster: string): string {
    const inside = new Set(this.clusterNodes(cluster))
    for (const name of inside) {
      const v = this._vertices.get(name)!
      if (!v.outEdges.some((e) => inside.has(e.to.name))) return name
    }
    return [...inside][inside.size - 1]!
  }

  /** Whether some enclosing cluster grows in its own direction. */
  private hasIndependentAncestor(name: string): boolean {
    return this.clusterPath(name)
      .slice(0, -1)
      .some(
        (p) => this._clusters.find((c) => c.name === p)?.options?.grow !== undefined,
      )
  }

  /** Direct child clusters of `name`, in declaration order. */
  private childClusters(name: string): LayeredClusterSpec[] {
    const spec = this._clusters.find((c) => c.name === name)!
    return spec.members
      .map((m) => this._clusters.find((c) => c.name === m))
      .filter((c): c is LayeredClusterSpec => c !== undefined)
  }

  /** Every node name inside `name`, nested clusters included. */
  private clusterNodes(name: string): string[] {
    const spec = this._clusters.find((c) => c.name === name)!
    const out: string[] = []
    for (const m of spec.members) {
      if (this._vertices.has(m)) out.push(m)
      else out.push(...this.clusterNodes(m))
    }
    return out
  }

  /** Nesting path to `name`, outermost first and including it. */
  private clusterPath(name: string): string[] {
    const parent = this._clusters.find((c) => c.members.includes(name))
    return parent ? [...this.clusterPath(parent.name), name] : [name]
  }

  edge(
    from: string,
    to: string,
    options?: { minLength?: number; weight?: number; loop?: LoopDirection },
  ): LayeredBuilder {
    // An endpoint may name a cluster. Ranking needs a real vertex, so
    // the layout runs against a representative member; the drawn edge
    // stops at the box (see the render step in buildFlat).
    const fromIsCluster = this._clusters.some((c) => c.name === from)
    const toIsCluster = this._clusters.some((c) => c.name === to)
    if (fromIsCluster || toIsCluster) {
      return this.clusterEdge(from, to, fromIsCluster, toIsCluster, options)
    }

    const fromVertex = this._vertices.get(from)
    const toVertex = this._vertices.get(to)
    if (!fromVertex || !toVertex) {
      throw new Error(
        `layered layout: edge references unknown node "${!fromVertex ? from : to}"`,
      )
    }
    if (fromVertex === toVertex) {
      this._selfEdges.push({ vertex: fromVertex, loop: options?.loop })
      return this
    }
    const internalEdge: InternalEdge = {
      from: fromVertex,
      to: toVertex,
      origFrom: fromVertex,
      origTo: toVertex,
      reversed: false,
      minLength: options?.minLength ?? 1,
      weight: options?.weight ?? 1,
    }
    fromVertex.outEdges.push(internalEdge)
    toVertex.inEdges.push(internalEdge)
    this._edges.push(internalEdge)
    return this
  }

  build(): LayeredResult {
    // A cluster with its own `grow` cannot be expressed as a constraint
    // on this graph's ranks, so it is peeled off and laid out separately
    // (see buildWithSubLayouts). What remains is an ordinary graph.
    // Only the outermost independently-grown cluster on each branch is
    // peeled off here; one nested inside another is handled by that
    // one's own sub-layout, recursively.
    const independent = this._clusters.filter(
      (c) => c.options?.grow !== undefined && !this.hasIndependentAncestor(c.name),
    )
    if (independent.length > 0) return this.buildWithSubLayouts(independent)
    return this.buildFlat()
  }

  /**
   * Lay out each independently-growing cluster as a graph of its own,
   * collapse each to a placeholder node the size of its box, lay out
   * what is left, then re-run each sub-layout at the position its
   * placeholder ended up in.
   *
   * Re-running rather than translating keeps every coordinate produced
   * by the layout itself: `Node` positions are set at construction, so
   * moving a finished sub-layout would mean rebuilding every node anyway.
   * The sizing pass is cheap next to the risk of getting that wrong.
   */
  private buildWithSubLayouts(independent: LayeredClusterSpec[]): LayeredResult {
    const grow = this._options.grow!
    const swallowed = new Map<string, string>() // node name → its cluster
    for (const c of independent) {
      for (const n of this.clusterNodes(c.name)) swallowed.set(n, c.name)
    }

    // 1. Size each cluster by laying it out at the origin.
    const sized = new Map<string, { result: LayeredResult; pad: number }>()
    for (const c of independent) {
      const pad = c.options?.padding ?? this._options.clusterPadding!
      sized.set(c.name, { result: this.subLayout(c, { x: 0, y: 0 }), pad })
    }

    // 2. Parent graph: everything not swallowed, plus one placeholder
    //    node per independent cluster, sized to its box.
    const parent = new LayeredBuilderImpl({ ...this._options, grow })
    for (const [name, v] of this._vertices) {
      if (!swallowed.has(name)) parent.node(name, v.resolvedOptions)
    }
    for (const c of independent) {
      const { result, pad } = sized.get(c.name)!
      const [x0, y0, x1, y1] = result.bounds
      parent.node(placeholderName(c.name), {
        shape: 'rectangle',
        text: '',
        width: x1 - x0 + 2 * pad,
        height: y1 - y0 + 2 * pad,
        minWidth: 0,
        minHeight: 0,
      })
    }

    const outer = (name: string): string => {
      const owner = swallowed.get(name)
      return owner ? placeholderName(owner) : name
    }

    // Crossing edges go into the parent so it ranks the cluster
    // correctly, but their geometry is rebuilt afterwards against the
    // real endpoints — the parent only ever saw the placeholder. Record
    // which is which: `build()` emits one edge per declared edge, in
    // declaration order, so the flags line up by index.
    const crossesBoundary: boolean[] = []
    for (const e of this._edges) {
      const from = outer(e.origFrom!.name)
      const to = outer(e.origTo!.name)
      if (from === to) continue // wholly inside one cluster
      parent.edge(from, to, { minLength: e.minLength, weight: e.weight })
      crossesBoundary.push(this.needsRebuild(e, swallowed))
    }
    for (const self of this._selfEdges) {
      if (!swallowed.has(self.vertex.name)) {
        parent.edge(self.vertex.name, self.vertex.name, { loop: self.loop })
      }
    }
    // Constraint clusters that live outside the independent ones carry
    // over, with any independent child standing in as its placeholder.
    const peeled = new Set(independent.map((i) => i.name))
    for (const c of this._clusters) {
      if (peeled.has(c.name)) continue
      // A cluster inside a peeled one travels with that sub-layout.
      if (this.clusterPath(c.name).some((p) => p !== c.name && peeled.has(p))) continue
      const members = c.members
        .filter((m) => !swallowed.has(m))
        .map((m) => (peeled.has(m) ? placeholderName(m) : m))
      if (members.length > 0) parent.cluster(c.name, members, c.options)
    }

    const outerResult = parent.build()

    // 3. Re-run each sub-layout inside its placeholder's box.
    const nodes = outerResult.nodes.filter((n) => !isPlaceholder(n.name))
    const edges = outerResult.edges.filter((_, i) => !crossesBoundary[i])
    const clusters = [...outerResult.clusters]

    const placedByCluster = new Map<string, Node[]>()
    for (const c of independent) {
      const { result: sizing, pad } = sized.get(c.name)!
      const box = outerResult.getNode(placeholderName(c.name))!.bounds
      // `at` is not the bounding box origin, so shift by the offset the
      // sizing pass produced between the two.
      const at = {
        x: box[0] + pad - sizing.bounds[0],
        y: box[1] + pad - sizing.bounds[1],
      }
      const placed = this.subLayout(c, at)
      placedByCluster.set(placeholderName(c.name), placed.nodes)
      nodes.push(...placed.nodes)
      edges.push(...placed.edges)
      const path = this.clusterPath(c.name)
      clusters.push(
        {
          name: c.name,
          label: c.options?.label,
          bounds: [box[0], box[1], box[2], box[3]],
          rect: new Rectangle(box[0], box[1], box[2] - box[0], box[3] - box[1]),
          nodes: placed.nodes,
          parent: path.length > 1 ? path[path.length - 2] : undefined,
          children: this.childClusters(c.name).map((x) => x.name),
          depth: path.length - 1,
        },
        // Clusters nested inside sit below it, so their depths shift by
        // however deep this cluster itself is.
        ...placed.clusters.map((sub) => ({
          ...sub,
          parent: sub.parent ?? c.name,
          depth: sub.depth + path.length,
        })),
      )
    }

    // A cluster that merely contained a collapsed one lists the
    // placeholder among its nodes; swap in what the placeholder stood for.
    for (const c of clusters) {
      if (!c.nodes.some((n) => isPlaceholder(n.name))) continue
      c.nodes = c.nodes.flatMap((n) =>
        isPlaceholder(n.name) ? (placedByCluster.get(n.name!) ?? []) : [n],
      )
    }

    return this.assembleSubLayouts(
      outerResult,
      nodes,
      edges,
      clusters,
      swallowed,
      placedByCluster,
    )
  }

  /**
   * Whether an edge the parent routed to a placeholder has to be rebuilt
   * against the real endpoints.
   *
   * Normally yes — the parent only ever saw the box. But an edge that
   * *named* the cluster is meant to stop at the box, and the parent's
   * edge already ends on the placeholder's boundary, which is the box.
   * Rebuilding it would drag it in to a member node instead.
   */
  private needsRebuild(e: InternalEdge, swallowed: Map<string, string>): boolean {
    const fromOwner = swallowed.get(e.origFrom!.name)
    const toOwner = swallowed.get(e.origTo!.name)
    // Both outside, or both inside the same collapsed cluster: the edge
    // is not the parent's business at all — the sub-layout drew it.
    if (fromOwner === toOwner) return false

    for (const [owner, declared] of [
      [fromOwner, e.fromCluster],
      [toOwner, e.toCluster],
    ] as const) {
      if (owner === undefined) continue // this end is outside
      if (owner === declared) continue // the caller asked for the box
      return true
    }
    return false
  }

  /** Build one independently-growing cluster as a graph of its own. */
  private subLayout(spec: LayeredClusterSpec, at: PointLike): LayeredResult {
    const inside = new Set(this.clusterNodes(spec.name))
    const sub = new LayeredBuilderImpl({
      ...this._options,
      at,
      grow: spec.options!.grow!,
    })
    for (const name of inside) sub.node(name, this._vertices.get(name)!.resolvedOptions)
    for (const e of this._edges) {
      if (inside.has(e.origFrom!.name) && inside.has(e.origTo!.name)) {
        sub.edge(e.origFrom!.name, e.origTo!.name, {
          minLength: e.minLength,
          weight: e.weight,
        })
      }
    }
    for (const self of this._selfEdges) {
      if (inside.has(self.vertex.name)) {
        sub.edge(self.vertex.name, self.vertex.name, { loop: self.loop })
      }
    }
    // Clusters strictly inside this one come along, in declaration order
    // so a nested one is still declared before its parent.
    for (const c of this._clusters) {
      const path = this.clusterPath(c.name)
      if (c.name !== spec.name && path.includes(spec.name)) {
        sub.cluster(c.name, c.members, c.options)
      }
    }
    return sub.build()
  }

  /**
   * Stitch the sub-layouts into the parent's result: edges that cross a
   * boundary were routed to the placeholder, so re-point them at the
   * real node they name.
   */
  private assembleSubLayouts(
    outerResult: LayeredResult,
    nodes: Node[],
    edges: Edge[],
    clusters: LayeredCluster[],
    swallowed: Map<string, string>,
    placedByCluster: Map<string, Node[]>,
  ): LayeredResult {
    const byName = new Map<string, Node>()
    for (const n of nodes) if (n.name) byName.set(n.name, n)

    const crossing: Edge[] = []
    for (const e of this._edges) {
      if (!this.needsRebuild(e, swallowed)) continue
      const a = byName.get(e.origFrom!.name)
      const b = byName.get(e.origTo!.name)
      if (a && b) crossing.push(edge(a, b, this._options.edgeOptions))
    }

    // Levels describe the OUTER graph: a cluster with its own growth
    // direction has ranks of its own that do not map onto its parent's,
    // so from here it is one rank, and its nodes are reported on the
    // rank its placeholder occupied.
    const levelNodes = new Map<number, Node[]>()
    for (let i = 0; i < outerResult.levelCount; i++) {
      levelNodes.set(
        i,
        outerResult
          .level(i)
          .flatMap((n) =>
            isPlaceholder(n.name) ? (placedByCluster.get(n.name!) ?? []) : [n],
          ),
      )
    }
    const nodesByName = new Map<string, Node>()
    for (const n of nodes) if (n.name) nodesByName.set(n.name, n)
    const clustersByName = new Map(clusters.map((c) => [c.name, c]))

    const all = [...edges, ...crossing]
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.bounds[0])
      minY = Math.min(minY, n.bounds[1])
      maxX = Math.max(maxX, n.bounds[2])
      maxY = Math.max(maxY, n.bounds[3])
    }
    for (const c of clusters) {
      minX = Math.min(minX, c.bounds[0])
      minY = Math.min(minY, c.bounds[1])
      maxX = Math.max(maxX, c.bounds[2])
      maxY = Math.max(maxY, c.bounds[3])
    }

    return {
      nodes,
      clusters,
      getCluster: (name) => clustersByName.get(name),
      edges: all,
      levelCount: outerResult.levelCount,
      level: (i) => levelNodes.get(i) ?? [],
      getNode: (name) => nodesByName.get(name),
      incoming: (node: Node): Node[] => {
        const out: Node[] = []
        for (const e of this._edges) {
          if (e.origTo!.name === node.name) {
            const n = nodesByName.get(e.origFrom!.name)
            if (n) out.push(n)
          }
        }
        return out
      },
      outgoing: (node: Node): Node[] => {
        const out: Node[] = []
        for (const e of this._edges) {
          if (e.origFrom!.name === node.name) {
            const n = nodesByName.get(e.origTo!.name)
            if (n) out.push(n)
          }
        }
        return out
      },
      bounds: [minX, minY, maxX, maxY],
      toRenderables: () => [...nodes, ...all],
    }
  }

  private buildFlat(): LayeredResult {
    this._dummies = []
    this._dummyCounter = 0
    this._unitEdges = []
    const selfEdges = this._selfEdges
    const declaredEdges = this._edges

    if (this._vertices.size === 0) {
      return this.emptyResult()
    }

    this.measure()
    this.removeCycles()
    this.rebuildDirection()
    networkSimplexRanks(Array.from(this._vertices.values()), this._edges)
    this.insertDummies()
    this.tagClusterMembers()
    this.buildRankArrays()
    this.insertClusterBorders()
    minimizeCrossings(this.rankList())
    this.assignSecondary()
    const columns = this.assignPrimary()

    // Build real nodes in insertion order.
    const nodes: Node[] = []
    const vertexToNode = new Map<InternalVertex, Node>()
    const nodeToVertex = new Map<Node, InternalVertex>()
    const nodesByName = new Map<string, Node>()

    for (const v of this._vertices.values()) {
      const node = new Node({
        ...v.resolvedOptions!,
        at: axesToPoint(columns.get(v.rank)!, v.secondary, this._options.grow!),
      })
      v.node = node
      nodes.push(node)
      vertexToNode.set(v, node)
      nodeToVertex.set(node, v)
      if (node.name) nodesByName.set(node.name, node)
    }

    // Clusters come first: an edge naming one stops at its box, so the
    // boxes have to exist before the edges are built.
    const clusters = this.buildClusters(nodesByName, columns)
    const clustersByName = new Map(clusters.map((c) => [c.name, c]))

    // Build edges; collapse dummies into bend points.
    const edges: Edge[] = []
    if (this._options.drawEdges) {
      for (const e of this._edges) {
        let bendPoints: PointLike[] | undefined
        if (e.dummies && e.dummies.length > 0) {
          const pts = e.dummies.map((d) =>
            axesToPoint(columns.get(d.rank)!, d.secondary, this._options.grow!),
          )
          // Dummies were laid out in effective direction; for reversed
          // edges the effective direction is origTo → origFrom, so flip
          // them back for the original from → to rendering.
          bendPoints = e.reversed ? pts.reverse() : pts
        }
        // A cluster endpoint draws to the box, not to the member the
        // layout ranked against. Rectangle is Anchorable, so the edge's
        // usual boundary resolution does the clipping for free.
        const fromEnd =
          (e.fromCluster ? clustersByName.get(e.fromCluster)?.rect : undefined) ??
          vertexToNode.get(e.origFrom!)!
        const toEnd =
          (e.toCluster ? clustersByName.get(e.toCluster)?.rect : undefined) ??
          vertexToNode.get(e.origTo!)!
        const edgeObj = edge(fromEnd, toEnd, {
          ...this._options.edgeOptions,
          ...(bendPoints ? { bendPoints } : {}),
        })
        e.edge = edgeObj
        edges.push(edgeObj)
      }

      // Self-edges rejoin here, as loops on the side that does not run
      // into the neighbouring ranks.
      const defaultLoop: LoopDirection =
        this._options.grow === 'down' || this._options.grow === 'up'
          ? 'right'
          : 'above'
      for (const self of selfEdges) {
        const n = vertexToNode.get(self.vertex)!
        edges.push(
          edge(n, n, { ...this._options.edgeOptions, loop: self.loop ?? defaultLoop }),
        )
      }
    }

    const levelNodes = new Map<number, Node[]>()
    for (const [rank, vertices] of this._ranks) {
      levelNodes.set(
        rank,
        vertices.filter((v) => v.kind === 'node').map((v) => v.node!),
      )
    }

    const bounds = this.computeBounds(nodes, clusters)

    return {
      nodes,
      clusters,
      getCluster(name: string): LayeredCluster | undefined {
        return clustersByName.get(name)
      },
      edges,
      levelCount: this._maxRank + 1,
      level(index: number): Node[] {
        return levelNodes.get(index) ?? []
      },
      getNode(name: string): Node | undefined {
        return nodesByName.get(name)
      },
      incoming(node: Node): Node[] {
        const v = nodeToVertex.get(node)
        if (!v) return []
        const result: Node[] = []
        for (const e of declaredEdges) {
          if (e.origTo === v) result.push(e.origFrom!.node!)
        }
        // A self-edge makes the node its own predecessor. Callers that
        // walk these lists must guard against the cycle.
        for (const self of selfEdges) if (self.vertex === v) result.push(node)
        return result
      },
      outgoing(node: Node): Node[] {
        const v = nodeToVertex.get(node)
        if (!v) return []
        const result: Node[] = []
        for (const e of declaredEdges) {
          if (e.origFrom === v) result.push(e.origTo!.node!)
        }
        for (const self of selfEdges) if (self.vertex === v) result.push(node)
        return result
      },
      bounds,
      toRenderables(): (Node | Edge)[] {
        return [...nodes, ...edges]
      },
    }
  }

  private emptyResult(): LayeredResult {
    return {
      nodes: [],
      clusters: [],
      getCluster: () => undefined,
      edges: [],
      levelCount: 0,
      level: () => [],
      getNode: () => undefined,
      incoming: () => [],
      outgoing: () => [],
      bounds: [0, 0, 0, 0],
      toRenderables: () => [],
    }
  }

  private measure(): void {
    for (const v of this._vertices.values()) {
      const temp = new Node({ ...v.resolvedOptions!, at: { x: 0, y: 0 } })
      v.primaryHalf = primaryExtent(temp, this._options.grow!) / 2
      v.secondaryHalf = perpendicularExtent(temp, this._options.grow!) / 2
    }
  }

  /**
   * Gansner et al. 1993 DFS cycle removal: reverse back-edges so the
   * graph becomes acyclic. The original direction is preserved on
   * `origFrom`/`origTo` and restored at render time.
   */
  private removeCycles(): void {
    const WHITE = 0
    const GRAY = 1
    const BLACK = 2
    const color = new Map<InternalVertex, number>()
    for (const v of this._vertices.values()) color.set(v, WHITE)

    const visit = (v: InternalVertex): void => {
      color.set(v, GRAY)
      for (const e of v.outEdges) {
        const w = e.to
        if (color.get(w) === WHITE) {
          visit(w)
        } else if (color.get(w) === GRAY) {
          // Back edge to an ancestor: reverse it.
          e.reversed = true
        }
      }
      color.set(v, BLACK)
    }

    for (const v of this._vertices.values()) {
      if (color.get(v) === WHITE) visit(v)
    }
  }

  /**
   * Rebuild in/out adjacency from the effective (post-cycle-removal)
   * direction. After this, `edge.from`/`edge.to` are the effective
   * endpoints; `origFrom`/`origTo` retain the user's direction.
   */
  private rebuildDirection(): void {
    for (const v of this._vertices.values()) {
      v.inEdges = []
      v.outEdges = []
    }
    for (const e of this._edges) {
      const effFrom = e.reversed ? e.origTo! : e.origFrom!
      const effTo = e.reversed ? e.origFrom! : e.origTo!
      e.from = effFrom
      e.to = effTo
      effFrom.outEdges.push(e)
      effTo.inEdges.push(e)
    }
  }

  /**
   * Split edges spanning more than one rank into dummy-node chains, so
   * every edge connects adjacent ranks and routing bends through them.
   */
  private insertDummies(): void {
    for (const e of this._edges) {
      const dist = e.to.rank - e.from.rank
      if (dist <= 1) {
        this._unitEdges.push(e)
        continue
      }

      // Unwire the original edge.
      e.from.outEdges = e.from.outEdges.filter((x) => x !== e)
      e.to.inEdges = e.to.inEdges.filter((x) => x !== e)

      const dummies: InternalVertex[] = []
      let prev = e.from
      for (let i = 1; i < dist; i++) {
        const dummy: InternalVertex = {
          name: `__dummy__${this._dummyCounter++}`,
          kind: 'dummy',
          rank: e.from.rank + i,
          secondary: 0,
          primaryHalf: 0,
          secondaryHalf: 0,
          inEdges: [],
          outEdges: [],
        }
        dummies.push(dummy)
        this._dummies.push(dummy)

        const sub: InternalEdge = { from: prev, to: dummy, minLength: 1, weight: e.weight }
        prev.outEdges.push(sub)
        dummy.inEdges.push(sub)
        this._unitEdges.push(sub)
        prev = dummy
      }

      const lastSub: InternalEdge = { from: prev, to: e.to, minLength: 1, weight: e.weight }
      prev.outEdges.push(lastSub)
      e.to.inEdges.push(lastSub)
      this._unitEdges.push(lastSub)

      e.dummies = dummies
    }
  }

  /**
   * Mark each cluster's members (and the dummies of edges that stay
   * inside it) so `minimizeCrossings` keeps them contiguous.
   *
   * A dummy on an edge between two members belongs to the cluster: if it
   * were free to wander, an intra-cluster edge could route outside its
   * own box.
   */
  private tagClusterMembers(): void {
    if (this._clusters.length === 0) return

    for (const spec of this._clusters) {
      const path = this.clusterPath(spec.name)
      for (const name of spec.members) {
        // Nested clusters carry their own (longer) path; only nodes are
        // tagged with their direct parent's.
        if (this._vertices.has(name)) this._vertices.get(name)!.group = path
      }
    }

    // A dummy on an edge that stays inside a cluster belongs to it, or
    // the edge could route outside its own box. For an edge between two
    // different clusters the dummies take the deepest common ancestor —
    // the innermost box both endpoints are inside.
    for (const e of this._edges) {
      if (!e.dummies || e.dummies.length === 0) continue
      const shared = commonPrefix(e.origFrom!.group, e.origTo!.group)
      if (shared.length > 0) for (const d of e.dummies) d.group = shared
    }
  }

  /**
   * Give every cluster a left and a right border vertex on each rank it
   * spans, chained rank to rank.
   *
   * The borders are what turn "contiguous members" into a drawable box.
   * Pinning them to the ends of their group means ordering places them
   * outside every member; chaining consecutive ranks with weighted edges
   * makes the coordinate pass straighten each chain into a line (the
   * same dummy-straightening that keeps long edges straight), so the two
   * lines *are* the box sides. Ranks the cluster spans but has no member
   * on still get borders, so nothing foreign drifts into the box there.
   */
  private insertClusterBorders(): void {
    this._borders = new Map()
    if (this._clusters.length === 0) return

    const padding = this._options.clusterPadding!

    for (const spec of this._clusters) {
      const memberNodes = this.clusterNodes(spec.name)
      if (memberNodes.length === 0) continue
      const ranksUsed = memberNodes.map((m) => this._vertices.get(m)!.rank)
      const minRank = Math.min(...ranksUsed)
      const maxRank = Math.max(...ranksUsed)
      const gap = spec.options?.padding ?? padding
      const borderPath = this.clusterPath(spec.name)

      const left: InternalVertex[] = []
      const right: InternalVertex[] = []

      for (let r = minRank; r <= maxRank; r++) {
        for (const side of ['left', 'right'] as const) {
          const v: InternalVertex = {
            name: `__border__${spec.name}__${side}__${r}`,
            kind: 'dummy',
            rank: r,
            secondary: 0,
            primaryHalf: 0,
            secondaryHalf: 0,
            inEdges: [],
            outEdges: [],
            group: borderPath,
            groupPin: side === 'left' ? -1 : 1,
            gap,
            border: { cluster: spec.name, side },
          }
          ;(side === 'left' ? left : right).push(v)
          this._ranks.get(r)!.push(v)
          this._dummies.push(v)
        }
      }

      // Chain each side so the coordinate pass pulls it straight.
      for (const chain of [left, right]) {
        for (let i = 0; i + 1 < chain.length; i++) {
          const e: InternalEdge = {
            from: chain[i]!,
            to: chain[i + 1]!,
            minLength: 1,
            weight: BORDER_CHAIN_WEIGHT,
          }
          chain[i]!.outEdges.push(e)
          chain[i + 1]!.inEdges.push(e)
          this._unitEdges.push(e)
        }
      }

      this._borders.set(spec.name, { left, right })
    }
  }

  /**
   * Boxes for every cluster, from the straightened border chains.
   * The primary axis comes from the member nodes themselves — the
   * borders are zero-height, so they say nothing about it.
   */
  private buildClusters(
    nodesByName: Map<string, Node>,
    columns: Map<number, number>,
  ): LayeredCluster[] {
    const grow = this._options.grow!
    const byName = new Map<string, LayeredCluster>()

    // Innermost first, so a parent can absorb boxes its children already
    // produced and be guaranteed to enclose them.
    const ordered = [...this._clusters].sort(
      (a, b) => this.clusterPath(b.name).length - this.clusterPath(a.name).length,
    )

    for (const spec of ordered) {
      const border = this._borders.get(spec.name)
      const memberNames = this.clusterNodes(spec.name)
      const members = memberNames.map((m) => nodesByName.get(m)!).filter(Boolean)
      if (!border || members.length === 0) continue

      const gap = spec.options?.padding ?? this._options.clusterPadding!

      // Cross axis: the two border lines, which already sit `gap` clear
      // of the outermost contents.
      let lo = Infinity
      let hi = -Infinity
      for (const v of border.left) lo = Math.min(lo, v.secondary)
      for (const v of border.right) hi = Math.max(hi, v.secondary)

      // Growth axis: the contents' own extent, padded — the borders are
      // zero-height, so they say nothing about it.
      let near = Infinity
      let far = -Infinity
      for (const m of memberNames) {
        const v = this._vertices.get(m)!
        const centre = columns.get(v.rank)!
        near = Math.min(near, centre - v.primaryHalf - gap)
        far = Math.max(far, centre + v.primaryHalf + gap)
      }

      const a = axesToPoint(near, lo, grow)
      const b = axesToPoint(far, hi, grow)
      const bounds: [number, number, number, number] = [
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.max(a.x, b.x),
        Math.max(a.y, b.y),
      ]

      // Ordering and separation already keep a child's borders inside
      // this one's, but a child with a larger `padding` could still poke
      // out on the growth axis. Absorbing the child boxes makes nesting
      // hold whatever the paddings are.
      for (const child of this.childClusters(spec.name)) {
        const box = byName.get(child.name)
        if (!box) continue
        bounds[0] = Math.min(bounds[0], box.bounds[0] - gap)
        bounds[1] = Math.min(bounds[1], box.bounds[1] - gap)
        bounds[2] = Math.max(bounds[2], box.bounds[2] + gap)
        bounds[3] = Math.max(bounds[3], box.bounds[3] + gap)
      }

      const path = this.clusterPath(spec.name)
      byName.set(spec.name, {
        name: spec.name,
        label: spec.options?.label,
        bounds,
        rect: new Rectangle(bounds[0], bounds[1], bounds[2] - bounds[0], bounds[3] - bounds[1]),
        nodes: members,
        parent: path.length > 1 ? path[path.length - 2] : undefined,
        children: this.childClusters(spec.name).map((c) => c.name),
        depth: path.length - 1,
      })
    }

    // Back to declaration order for a stable, predictable result.
    return this._clusters
      .map((c) => byName.get(c.name))
      .filter((c): c is LayeredCluster => c !== undefined)
  }

  private buildRankArrays(): void {
    this._ranks = new Map()
    this._maxRank = 0
    for (const v of [...this._vertices.values(), ...this._dummies]) {
      if (!this._ranks.has(v.rank)) this._ranks.set(v.rank, [])
      this._ranks.get(v.rank)!.push(v)
      this._maxRank = Math.max(this._maxRank, v.rank)
    }
  }

  /** Ranks 0..maxRank as an ordered array of vertex arrays. */
  private rankList(): InternalVertex[][] {
    const list: InternalVertex[][] = []
    for (let r = 0; r <= this._maxRank; r++) {
      list.push(this._ranks.get(r) ?? [])
    }
    return list
  }

  /**
   * Secondary-axis coordinate assignment. Dispatches to the configured
   * algorithm, then applies the normalization both share: the minimum
   * near-edge box coordinate lands on the secondary component of `at`.
   */
  private assignSecondary(): void {
    const vertices = [...this._vertices.values(), ...this._dummies]
    const grow = this._options.grow!

    if (this._options.coordinates === 'brandes-koepf') {
      assignCoordinatesBK(this.rankList(), this._options.nodeSep!)
    } else {
      this.assignSecondaryGansner(vertices)
    }

    let min = Infinity
    for (const v of vertices) {
      min = Math.min(min, v.secondary - v.secondaryHalf)
    }
    const shift = secondaryOf(this._options.at!, grow) - min
    for (const v of vertices) {
      v.secondary += shift
    }
  }

  /**
   * Gansner et al. 1993 §5 (TikZ `NodePositioningGansnerKNV1993`): build
   * an auxiliary graph — one vertex per node/dummy, one "edge node" per
   * unit edge, plus weight-0 separator edges between rank neighbors —
   * and run the network simplex with `balanceLeftRight` for balanced,
   * symmetric coordinates. Multi-rank dummy chains get pulled straight
   * by the omega weights (8/2/1).
   */
  private assignSecondaryGansner(vertices: InternalVertex[]): void {
    const auxOf = new Map<InternalVertex, SimplexVertex>()
    const auxVertices: SimplexVertex[] = []
    for (const v of vertices) {
      const av: SimplexVertex = { rank: 0 }
      auxOf.set(v, av)
      auxVertices.push(av)
    }

    const auxEdges: SimplexEdge[] = []

    // Edge-node edges: the edge node is pulled toward both endpoints
    // with weight = edge weight × omega.
    for (const e of this._unitEdges) {
      const en: SimplexVertex = { rank: 0 }
      auxVertices.push(en)
      const w = e.weight * omega(e)
      auxEdges.push({ from: en, to: auxOf.get(e.from)!, minLength: 0, weight: w })
      auxEdges.push({ from: en, to: auxOf.get(e.to)!, minLength: 0, weight: w })
    }

    // Separator edges between rank neighbors: edge-to-edge gap (Phase A
    // semantics), weight 0.
    const nodeSep = this._options.nodeSep!
    for (const rank of this.rankList()) {
      for (let i = 0; i + 1 < rank.length; i++) {
        const v = rank[i]!
        const w = rank[i + 1]!
        auxEdges.push({
          from: auxOf.get(v)!,
          to: auxOf.get(w)!,
          minLength: v.secondaryHalf + gapBetween(v, w, nodeSep) + w.secondaryHalf,
          weight: 0,
        })
      }
    }

    // Zero-weight virtual root (minLength 0) so disconnected auxiliary
    // graphs still form one component for the simplex.
    const root: SimplexVertex = { rank: 0 }
    const rootEdges: SimplexEdge[] = auxVertices.map((v) => ({
      from: root,
      to: v,
      minLength: 0,
      weight: 0,
    }))

    const simplex = new NetworkSimplex([root, ...auxVertices], [...rootEdges, ...auxEdges])
    simplex.run()
    simplex.balanceLeftRight()

    for (const v of vertices) {
      v.secondary = auxOf.get(v)!.rank
    }
  }

  private assignPrimary(): Map<number, number> {
    const maxHalf = new Map<number, number>()
    for (const [rank, vertices] of this._ranks) {
      let m = 0
      for (const v of vertices) m = Math.max(m, v.primaryHalf)
      maxHalf.set(rank, m)
    }

    const columns = new Map<number, number>()
    const sign = primarySign(this._options.grow!)
    const gap = this._options.rankSep!
    const start = primaryOf(point(this._options.at!.x, this._options.at!.y), this._options.grow!)
    columns.set(0, start)

    for (let r = 0; r < this._maxRank; r++) {
      const prev = columns.get(r)!
      const advance = (maxHalf.get(r) ?? 0) + gap + (maxHalf.get(r + 1) ?? 0)
      columns.set(r + 1, prev + sign * advance)
    }

    return columns
  }

  private computeBounds(
    nodes: Node[],
    clusters: LayeredCluster[],
  ): [number, number, number, number] {
    if (nodes.length === 0) return [0, 0, 0, 0]

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    const grow = (b: readonly [number, number, number, number]) => {
      minX = Math.min(minX, b[0])
      minY = Math.min(minY, b[1])
      maxX = Math.max(maxX, b[2])
      maxY = Math.max(maxY, b[3])
    }

    for (const node of nodes) grow(node.bounds)
    // Boxes stand outside their members, so they set the bounds.
    for (const c of clusters) grow(c.bounds)

    return [minX, minY, maxX, maxY]
  }
}

/** TikZ `getOmega`: dummy-heavy edges pull harder on their endpoints,
 * which straightens multi-rank dummy chains. */
function omega(e: InternalEdge): number {
  const fromDummy = e.from.kind === 'dummy'
  const toDummy = e.to.kind === 'dummy'
  if (fromDummy && toDummy) return 8
  if (fromDummy || toDummy) return 2
  return 1
}

/**
 * Create a layered (Sugiyama) layout builder for directed graphs / DAGs.
 *
 * Unlike `tree()`, a node may have any number of parents — edges are
 * declared by name. The full Sugiyama pipeline: DFS cycle removal,
 * network-simplex rank assignment (Gansner et al. 1993 + TikZ balance),
 * dummy nodes for multi-rank edges, weighted-median + transpose crossing
 * minimization, and network-simplex secondary-axis coordinate assignment
 * (auxiliary graph + left/right balance) for balanced, symmetric
 * drawings with straight long-edge routing.
 *
 * @example
 * ```typescript
 * const t = layered({ at: point(40, 40), grow: 'right' })
 *   .node('A', { shape: 'circle', width: 36, height: 36 })
 *   .node('B', { shape: 'circle', width: 36, height: 36 })
 *   .node('D', { shape: 'circle', width: 36, height: 36 })
 *   .edge('A', 'D')
 *   .edge('B', 'D')   // D has two parents
 *   .build()
 * ```
 */
export function layered(options?: LayeredOptions): LayeredBuilder {
  return new LayeredBuilderImpl(options)
}
