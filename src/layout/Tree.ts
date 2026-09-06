import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions } from '../node/Edge'

/**
 * Direction the tree grows
 */
export type TreeGrowth = 'down' | 'up' | 'right' | 'left'

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
   * Distance between levels (default: 50)
   */
  levelDistance?: number

  /**
   * Distance between siblings (default: 30)
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
    // Create temporary node to get dimensions
    const nodeOpts = this.contentToNodeOptions(node.spec.content)
    const tempNode = new Node({ ...nodeOpts, at: { x: 0, y: 0 } })

    // Get the dimension perpendicular to growth direction
    const nodeWidth = this.isVerticalGrowth()
      ? tempNode.width
      : tempNode.height

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
    const nodeOpts = this.contentToNodeOptions(node.spec.content)
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
      const childPos = this.calculateChildPosition(position, childCenter)

      this.positionNodes(child, childPos)

      childOffset += child.subtreeWidth + this._options.siblingDistance!
    }
  }

  private calculateChildPosition(parentPos: Point, perpOffset: number): Point {
    const levelDist = this._options.levelDistance!

    switch (this._options.grow) {
      case 'down':
        return point(parentPos.x + perpOffset, parentPos.y + levelDist)
      case 'up':
        return point(parentPos.x + perpOffset, parentPos.y - levelDist)
      case 'right':
        return point(parentPos.x + levelDist, parentPos.y + perpOffset)
      case 'left':
        return point(parentPos.x - levelDist, parentPos.y + perpOffset)
      default:
        return point(parentPos.x + perpOffset, parentPos.y + levelDist)
    }
  }

  private isVerticalGrowth(): boolean {
    return this._options.grow === 'down' || this._options.grow === 'up'
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

  private contentToNodeOptions(
    content: string | Omit<NodeOptions, 'at'>
  ): Omit<NodeOptions, 'at'> {
    if (typeof content === 'string') {
      return { ...this._options.nodeOptions, text: content, name: content }
    }
    return { ...this._options.nodeOptions, ...content }
  }
}

/**
 * Create a new tree builder
 *
 * @example
 * ```typescript
 * const t = tree({ at: point(200, 30), grow: 'down' })
 *   .root('CEO')
 *     .child('CTO')
 *       .child('Dev Lead')
 *       .child('QA Lead')
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
