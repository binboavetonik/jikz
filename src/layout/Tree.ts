import { point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions } from '../node/Edge'
import {
  type LayoutGrowth,
  axesToPoint,
  contentToNodeOptions,
  measureNode,
  perpendicularExtent,
  primaryExtent,
  primaryOf,
  primarySign,
  secondaryOf,
} from './shared'

/**
 * Direction the tree grows
 */
export type TreeGrowth = LayoutGrowth

/**
 * Options for tree configuration
 */
export interface TreeOptions {
  /**
   * Root position
   */
  at?: PointLike

  /**
   * Growth direction (default: 'down')
   */
  grow?: TreeGrowth

  /**
   * Column policy along the growth axis:
   * - `'parent'` (default): each parent advances its children past its
   *   own measured edge (tidy-tree behavior).
   * - `'rank'`: every depth level shares one column; the inter-level gap
   *   is `levelDistance` between the two levels' widest nodes. Per-node
   *   `sep` is ignored in rank mode.
   */
  align?: 'parent' | 'rank'

  /**
   * Gap along the growth axis between a node's far edge and its
   * children's near edges (default: 50). Node extents are
   * auto-measured, so this is whitespace, not center-to-center
   * distance.
   */
  levelDistance?: number

  /**
   * Gap along the axis perpendicular to growth between sibling subtree
   * bounding boxes (default: 30).
   */
  siblingDistance?: number

  /**
   * Default node options
   */
  nodeOptions?: Omit<NodeOptions, 'at' | 'text'>

  /**
   * Default edge options for parent-child connections
   */
  edgeOptions?: EdgeOptions

  /**
   * Whether to draw edges (default: true)
   */
  drawEdges?: boolean

  /**
   * Depth cap: nodes deeper than `maxDepth` levels (root = 0) are not
   * laid out. Pure display capping — no markers; for drill-in markers
   * see {@link TreeNodeSpec.collapsed}.
   */
  maxDepth?: number
}

/**
 * Tree node specification (recursive)
 */
export interface TreeNodeSpec {
  /**
   * Node content/options
   */
  content: string | Omit<NodeOptions, 'at'>

  /**
   * Child nodes
   */
  children?: TreeNodeSpec[]

  /**
   * Primary-axis gap between this node's far edge and each child's near
   * edge, in px. Overrides `levelDistance` for this node's children.
   * Node extents are auto-measured; `sep` is only the whitespace
   * between them. Use small values for invisible/spacer roots.
   */
  sep?: number

  /**
   * Lay this node out as a leaf, recording how many descendants were
   * withheld. Any `children` on the spec are not laid out. The entry
   * appears in {@link TreeResult.collapsed} so the consumer can render a
   * drill-in marker (e.g. `+3›`) against the laid-out node — size the
   * `content` width to fit the marker so it participates in spacing and
   * contour packing. Expansion state and marker visuals stay app-side.
   */
  collapsed?: number
}

/**
 * Internal tree node with computed properties
 */
interface InternalTreeNode {
  spec: TreeNodeSpec
  node?: Node
  children: InternalTreeNode[]
  parent?: InternalTreeNode
  /** Half the node's extent along the growth axis (edge-to-edge advance). */
  primaryHalf: number
  /** Half the node's extent across the growth axis (drives sibling separation). */
  secondaryHalf: number
  level: number
  /** 0-based position among its siblings. */
  siblingIndex: number

  // ── Contour-layout scratch ─────────────────────────────────────────────
  /** Centre coordinate along the growth axis, NORMALIZED to the growth
   *  direction (multiplied by the direction sign): children always advance
   *  toward +primary, so their shared parent-facing edge is always the
   *  interval's min end and the contour machinery is direction-agnostic.
   *  Convert back with the direction sign when materializing positions. */
  primaryCenter: number
  /** Cross-axis coordinate relative to the parent's centre. */
  rel: number
  /** Absolute cross-axis coordinate, set by the second walk. */
  cross: number
  /** Subtree's left contour: cross-min per primary interval, relative to
   *  this node's cross. */
  left: ContourSeg[]
  /** Subtree's right contour: cross-max per primary interval. */
  right: ContourSeg[]
}

// ─────────────────────────────────────────────────────────────────────────
// Contour packing — tidy trees with variable node sizes, after Atze van der
// Ploeg, "Drawing Non-Layered Tidy Trees in Linear Time" (Comput. J. 2014).
// ─────────────────────────────────────────────────────────────────────────

