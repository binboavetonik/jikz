import { Point, point } from '../core/Point'
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

  // ── Contour-layout scratch (Buchheim et al. 2002) ──────────────────────
  /** Preliminary cross-axis coordinate, relative to the parent. */
  prelim: number
  /** Offset applied to this node's whole subtree during the second walk. */
  mod: number
  /** Pending shift for this node and its right siblings. */
  shift: number
  /** Per-subtree share of a shift, accumulated right to left. */
  change: number
  /** Contour thread: the next contour node when this one has no children. */
  thread?: InternalTreeNode
  /** Greatest distinct ancestor used for shift attribution. */
  ancestor?: InternalTreeNode
  /** Absolute cross-axis coordinate, set by the second walk. */
  cross: number
}

// ─────────────────────────────────────────────────────────────────────────
// Contour packing — Reingold–Tilford by way of Buchheim, Jünger & Leipert
// 2002, "Improving Walker's Algorithm to Run in Linear Time".
// ─────────────────────────────────────────────────────────────────────────

/**
 * Place every node on the cross axis so sibling subtrees nest as tightly
 * as their *contours* allow, then shift the tree so the root sits at
 * `rootCross`.
 *
 * This replaced bounding-box packing, where each subtree reserved its
 * widest level's width at every level. Two subtrees whose widest levels sit
 * at different depths could then never interleave even though nothing
 * actually collided; on random trees that wasted a mean of ~4 node widths
 * per drawing (worst case ~13). Walking the facing contours lets them mesh.
 *
 * Linear time comes from two tricks: `thread` pointers stitch a subtree's
 * contour into a traversable chain so each contour node is visited once,
 * and `shift`/`change` accumulate the space a shifted subtree owes its
 * smaller left siblings so `executeShifts` can settle them all in one
 * right-to-left pass instead of moving each individually.
 *
 * Node sizes vary here, so {@link separation} is the two nodes' half-extents
 * plus `siblingDistance` rather than the paper's constant.
 */
function contourLayout(
  root: InternalTreeNode,
  siblingDistance: number,
  rootCross: number
): void {
  firstWalk(root, siblingDistance)
  secondWalk(root, rootCross - root.prelim)
}

/** Center-to-center distance two same-level neighbors must keep. */
function separation(
  left: InternalTreeNode,
  right: InternalTreeNode,
  siblingDistance: number
): number {
  return left.secondaryHalf + siblingDistance + right.secondaryHalf
}

function leftSibling(v: InternalTreeNode): InternalTreeNode | undefined {
  if (!v.parent || v.siblingIndex === 0) return undefined
  return v.parent.children[v.siblingIndex - 1]
}

/** Next node along the left contour: first child, else the thread. */
function nextLeft(v: InternalTreeNode): InternalTreeNode | undefined {
  return v.children.length > 0 ? v.children[0] : v.thread
}

/** Next node along the right contour: last child, else the thread. */
function nextRight(v: InternalTreeNode): InternalTreeNode | undefined {
  return v.children.length > 0 ? v.children[v.children.length - 1] : v.thread
}

/**
 * Assign preliminary coordinates bottom-up. A leaf goes just right of its
 * left sibling; an interior node is centered over its outermost children,
 * after `apportion` has pushed its subtree clear of everything to the left.
 */
function firstWalk(v: InternalTreeNode, siblingDistance: number): void {
  if (v.children.length === 0) {
    const w = leftSibling(v)
    v.prelim = w ? w.prelim + separation(w, v, siblingDistance) : 0
    return
  }

  let defaultAncestor = v.children[0]!
  for (const child of v.children) {
    firstWalk(child, siblingDistance)
    defaultAncestor = apportion(child, defaultAncestor, siblingDistance)
  }
  executeShifts(v)

  const first = v.children[0]!
  const last = v.children[v.children.length - 1]!
  const midpoint = (first.prelim + last.prelim) / 2

  const w = leftSibling(v)
  if (w) {
    v.prelim = w.prelim + separation(w, v, siblingDistance)
    v.mod = v.prelim - midpoint
  } else {
    v.prelim = midpoint
  }
}

/**
 * Walk the right contour of everything left of `v` against `v`'s left
 * contour, and shift `v` right by the largest overlap found. Threads make
 * each step O(1), so the whole pass is linear rather than the quadratic
 * re-scan of the original Reingold–Tilford.
 */
