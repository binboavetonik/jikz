/**
 * Graph layout — force-directed and circular engines for ARBITRARY
 * graphs, plus a unified declarative builder. This is the analogue of
 * TikZ's `graphdrawing` library: declare nodes and edges once, then pick
 * an engine that makes no structural assumptions (cycles, undirected
 * graphs, disconnected components all work).
 *
 * The existing engines each assume a structure — `chain` (linear),
 * `matrix` (grid), `tree` (hierarchy), `layered` (DAG). `graph()` fills
 * the gap for the general case:
 *
 * ```ts
 * const g = graph()
 *   .node('a').node('b').node('c').node('d')
 *   .edge('a', 'b').edge('b', 'c').edge('c', 'd').edge('d', 'a') // a cycle
 *   .force({ seed: 7 })
 * const { nodes, edges } = g.build()
 * ```
 *
 *   - `force()` — Fruchterman–Reingold spring embedder: repulsion between
 *     all node pairs, attraction along edges, cooling temperature, seeded
 *     for reproducible layouts.
 *   - `circular()` — nodes on a ring; radius sized from the node count,
 *     order `'given'` (insertion) or `'degree'`.
 *
 * The result shape mirrors {@link LayeredResult}: `{ nodes, edges,
 * getNode, toRenderables, bounds }`.
 */
import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions } from '../node/Edge'

/** A node declaration: a name plus node options (without `at`). */
export interface GraphNodeSpec {
  name: string
  options?: Omit<NodeOptions, 'at'>
}

/** An edge between two declared node names. */
export interface GraphEdgeSpec {
  from: string
  to: string
  options?: EdgeOptions
}

/** Options for the force-directed engine. */
export interface ForceOptions {
  /** Viewport width in px (default 400). */
  width?: number
  /** Viewport height in px (default 300). */
  height?: number
  /** Number of iterations (default 200). */
  iterations?: number
  /** Random seed for reproducible layouts (default 1). */
  seed?: number
  /** Repulsion strength multiplier (default 1). */
  repulsion?: number
  /** Attraction strength multiplier (default 1). */
  attraction?: number
  /** Nominal node radius used for overlap avoidance (default 20). */
  nodeRadius?: number
}

/** Options for the circular engine. */
export interface CircularOptions {
  /** Ring center (default { x: 0, y: 0 }). */
  center?: PointLike
  /** Fixed ring radius; computed from node count when omitted. */
  radius?: number
  /** Start angle in degrees, 0 = east (default 0). */
  startAngle?: number
  /** Node order: `'given'` (insertion) or `'degree'` (most connected first). */
  order?: 'given' | 'degree'
}

/** Result of a graph layout — mirrors {@link LayeredResult}. */
export interface GraphResult {
  /** All nodes, in insertion order, positioned by the chosen engine. */
  nodes: Node[]
  /** All edges (self-edges render as loops). */
  edges: Edge[]
  /** Get a node by name. */
  getNode(name: string): Node | undefined
  /** Nodes + edges for rendering. */
  toRenderables(): (Node | Edge)[]
  /** Bounding box [minX, minY, maxX, maxY]. */
  bounds: [number, number, number, number]
}

/** Builder for {@link graph}. */
export interface GraphBuilder {
  node(name: string, options?: Omit<NodeOptions, 'at'>): GraphBuilder
  edge(from: string, to: string, options?: EdgeOptions): GraphBuilder
  /** Select the force-directed engine. */
  force(options?: ForceOptions): GraphBuilder
  /** Select the circular engine. */
  circular(options?: CircularOptions): GraphBuilder
  build(): GraphResult
}

/** Deterministic PRNG (mulberry32) for reproducible force layouts. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fruchterman–Reingold positions, seeded and deterministic. */
function forcePositions(
  nodes: ReadonlyMap<string, GraphNodeSpec>,
  edges: readonly GraphEdgeSpec[],
  options: ForceOptions
): Map<string, Point> {
  const names = Array.from(nodes.keys())
  const n = names.length
  const width = options.width ?? 400
  const height = options.height ?? 300
  const iterations = options.iterations ?? 200
  const repulsion = options.repulsion ?? 1
  const attraction = options.attraction ?? 1
  const radius = options.nodeRadius ?? 20
  const rng = mulberry32(options.seed ?? 1)

  const pos = new Map<string, Point>()
  const cx = width / 2
  const cy = height / 2
  const initR = Math.max(1, Math.min(width, height) / 3)

  // Initialize on a ring with a little deterministic jitter.
  names.forEach((name, i) => {
    const angle = (i / Math.max(1, n)) * Math.PI * 2
    pos.set(
      name,
      point(
        cx + initR * Math.cos(angle) + (rng() - 0.5) * 10,
        cy + initR * Math.sin(angle) + (rng() - 0.5) * 10
      )
    )
  })
  if (n <= 1) {
    pos.set(names[0] ?? '', point(cx, cy))
    return pos
  }

  const ideal = Math.sqrt((width * height) / n) // Fruchterman–Reingold k
  const t0 = Math.min(width, height) / 10

  for (let iter = 0; iter < iterations; iter++) {
    const dx = new Array<number>(n).fill(0)
    const dy = new Array<number>(n).fill(0)

    // Repulsion: every pair pushes apart.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pa = pos.get(names[i]!)!
        const pb = pos.get(names[j]!)!
        const vx = pa.x - pb.x
        const vy = pa.y - pb.y
        let d = Math.hypot(vx, vy)
        d = Math.max(d, radius * 2, 1e-3)
        const f = (repulsion * ideal * ideal) / d
        const fx = (vx / d) * f
        const fy = (vy / d) * f
        dx[i]! += fx
        dy[i]! += fy
        dx[j]! -= fx
        dy[j]! -= fy
      }
    }

    // Attraction: edges pull endpoints together (self-edges ignored).
    for (const e of edges) {
      if (e.from === e.to) continue
      const i = names.indexOf(e.from)
      const j = names.indexOf(e.to)
      if (i < 0 || j < 0) continue
      const pa = pos.get(names[i]!)!
      const pb = pos.get(names[j]!)!
      const vx = pa.x - pb.x
      const vy = pa.y - pb.y
      const d = Math.max(Math.hypot(vx, vy), 1e-3)
      const f = (attraction * d * d) / ideal
      const fx = (vx / d) * f
      const fy = (vy / d) * f
      dx[i]! -= fx
      dy[i]! -= fy
      dx[j]! += fx
      dy[j]! += fy
    }

    // Apply displacements, capped by the cooling temperature.
    const temp = t0 * (1 - iter / iterations)
    for (let i = 0; i < n; i++) {
      const name = names[i]!
      const p = pos.get(name)!
      let vx = dx[i]!
      let vy = dy[i]!
      const mag = Math.hypot(vx, vy)
      if (mag > temp && mag > 0) {
        vx = (vx / mag) * temp
        vy = (vy / mag) * temp
      }
      pos.set(
        name,
        point(
          clamp(p.x + vx, radius, width - radius),
          clamp(p.y + vy, radius, height - radius)
        )
      )
    }
  }

  return pos
}