/**
 * One segment of a subtree contour: over the primary-axis interval
 * [start, end], the subtree's extreme cross-axis coordinate is `cross`
 * (relative to the subtree root's cross). Segments are sorted by `start`
 * and non-overlapping; gaps are primary intervals the subtree doesn't
 * cover (the whitespace between a node's far edge and its children's
 * near edges).
 */
interface ContourSeg {
  start: number
  end: number
  cross: number
}

/**
 * Place every node on the cross axis so sibling subtrees nest as tightly
 * as their *contours* allow, then shift the tree so the root sits at
 * `rootCross`.
 *
 * This replaced the Buchheim–Jünger–Leipert walk. That walk descends the
 * two facing contours in level lockstep and separates each pair on the
 * cross axis only — correct when the primary coordinate is a function of
 * tree depth (uniform nodes, or rank alignment's shared columns), but the
 * default parent alignment places each child right after its own parent's
 * far edge, so with variable node sizes a shallow-but-wide node in one
 * branch can reach past the near edge of a deeper node in a neighbouring
 * branch. The lockstep walk never compares that pair, and the branches
 * overlapped.
 *
 * Here contours are piecewise functions of the *primary* axis: placing a
 * child merge-scans its left contour against the aggregate right contour
 * of the siblings already placed, and only primary intervals that
 * actually overlap demand separation — so a deep descendant is pushed
 * clear of a wide uncle whose primary range it shares, while subtrees
 * whose primary ranges never meet are allowed to interleave freely on
 * the cross axis (which is what keeps the drawing compact).
 *
 * Aesthetic choices, matching the previous engine: children are packed
 * as tight as the contours allow (no even-distribution redistribution),
 * and a parent is centred over its outermost children.
 *
 * Contours are rebuilt per node, so a pathological deep chain costs
 * quadratic segment copies; fine for diagram-sized trees, and typical
 * contours stay within a handful of segments.
 */
function contourLayout(
  root: InternalTreeNode,
  siblingDistance: number,
  rootCross: number
): void {
  layoutContours(root, siblingDistance)
  assignCross(root, rootCross)
}

/** Turn relative cross coordinates into absolute ones. */
function assignCross(v: InternalTreeNode, cross: number): void {
  v.cross = cross
  for (const child of v.children) {
    assignCross(child, cross + child.rel)
  }
}

/**
 * Lay out `v`'s subtree on the cross axis (post-order): children are
 * placed left to right, each as tight against the already-placed
 * siblings' aggregate right contour as `siblingDistance` allows; `v`
 * centres over its outermost children. Afterwards `child.rel` holds each
 * child's cross relative to `v`, and `v.left`/`v.right` hold the
 * subtree's contours relative to `v`'s cross.
 */
function layoutContours(v: InternalTreeNode, dist: number): void {
  const near = v.primaryCenter - v.primaryHalf
  const far = v.primaryCenter + v.primaryHalf

  if (v.children.length === 0) {
    v.left = [{ start: near, end: far, cross: -v.secondaryHalf }]
    v.right = [{ start: near, end: far, cross: v.secondaryHalf }]
    v.rel = 0
    return
  }

  for (const child of v.children) {
    layoutContours(child, dist)
  }

  // Working frame: children accumulate at their final cross relative to
  // an origin that recentres onto v once the outermost children are known.
  let unionLeft: ContourSeg[] = []
  let unionRight: ContourSeg[] = []

  for (const child of v.children) {
    const shift = requiredShift(unionRight, child.left, dist)
    child.rel = shift
    unionLeft = extendUnion(unionLeft, child.left, shift)
    unionRight = replaceUnion(unionRight, child.right, shift)
  }

  const first = v.children[0]!.rel
  const last = v.children[v.children.length - 1]!.rel
  const mid = (first + last) / 2
  for (const child of v.children) {
    child.rel -= mid
  }

  v.left = [
    { start: near, end: far, cross: -v.secondaryHalf },
    ...offsetContours(unionLeft, -mid),
  ]
  v.right = [
    { start: near, end: far, cross: v.secondaryHalf },
    ...offsetContours(unionRight, -mid),
  ]
}

/**
 * The smallest cross-axis position for a newcomer whose left contour is
 * `contour` such that it stays `dist` clear of the aggregate right
 * contour `agg`, considering only primary intervals both actually cover.
 * Merge-scan: both lists are sorted and disjoint, so this is linear in
 * their combined length.
 */