function apportion(
  v: InternalTreeNode,
  defaultAncestor: InternalTreeNode,
  siblingDistance: number
): InternalTreeNode {
  const w = leftSibling(v)
  if (!w) return defaultAncestor

  // Inside/outside contour cursors: `i` = inner, `o` = outer;
  // `p` = v's side (plus), `m` = the left siblings' side (minus).
  let vip = v
  let vop = v
  let vim = w
  let vom = v.parent!.children[0]!
  let sip = vip.mod
  let sop = vop.mod
  let sim = vim.mod
  let som = vom.mod

  while (nextRight(vim) && nextLeft(vip)) {
    vim = nextRight(vim)!
    vip = nextLeft(vip)!
    vom = nextLeft(vom)!
    vop = nextRight(vop)!
    vop.ancestor = v

    const shift = vim.prelim + sim - (vip.prelim + sip) + separation(vim, vip, siblingDistance)
    if (shift > 0) {
      moveSubtree(resolveAncestor(vim, v, defaultAncestor), v, shift)
      sip += shift
      sop += shift
    }

    sim += vim.mod
    sip += vip.mod
    som += vom.mod
    sop += vop.mod
  }

  // Thread the shorter contour onto the longer one so later siblings can
  // keep walking past the end of this subtree.
  if (nextRight(vim) && !nextRight(vop)) {
    vop.thread = nextRight(vim)
    vop.mod += sim - sop
  }
  if (nextLeft(vip) && !nextLeft(vom)) {
    vom.thread = nextLeft(vip)
    vom.mod += sip - som
    defaultAncestor = v
  }

  return defaultAncestor
}

/**
 * `wm` and `wp` are siblings; move `wp`'s subtree right by `shift` and
 * record the share owed to each sibling between them, for
 * {@link executeShifts} to distribute.
 */
function moveSubtree(wm: InternalTreeNode, wp: InternalTreeNode, shift: number): void {
  const subtrees = wp.siblingIndex - wm.siblingIndex
  if (subtrees === 0) return
  wp.change -= shift / subtrees
  wp.shift += shift
  wm.change += shift / subtrees
  wp.prelim += shift
  wp.mod += shift
}

/** Settle the shifts `moveSubtree` recorded, right to left, in one pass. */
function executeShifts(v: InternalTreeNode): void {
  let shift = 0
  let change = 0
  for (let i = v.children.length - 1; i >= 0; i--) {
    const w = v.children[i]!
    w.prelim += shift
    w.mod += shift
    change += w.change
    shift += w.shift + change
  }
}

/**
 * The sibling of `v` whose subtree `vim` belongs to, when that is known;
 * otherwise the leftmost sibling touched so far.
 */
function resolveAncestor(
  vim: InternalTreeNode,
  v: InternalTreeNode,
  defaultAncestor: InternalTreeNode
): InternalTreeNode {
  const candidate = vim.ancestor
  return candidate && candidate.parent === v.parent ? candidate : defaultAncestor
}

/** Turn preliminary coordinates into absolute ones, accumulating modifiers. */
function secondWalk(v: InternalTreeNode, m: number): void {
  v.cross = v.prelim + m
  for (const child of v.children) {
    secondWalk(child, m + v.mod)
  }
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

    // Measure both axes (post-order), then place on the cross axis with
    // contour packing.
    this.measureTree(internalRoot)
    contourLayout(
      internalRoot,
      this._options.siblingDistance!,
      secondaryOf(point(this._options.at!.x, this._options.at!.y), this._options.grow!)
    )

    // Rank alignment: compute the shared column per level before
    // positioning — nodes' primary coordinate then comes from the column,
    // not from their parent's advance.
    this.rankColumns = undefined
    if (this._options.align === 'rank') {
      this.rankColumns = this.computeRankColumns(internalRoot)
    }

    // Position nodes (pre-order)
    const rootPos = point(this._options.at!.x, this._options.at!.y)
    this.positionNodes(internalRoot, rootPos)

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
      prelim: 0,
      mod: 0,
      shift: 0,
      change: 0,
      cross: 0,
    }
    // The paper's `v.ancestor` defaults to v itself.
    internal.ancestor = internal

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

  private positionNodes(node: InternalTreeNode, position: Point): void {
    // Create the actual node at this position
    const nodeOpts = contentToNodeOptions(node.spec.content, this._options.nodeOptions)
    node.node = new Node({ ...nodeOpts, at: position })

    for (const child of node.children) {
      const childPos = this.calculateChildPosition(position, node, child)
      this.positionNodes(child, childPos)
    }
  }

  private calculateChildPosition(
    parentPos: Point,
    parent: InternalTreeNode,
    child: InternalTreeNode,
  ): Point {
    // Cross-axis coordinate is absolute, decided by the contour pass.
    const secondary = child.cross

    let primary: number
    if (this.rankColumns) {
      primary = this.rankColumns.get(child.level) ?? primaryOf(parentPos, this._options.grow!)
    } else {
      const gap = parent.spec.sep ?? this._options.levelDistance!
      const advance = parent.primaryHalf + gap + child.primaryHalf
      primary = primaryOf(parentPos, this._options.grow!) + primarySign(this._options.grow!) * advance
    }

    return axesToPoint(primary, secondary, this._options.grow!)
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