/** Place nodes on a ring, sized from the node count. */
function circularPositions(
  nodes: ReadonlyMap<string, GraphNodeSpec>,
  edges: readonly GraphEdgeSpec[],
  options: CircularOptions
): Map<string, Point> {
  const names = Array.from(nodes.keys())
  const n = names.length
  const center = point(options.center?.x ?? 0, options.center?.y ?? 0)
  const start = ((options.startAngle ?? 0) * Math.PI) / 180

  let ordered = names
  if (options.order === 'degree') {
    const deg = new Map<string, number>()
    for (const e of edges) {
      if (e.from !== e.to) {
        deg.set(e.from, (deg.get(e.from) ?? 0) + 1)
        deg.set(e.to, (deg.get(e.to) ?? 0) + 1)
      }
    }
    ordered = [...names].sort((a, b) => (deg.get(b) ?? 0) - (deg.get(a) ?? 0))
  }

  const radius =
    options.radius ??
    (n <= 1 ? 0 : 30 / Math.sin(Math.PI / n)) // chord ≥ 60px between neighbours

  const pos = new Map<string, Point>()
  ordered.forEach((name, i) => {
    const angle = start + (i / Math.max(1, n)) * Math.PI * 2
    pos.set(
      name,
      point(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle))
    )
  })
  return pos
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function resolveNodeOptions(
  name: string,
  options: Omit<NodeOptions, 'at'> | undefined
): Omit<NodeOptions, 'at'> {
  return { ...options, name, text: options?.text ?? name }
}

class GraphBuilderImpl implements GraphBuilder {
  private _nodes = new Map<string, GraphNodeSpec>()
  private _edges: GraphEdgeSpec[] = []
  private _mode: 'force' | 'circular' = 'force'
  private _forceOptions: ForceOptions = {}
  private _circularOptions: CircularOptions = {}

  node(name: string, options?: Omit<NodeOptions, 'at'>): GraphBuilder {
    if (this._nodes.has(name)) {
      throw new JikzError('duplicate-name', `graph layout: duplicate node name "${name}"`)
    }
    this._nodes.set(name, { name, options })
    return this
  }

  edge(from: string, to: string, options?: EdgeOptions): GraphBuilder {
    this._edges.push({ from, to, options })
    return this
  }

  force(options?: ForceOptions): GraphBuilder {
    this._mode = 'force'
    this._forceOptions = options ?? {}
    return this
  }

  circular(options?: CircularOptions): GraphBuilder {
    this._mode = 'circular'
    this._circularOptions = options ?? {}
    return this
  }

  build(): GraphResult {
    if (this._nodes.size === 0) {
      return {
        nodes: [],
        edges: [],
        getNode: () => undefined,
        toRenderables: () => [],
        bounds: [0, 0, 0, 0],
      }
    }

    const positions =
      this._mode === 'force'
        ? forcePositions(this._nodes, this._edges, this._forceOptions)
        : circularPositions(this._nodes, this._edges, this._circularOptions)

    const nodes: Node[] = []
    const byName = new Map<string, Node>()
    for (const [name, spec] of this._nodes) {
      const node = new Node({
        ...resolveNodeOptions(name, spec.options),
        at: positions.get(name) ?? point(0, 0),
      })
      nodes.push(node)
      byName.set(name, node)
    }

    const edges = this._edges.map((e) =>
      edge(byName.get(e.from)!, byName.get(e.to)!, e.options)
    )

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const node of nodes) {
      minX = Math.min(minX, node.bounds[0])
      minY = Math.min(minY, node.bounds[1])
      maxX = Math.max(maxX, node.bounds[2])
      maxY = Math.max(maxY, node.bounds[3])
    }
    const bounds: [number, number, number, number] =
      nodes.length > 0 ? [minX, minY, maxX, maxY] : [0, 0, 0, 0]

    return {
      nodes,
      edges,
      getNode: (name) => byName.get(name),
      toRenderables: () => [...nodes, ...edges],
      bounds,
    }
  }
}

/**
 * Start a graph layout — declare nodes and edges, pick an engine, and
 * `build()` into positioned nodes and edges.
 */
export function graph(): GraphBuilder {
  return new GraphBuilderImpl()
}