function requiredShift(agg: ContourSeg[], contour: ContourSeg[], dist: number): number {
  let shift = 0
  let i = 0
  let j = 0
  while (i < agg.length && j < contour.length) {
    const r = agg[i]!
    const l = contour[j]!
    if (r.end <= l.start) { i++; continue }
    if (l.end <= r.start) { j++; continue }
    shift = Math.max(shift, r.cross + dist - l.cross)
    if (r.end < l.end) i++
    else if (l.end < r.end) j++
    else { i++; j++ }
  }
  return shift
}

/**
 * Extend the running LEFT contour (the cross-min per primary interval)
 * with a newly placed child's left contour at cross offset `off`.
 * Children are placed in increasing cross order, so over primary already
 * covered the minimum stays with an earlier sibling; the new child only
 * wins past everything placed so far.
 */
function extendUnion(union: ContourSeg[], contour: ContourSeg[], off: number): ContourSeg[] {
  const base = union.length ? union[union.length - 1]!.end : -Infinity
  const out = union.slice()
  for (const seg of contour) {
    if (seg.end <= base) continue
    out.push({ start: Math.max(seg.start, base), end: seg.end, cross: seg.cross + off })
  }
  return out
}

/**
 * Extend the running RIGHT contour (the cross-max per primary interval)
 * with a newly placed child's right contour at cross offset `off`.
 * Children are placed in increasing cross order, so the new child wins
 * over every primary interval it covers; earlier siblings only survive
 * past its far edge.
 */
function replaceUnion(union: ContourSeg[], contour: ContourSeg[], off: number): ContourSeg[] {
  const maxEnd = contour[contour.length - 1]!.end
  const out = contour.map((seg) => ({ ...seg, cross: seg.cross + off }))
  for (const seg of union) {
    if (seg.end <= maxEnd) continue
    out.push({ start: Math.max(seg.start, maxEnd), end: seg.end, cross: seg.cross })
  }
  return out
}

/** Shift a contour's cross values into a new frame. */
function offsetContours(contour: ContourSeg[], off: number): ContourSeg[] {
  return contour.map((seg) => ({ ...seg, cross: seg.cross + off }))
}

/**
 * Result of building a tree
 */
export interface TreeResult {
  /**
   * Root node
   */
  root: Node

  /**
   * All nodes (including root)
   */
  nodes: Node[]

  /**
   * All edges
   */
  edges: Edge[]

  /**
   * Get nodes at a specific level (0 = root)
   */
  level(index: number): Node[]

  /**
   * Total number of levels
   */
  levelCount: number

  /**
   * Get node by name
   */
  getNode(name: string): Node | undefined

  /**
   * Get children of a node
   */
  children(node: Node): Node[]

  /**
   * Get parent of a node (undefined for root)
   */
  parent(node: Node): Node | undefined

  /**
   * Get all nodes and edges for rendering
   */
  toRenderables(): (Node | Edge)[]

  /**
   * Bounding box of the tree [minX, minY, maxX, maxY]
   */
  bounds: [number, number, number, number]

  /**
   * Nodes laid out as leaves via {@link TreeNodeSpec.collapsed}, with
   * their withheld-descendant counts — the bookkeeping drill-in markers
   * render against.
   */
  readonly collapsed: readonly { node: Node; hidden: number }[]
}

/**
 * Builder interface for tree nodes
 */
export interface TreeNodeBuilder {
  /**
   * Add a child to this node
   */
  child(content: string | Omit<NodeOptions, 'at'>): TreeNodeBuilder

  /**
   * Add multiple children at once
   */
  children(contents: (string | Omit<NodeOptions, 'at'>)[]): TreeNodeBuilder

  /**
   * Go back to parent builder
   */
  parent(): TreeNodeBuilder

  /**
   * Set the gap between this node and its children along the growth
   * axis (overrides `levelDistance` for this node's children).
   */
  sep(d: number): TreeNodeBuilder

  /**
   * Mark this node as collapsed: laid out as a leaf, children withheld,
   * `hidden` recorded on {@link TreeResult.collapsed} for marker
   * rendering.
   */
  collapsed(hidden: number): TreeNodeBuilder

  /**
   * Build the tree
   */
  build(): TreeResult
}

/**
 * Builder interface for trees
 */
export interface TreeBuilder {
  /**
   * Set the root node
   */
  root(content: string | Omit<NodeOptions, 'at'>): TreeNodeBuilder

  /**
   * Set level distance
   */
  levelDistance(d: number): TreeBuilder

