import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'
import { Edge, edge, type EdgeOptions } from '../node/Edge'
import {
  calculateRelativePosition,
  type PositionDirection,
} from '../node/Positioning'

/**
 * Direction for chain growth
 */
export type ChainDirection = PositionDirection

/**
 * Options for chain configuration
 */
export interface ChainOptions {
  /**
   * Direction the chain grows (default: 'right')
   */
  direction?: ChainDirection

  /**
   * Distance between nodes (default: 20)
   */
  spacing?: number

  /**
   * Default edge options applied to all connections
   */
  edgeOptions?: EdgeOptions

  /**
   * Default node options applied to all nodes
   */
  nodeOptions?: Omit<NodeOptions, 'at' | 'text'>

  /**
   * Whether to automatically connect nodes with edges (default: true)
   */
  connectNodes?: boolean
}

/**
 * Result of building a chain
 */
export interface ChainResult {
  /**
   * All nodes in the chain (in order of creation)
   */
  nodes: Node[]

  /**
   * All edges connecting the nodes
   */
  edges: Edge[]

  /**
   * Get a node by name
   */
  getNode(name: string): Node | undefined

  /**
   * Get all nodes and edges as a flat array for rendering
   */
  toRenderables(): (Node | Edge)[]
}

/**
 * Builder interface for creating node chains
 */
export interface ChainBuilder {
  /**
   * Add a node to the chain
   */
  node(options: Omit<NodeOptions, 'at'>): ChainBuilder

  /**
   * Change direction for subsequent nodes
   */
  going(direction: ChainDirection): ChainBuilder

  /**
   * Set spacing for subsequent nodes
   */
  withSpacing(spacing: number): ChainBuilder

  /**
   * Set edge options for the next connection
   */
  withEdge(options: EdgeOptions): ChainBuilder

  /**
   * Skip edge connection to the next node
   */
  skipEdge(): ChainBuilder

  /**
   * Create a branch from a specific node
   */
  branch(fromNodeName: string, direction?: ChainDirection): ChainBuilder

  /**
   * Build and return the chain result
   */
  build(): ChainResult
}

/**
 * Default spacing between chain nodes
 */
const DEFAULT_CHAIN_SPACING = 20

/**
 * Internal class implementing the chain builder
 */
class ChainBuilderImpl implements ChainBuilder {
  private _nodes: Node[] = []
  private _edges: Edge[] = []
  private _nodesByName: Map<string, Node> = new Map()
  private _currentDirection: ChainDirection
  private _currentSpacing: number
  private _options: ChainOptions
  private _lastNode?: Node
  private _nextEdgeOptions?: EdgeOptions
  private _skipNextEdge = false
  private _startPoint: Point

  constructor(start: PointLike, options: ChainOptions = {}) {
    this._startPoint = point(start.x, start.y)
    this._options = {
      direction: 'right',
      spacing: DEFAULT_CHAIN_SPACING,
      connectNodes: true,
      ...options,
    }
    this._currentDirection = this._options.direction!
    this._currentSpacing = this._options.spacing!
  }

  /**
   * Adopt an existing node as the chain's current tail. Used by
   * `chainFrom`; package-internal, not part of the fluent API.
   * @internal
   */
  adoptNode(node: Node): void {
    this._nodes.push(node)
    if (node.name) {
      this._nodesByName.set(node.name, node)
    }
    this._lastNode = node
  }

  node(options: Omit<NodeOptions, 'at'>): ChainBuilder {
    const mergedOptions = { ...this._options.nodeOptions, ...options }

    let newNode: Node

    if (!this._lastNode) {
      // First node - place at start point
      newNode = new Node({ ...mergedOptions, at: this._startPoint })
    } else {
      // Subsequent nodes - position relative to last node
      const tempNode = new Node({ ...mergedOptions, at: { x: 0, y: 0 } })
      const size = { width: tempNode.width, height: tempNode.height }

      const position = calculateRelativePosition(
        this._lastNode,
        this._currentDirection,
        { distance: this._currentSpacing },
        size
      )

      newNode = new Node({ ...mergedOptions, at: position })

      // Create edge if needed
      if (this._options.connectNodes && !this._skipNextEdge) {
        const edgeOpts = {
          ...this._options.edgeOptions,
          ...this._nextEdgeOptions,
        }
        const newEdge = edge(this._lastNode, newNode, edgeOpts)
        this._edges.push(newEdge)
      }
    }

    // Track node
    this._nodes.push(newNode)
    if (newNode.name) {
      this._nodesByName.set(newNode.name, newNode)
    }

    // Reset state
    this._lastNode = newNode
    this._nextEdgeOptions = undefined
    this._skipNextEdge = false

    return this
  }

  going(direction: ChainDirection): ChainBuilder {
    this._currentDirection = direction
    return this
  }

  withSpacing(spacing: number): ChainBuilder {
    this._currentSpacing = spacing
    return this
  }

  withEdge(options: EdgeOptions): ChainBuilder {
    this._nextEdgeOptions = options
    return this
  }

  skipEdge(): ChainBuilder {
    this._skipNextEdge = true
    return this
  }

  branch(fromNodeName: string, direction?: ChainDirection): ChainBuilder {
    const branchFrom = this._nodesByName.get(fromNodeName)
    if (!branchFrom) {
      throw new JikzError('unknown-name', `Node with name "${fromNodeName}" not found in chain`)
    }

    this._lastNode = branchFrom
    if (direction) {
      this._currentDirection = direction
    }
    this._skipNextEdge = false

    return this
  }

  build(): ChainResult {
    const nodes = [...this._nodes]
    const edges = [...this._edges]
    const nodesByName = new Map(this._nodesByName)

    return {
      nodes,
      edges,
      getNode(name: string): Node | undefined {
        return nodesByName.get(name)
      },
      toRenderables(): (Node | Edge)[] {
        return [...nodes, ...edges]
      },
    }
  }
}

/**
 * Create a new chain builder starting at the given point
 *
 * @example
 * ```typescript
 * const result = chain(point(50, 100))
 *   .node({ text: 'A' })
 *   .node({ text: 'B' })
 *   .node({ text: 'C' })
 *   .build()
 * ```
 */
export function chain(start: PointLike, options?: ChainOptions): ChainBuilder {
  return new ChainBuilderImpl(start, options)
}

/**
 * Create a chain starting from an existing node
 *
 * @example
 * ```typescript
 * const firstNode = rectNode({ at: point(50, 100), text: 'Start' })
 * const result = chainFrom(firstNode)
 *   .node({ text: 'A' })
 *   .node({ text: 'B' })
 *   .build()
 * ```
 */
export function chainFrom(node: Node, options?: ChainOptions): ChainBuilder {
  const builder = new ChainBuilderImpl(node.center, options)
  // Add the starting node to the chain
  builder.adoptNode(node)
  return builder
}
