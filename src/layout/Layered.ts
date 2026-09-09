import { point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions } from '../node/Edge'
import {
  type LayoutGrowth,
  axesToPoint,
  perpendicularExtent,
  primaryExtent,
  primaryOf,
  primarySign,
  secondaryOf,
} from './shared'
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
   *
   * @example
   * ```typescript
   * layered({ grow: 'down', coordinates: 'brandes-koepf' })
   * ```
   */
  coordinates?: 'gansner' | 'brandes-koepf'
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
}

/**
 * Result of building a layered layout.
 */
export interface LayeredResult {
  /** All real nodes, in insertion order. */
  nodes: Node[]

  /** All edges (multi-rank edges carry bend points). */
  edges: Edge[]

  /** Real nodes at a specific rank (0 = first rank). */
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
  edge(
    from: string,
    to: string,
    options?: { minLength?: number; weight?: number },
  ): LayeredBuilder
  build(): LayeredResult
}

interface InternalVertex {
  name: string
  kind: 'node' | 'dummy'
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
  minLength: number
  weight: number
  edge?: Edge
  /** Dummy vertices inserted along this edge (effective direction). */
  dummies?: InternalVertex[]
}

const DEFAULT_RANK_SEP = 50
const DEFAULT_NODE_SEP = 30

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
      ...options,
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

  edge(
    from: string,
    to: string,
    options?: { minLength?: number; weight?: number },
  ): LayeredBuilder {
    const fromVertex = this._vertices.get(from)
    const toVertex = this._vertices.get(to)
    if (!fromVertex || !toVertex) {
      throw new Error(
        `layered layout: edge references unknown node "${!fromVertex ? from : to}"`,
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
    }
    fromVertex.outEdges.push(internalEdge)
    toVertex.inEdges.push(internalEdge)
    this._edges.push(internalEdge)
    return this
  }

  build(): LayeredResult {
    this._dummies = []
    this._dummyCounter = 0
    this._unitEdges = []
    const declaredEdges = this._edges

    if (this._vertices.size === 0) {
      return this.emptyResult()
    }

    this.measure()
    this.removeCycles()
    this.rebuildDirection()
    networkSimplexRanks(Array.from(this._vertices.values()), this._edges)
    this.insertDummies()
    this.buildRankArrays()
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
        const edgeObj = edge(vertexToNode.get(e.origFrom!)!, vertexToNode.get(e.origTo!)!, {
          ...this._options.edgeOptions,
          ...(bendPoints ? { bendPoints } : {}),
        })
        e.edge = edgeObj
        edges.push(edgeObj)
      }
    }

    const levelNodes = new Map<number, Node[]>()
    for (const [rank, vertices] of this._ranks) {
      levelNodes.set(
        rank,
        vertices.filter((v) => v.kind === 'node').map((v) => v.node!),
      )
    }

    const bounds = this.computeBounds(nodes)

    return {
      nodes,
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
        return result
      },
      outgoing(node: Node): Node[] {
        const v = nodeToVertex.get(node)
        if (!v) return []
        const result: Node[] = []
        for (const e of declaredEdges) {
          if (e.origFrom === v) result.push(e.origTo!.node!)
        }
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
          minLength: v.secondaryHalf + nodeSep + w.secondaryHalf,
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

  private computeBounds(nodes: Node[]): [number, number, number, number] {
    if (nodes.length === 0) return [0, 0, 0, 0]

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const node of nodes) {
      const [x0, y0, x1, y1] = node.bounds
      minX = Math.min(minX, x0)
      minY = Math.min(minY, y0)
      maxX = Math.max(maxX, x1)
      maxY = Math.max(maxY, y1)
    }

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