  /**
   * Set sibling distance
   */
  siblingDistance(d: number): TreeBuilder
}

/**
 * Default tree options
 */
const DEFAULT_LEVEL_DISTANCE = 50
const DEFAULT_SIBLING_DISTANCE = 30

/**
 * Internal node builder implementation
 */
class TreeNodeBuilderImpl implements TreeNodeBuilder {
  private _spec: TreeNodeSpec
  private _parentBuilder?: TreeNodeBuilderImpl
  private _treeBuilder: TreeBuilderImpl

  constructor(
    content: string | Omit<NodeOptions, 'at'>,
    treeBuilder: TreeBuilderImpl,
    parentBuilder?: TreeNodeBuilderImpl
  ) {
    this._spec = { content, children: [] }
    this._treeBuilder = treeBuilder
    this._parentBuilder = parentBuilder
  }

  get spec(): TreeNodeSpec {
    return this._spec
  }

  child(content: string | Omit<NodeOptions, 'at'>): TreeNodeBuilder {
    const childBuilder = new TreeNodeBuilderImpl(content, this._treeBuilder, this)
    this._spec.children!.push(childBuilder.spec)
    return childBuilder
  }

  children(contents: (string | Omit<NodeOptions, 'at'>)[]): TreeNodeBuilder {
    for (const content of contents) {
      const childBuilder = new TreeNodeBuilderImpl(content, this._treeBuilder, this)
      this._spec.children!.push(childBuilder.spec)
    }
    return this
  }

  parent(): TreeNodeBuilder {
    if (!this._parentBuilder) {
      return this
    }
    return this._parentBuilder
  }

  sep(d: number): TreeNodeBuilder {
    this._spec.sep = d
    return this
  }

  collapsed(hidden: number): TreeNodeBuilder {
    this._spec.collapsed = hidden
    return this
  }

  build(): TreeResult {
    return this._treeBuilder.buildFromSpec(this.getRootSpec())
  }

  private getRootSpec(): TreeNodeSpec {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- walks up the parent chain
    let current: TreeNodeBuilderImpl = this
    while (current._parentBuilder) {
      current = current._parentBuilder
    }
    return current._spec
  }
}

/**
 * Internal tree builder implementation
 */
class TreeBuilderImpl implements TreeBuilder {
  private _options: TreeOptions
  private _rootBuilder?: TreeNodeBuilderImpl
  /** Primary coordinate per level, only set when `align === 'rank'`. */
  private rankColumns?: Map<number, number>

  constructor(options: TreeOptions = {}) {
    this._options = {
      at: { x: 0, y: 0 },
      grow: 'down',
      levelDistance: DEFAULT_LEVEL_DISTANCE,
      siblingDistance: DEFAULT_SIBLING_DISTANCE,
      drawEdges: true,
      ...options,
    }
  }

  root(content: string | Omit<NodeOptions, 'at'>): TreeNodeBuilder {
    this._rootBuilder = new TreeNodeBuilderImpl(content, this)
    return this._rootBuilder
  }

  levelDistance(d: number): TreeBuilder {
    this._options.levelDistance = d
    return this
  }

  siblingDistance(d: number): TreeBuilder {
    this._options.siblingDistance = d
    return this
  }

