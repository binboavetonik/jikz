import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions } from '../node/Edge'
import {
  type LayoutGrowth,
  contentToNodeOptions,
  isVerticalGrowth,
  measureNode,
  perpendicularExtent,
  primaryExtent,
  primarySign,
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
}

/**
 * Internal tree node with computed properties
 */
interface InternalTreeNode {
  spec: TreeNodeSpec
  node?: Node
  children: InternalTreeNode[]
  parent?: InternalTreeNode
  subtreeWidth: number
  /** Half the node's extent along the growth axis (edge-to-edge advance). */
  primaryHalf: number
  level: number
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

    // Calculate subtree widths (post-order)
    this.calculateSubtreeWidths(internalRoot)

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

    return {
      root: internalRoot.node!,
      nodes,
      edges,
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
    parent?: InternalTreeNode
  ): InternalTreeNode {
    const internal: InternalTreeNode = {
      spec,
      children: [],
      parent,
      subtreeWidth: 0,
      primaryHalf: 0,
      level,
    }

    if (spec.children) {
      for (const childSpec of spec.children) {
        internal.children.push(this.buildInternalTree(childSpec, level + 1, internal))
      }
    }

    return internal
  }

  private calculateSubtreeWidths(node: InternalTreeNode): void {
    const tempNode = measureNode(node.spec.content, this._options.nodeOptions)

    // Extents: perpendicular drives sibling spacing; primary drives the
    // edge-to-edge advance to children.
    const nodeWidth = perpendicularExtent(tempNode, this._options.grow!)
    node.primaryHalf = primaryExtent(tempNode, this._options.grow!) / 2

    if (node.children.length === 0) {
      node.subtreeWidth = nodeWidth
    } else {
      // Calculate children's subtree widths first (post-order)
      for (const child of node.children) {
        this.calculateSubtreeWidths(child)
      }

      // Sum of children's widths + gaps
      const childrenWidth = node.children.reduce((sum, c) => sum + c.subtreeWidth, 0)
      const gaps = (node.children.length - 1) * this._options.siblingDistance!

      node.subtreeWidth = Math.max(nodeWidth, childrenWidth + gaps)
    }
  }

  private positionNodes(node: InternalTreeNode, position: Point): void {
    // Create the actual node at this position
    const nodeOpts = contentToNodeOptions(node.spec.content, this._options.nodeOptions)
    node.node = new Node({ ...nodeOpts, at: position })

    if (node.children.length === 0) {
      return
    }

    // Calculate total width of children
    const totalChildWidth =
      node.children.reduce((sum, c) => sum + c.subtreeWidth, 0) +
      (node.children.length - 1) * this._options.siblingDistance!

    // Starting position for first child
    let childOffset = -totalChildWidth / 2

    for (const child of node.children) {
      const childCenter = childOffset + child.subtreeWidth / 2
      const childPos = this.calculateChildPosition(position, node, child, childCenter)

      this.positionNodes(child, childPos)

      childOffset += child.subtreeWidth + this._options.siblingDistance!
    }
  }

  private calculateChildPosition(
    parentPos: Point,
    parent: InternalTreeNode,
    child: InternalTreeNode,
    perpOffset: number,
  ): Point {
    const secondary = this.secondaryOf(parentPos) + perpOffset

    let primary: number
    if (this.rankColumns) {
      primary = this.rankColumns.get(child.level) ?? this.primaryOf(parentPos)
    } else {
      const gap = parent.spec.sep ?? this._options.levelDistance!
      const advance = parent.primaryHalf + gap + child.primaryHalf
      primary = this.primaryOf(parentPos) + primarySign(this._options.grow!) * advance
    }

    return this.axesToPoint(primary, secondary)
  }

  private computeRankColumns(root: InternalTreeNode): Map<number, number> {
    const maxHalf = new Map<number, number>()
    this.collectMaxPrimaryHalf(root, maxHalf)

    const maxLevel = maxHalf.size > 0 ? Math.max(...maxHalf.keys()) : 0
    const sign = primarySign(this._options.grow!)
    const gap = this._options.levelDistance!
    const columns = new Map<number, number>()
    columns.set(0, this.primaryOf(point(this._options.at!.x, this._options.at!.y)))

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

  private primaryOf(p: Point): number {
    return isVerticalGrowth(this._options.grow!) ? p.y : p.x
  }

  private secondaryOf(p: Point): number {
    return isVerticalGrowth(this._options.grow!) ? p.x : p.y
  }

  private axesToPoint(primary: number, secondary: number): Point {
    return isVerticalGrowth(this._options.grow!)
      ? point(secondary, primary)
      : point(primary, secondary)
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