  buildFromSpec(rootSpec: TreeNodeSpec): TreeResult {
    // Build internal tree structure
    const internalRoot = this.buildInternalTree(rootSpec, 0)

    // Measure both axes (post-order).
    this.measureTree(internalRoot)

    // Primary axis first: in parent mode a node's growth-axis coordinate
    // depends only on its ancestors' extents; in rank mode it is the
    // level's shared column. Either way it is independent of the cross
    // axis, and the contour packing below needs it to know which nodes'
    // primary ranges actually overlap.
    this.rankColumns = undefined
    const sign = primarySign(this._options.grow!)
    const rootPrimary = sign * primaryOf(point(this._options.at!.x, this._options.at!.y), this._options.grow!)
    if (this._options.align === 'rank') {
      this.rankColumns = this.computeRankColumns(internalRoot)
      this.assignRankPrimary(internalRoot)
    } else {
      this.computeParentPrimary(internalRoot, rootPrimary)
    }

    // Cross axis: contour packing against the primary ranges just computed.
    contourLayout(
      internalRoot,
      this._options.siblingDistance!,
      secondaryOf(point(this._options.at!.x, this._options.at!.y), this._options.grow!)
    )

    // Position nodes (pre-order)
    this.positionNodes(internalRoot)

    // Collect results
    const nodes: Node[] = []
    const edges: Edge[] = []
    const nodesByName: Map<string, Node> = new Map()
    const childrenMap: Map<Node, Node[]> = new Map()
    const parentMap: Map<Node, Node> = new Map()
    const levelNodes: Map<number, Node[]> = new Map()
    let maxLevel = 0

    this.collectResults(
      internalRoot,
      nodes,
      edges,
      nodesByName,
      childrenMap,
      parentMap,
      levelNodes
    )

    for (const level of levelNodes.keys()) {
      maxLevel = Math.max(maxLevel, level)
    }

    // Calculate bounds
    const bounds = this.calculateBounds(nodes)

    // Collapsed bookkeeping: nodes laid out as leaves by truncation,
    // with their withheld-descendant counts.
    const collapsed: { node: Node; hidden: number }[] = []
    const collectCollapsed = (n: InternalTreeNode) => {
      if (n.spec.collapsed !== undefined && n.node) {
        collapsed.push({ node: n.node, hidden: n.spec.collapsed })
      }
      for (const c of n.children) collectCollapsed(c)
    }
    collectCollapsed(internalRoot)

    return {
      root: internalRoot.node!,
      nodes,
      edges,
      collapsed,
      levelCount: maxLevel + 1,
      bounds,
      level(index: number): Node[] {
        return levelNodes.get(index) ?? []
      },
      getNode(name: string): Node | undefined {
        return nodesByName.get(name)
      },
      children(node: Node): Node[] {
        return childrenMap.get(node) ?? []
      },
      parent(node: Node): Node | undefined {
        return parentMap.get(node)
      },
      toRenderables(): (Node | Edge)[] {
        return [...nodes, ...edges]
      },
    }
  }

  private buildInternalTree(
    spec: TreeNodeSpec,
    level: number,
    parent?: InternalTreeNode,
    siblingIndex = 0
  ): InternalTreeNode {
    const internal: InternalTreeNode = {
      spec,
      children: [],
      parent,
      primaryHalf: 0,
      secondaryHalf: 0,
      level,
      siblingIndex,
      primaryCenter: 0,
      rel: 0,
      cross: 0,
      left: [],
      right: [],
    }

    // Truncation: collapsed nodes and the maxDepth cut are laid out as
    // leaves — their children never enter the internal tree.
    const cut =
      spec.collapsed !== undefined ||
      (this._options.maxDepth !== undefined && level >= this._options.maxDepth)

    if (spec.children && !cut) {
      spec.children.forEach((childSpec, i) => {
        internal.children.push(this.buildInternalTree(childSpec, level + 1, internal, i))
      })
    }

    return internal
  }

  /**
   * Measure every node's half-extent on both axes (post-order).
   * `primaryHalf` drives the edge-to-edge advance to children;
   * `secondaryHalf` is what the contour pass separates siblings by.
   */
  private measureTree(node: InternalTreeNode): void {
    const tempNode = measureNode(node.spec.content, this._options.nodeOptions)
    node.primaryHalf = primaryExtent(tempNode, this._options.grow!) / 2
    node.secondaryHalf = perpendicularExtent(tempNode, this._options.grow!) / 2

    for (const child of node.children) {
      this.measureTree(child)
    }
  }

  /**
   * Parent alignment: each child's centre is `levelDistance` (or the
   * parent's `sep`) past the parent's far edge — edge-to-edge advance
   * along the growth axis. Coordinates are normalized to the growth
   * direction, so the advance is always positive.
   */
  private computeParentPrimary(node: InternalTreeNode, center: number): void {
    node.primaryCenter = center
    for (const child of node.children) {
      const gap = node.spec.sep ?? this._options.levelDistance!
      const advance = node.primaryHalf + gap + child.primaryHalf
      this.computeParentPrimary(child, center + advance)
    }
  }

  /** Rank alignment: every level sits on its shared column. Columns are
   *  computed in screen coordinates; normalize to the growth direction. */
  private assignRankPrimary(node: InternalTreeNode): void {
    const sign = primarySign(this._options.grow!)
    node.primaryCenter = sign * this.rankColumns!.get(node.level)!
    for (const child of node.children) {
      this.assignRankPrimary(child)
    }
  }

  /** Materialize the Node objects from the two computed coordinates. */
  private positionNodes(node: InternalTreeNode): void {
    const nodeOpts = contentToNodeOptions(node.spec.content, this._options.nodeOptions)
    const sign = primarySign(this._options.grow!)
    node.node = new Node({
      ...nodeOpts,
      at: axesToPoint(sign * node.primaryCenter, node.cross, this._options.grow!),
    })

    for (const child of node.children) {
      this.positionNodes(child)
    }
  }

  private computeRankColumns(root: InternalTreeNode): Map<number, number> {
    const maxHalf = new Map<number, number>()
    this.collectMaxPrimaryHalf(root, maxHalf)

    const maxLevel = maxHalf.size > 0 ? Math.max(...maxHalf.keys()) : 0
    const sign = primarySign(this._options.grow!)
    const gap = this._options.levelDistance!
    const columns = new Map<number, number>()
    columns.set(0, primaryOf(point(this._options.at!.x, this._options.at!.y), this._options.grow!))

    for (let level = 0; level < maxLevel; level++) {
      const prev = columns.get(level)!
      const advance = (maxHalf.get(level) ?? 0) + gap + (maxHalf.get(level + 1) ?? 0)
      columns.set(level + 1, prev + sign * advance)
    }

    return columns
  }

  private collectMaxPrimaryHalf(node: InternalTreeNode, maxHalf: Map<number, number>): void {
    const current = maxHalf.get(node.level) ?? 0
    maxHalf.set(node.level, Math.max(current, node.primaryHalf))
    for (const child of node.children) {
      this.collectMaxPrimaryHalf(child, maxHalf)
    }
  }



  private collectResults(
    node: InternalTreeNode,
    nodes: Node[],
    edges: Edge[],
    nodesByName: Map<string, Node>,
    childrenMap: Map<Node, Node[]>,
    parentMap: Map<Node, Node>,
    levelNodes: Map<number, Node[]>
  ): void {
    const currentNode = node.node!
    nodes.push(currentNode)

    if (currentNode.name) {
      nodesByName.set(currentNode.name, currentNode)
    }

    // Track level
    if (!levelNodes.has(node.level)) {
      levelNodes.set(node.level, [])
    }
    levelNodes.get(node.level)!.push(currentNode)

    // Track children
    const childNodes: Node[] = []
    for (const child of node.children) {
      this.collectResults(
        child,
        nodes,
        edges,
        nodesByName,
        childrenMap,
        parentMap,
        levelNodes
      )

      childNodes.push(child.node!)
      parentMap.set(child.node!, currentNode)

      // Create edge
      if (this._options.drawEdges) {
        const edgeOpts = { ...this._options.edgeOptions }
        edges.push(edge(currentNode, child.node!, edgeOpts))
      }
    }

    childrenMap.set(currentNode, childNodes)
  }

  private calculateBounds(nodes: Node[]): [number, number, number, number] {
    if (nodes.length === 0) {
      return [0, 0, 0, 0]
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const node of nodes) {
      const halfW = node.width / 2
      const halfH = node.height / 2
      minX = Math.min(minX, node.center.x - halfW)
      minY = Math.min(minY, node.center.y - halfH)
      maxX = Math.max(maxX, node.center.x + halfW)
      maxY = Math.max(maxY, node.center.y + halfH)
    }

    return [minX, minY, maxX, maxY]
  }

}

/**
 * Create a new tree builder.
 *
 * `levelDistance` is an edge-to-edge gap (node sizes are auto-measured);
 * override it per node with `.sep(d)` or `TreeNodeSpec.sep`.
 *
 * @example
 * ```typescript
 * const t = tree({ at: point(200, 30), grow: 'down' })
 *   .root('CEO')
 *     .child('CTO')
 *       .children(['Dev Lead', 'QA Lead'])
 *       .parent()
 *     .child('CFO')
 *       .child('Finance')
 *   .build()
 * ```
 */
export function tree(options?: TreeOptions): TreeBuilder {
  return new TreeBuilderImpl(options)
}

/**
 * Create a tree directly from a specification object
 *
 * @example
 * ```typescript
 * const t = treeFromSpec({
 *   content: 'Root',
 *   children: [
 *     { content: 'A', children: [{ content: 'A1' }, { content: 'A2' }] },
 *     { content: 'B' }
 *   ]
 * }, { grow: 'down' })
 * ```
 */
export function treeFromSpec(
  spec: TreeNodeSpec,
  options?: TreeOptions
): TreeResult {
  const builder = new TreeBuilderImpl(options)
  return builder.buildFromSpec(spec)
}
