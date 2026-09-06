import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad } from '../utils/math'
import type { Anchorable } from '../core/Anchor'
import { Node, type NodeOptions } from './Node'

/**
 * Direction for relative positioning
 */
export type PositionDirection =
  | 'above'
  | 'below'
  | 'left'
  | 'right'
  | 'above left'
  | 'above right'
  | 'below left'
  | 'below right'

/**
 * Options for relative positioning
 */
export interface PositionOptions {
  /**
   * Distance between nodes (edge to edge)
   * Default: 10
   */
  distance?: number

  /**
   * For diagonal positioning, x distance
   */
  xDistance?: number

  /**
   * For diagonal positioning, y distance
   */
  yDistance?: number
}

/**
 * Default node distance (like TikZ's node distance)
 */
export const DEFAULT_NODE_DISTANCE = 10

/**
 * Map direction to the anchor names used for attachment.
 * `from` is the reference node's anchor; `to` is the new node's anchor
 * (both screen convention — `north` is the visual top edge).
 */
const DIRECTION_TO_ANCHOR: Record<PositionDirection, { from: string; to: string }> = {
  'above': { from: 'north', to: 'south' },
  'below': { from: 'south', to: 'north' },
  'left': { from: 'west', to: 'east' },
  'right': { from: 'east', to: 'west' },
  'above left': { from: 'north west', to: 'south east' },
  'above right': { from: 'north east', to: 'south west' },
  'below left': { from: 'south west', to: 'north east' },
  'below right': { from: 'south east', to: 'north west' },
}

/**
 * Calculate the position for a new node relative to a reference node
 *
 * This implements TikZ-style positioning where:
 * - The new node's opposite anchor touches the reference node's anchor
 * - Plus an optional gap distance
 *
 * @param reference - The reference node/point
 * @param direction - Direction to place the new node
 * @param options - Positioning options including distance
 * @param newNodeSize - Size of the new node (for proper anchor calculation)
 */
export function calculateRelativePosition(
  reference: Anchorable | PointLike,
  direction: PositionDirection,
  options: PositionOptions = {},
  newNodeSize: { width: number; height: number } = { width: 20, height: 20 }
): Point {
  const dist = options.distance ?? DEFAULT_NODE_DISTANCE
  const dirInfo = DIRECTION_TO_ANCHOR[direction]

  // Get the reference anchor point
  let refAnchor: Point
  if ('anchor' in reference) {
    refAnchor = reference.anchor(dirInfo.from)
  } else {
    refAnchor = point(reference.x, reference.y)
  }

  // Calculate offset based on direction
  // The offset needs to account for the new node's size
  const halfW = newNodeSize.width / 2
  const halfH = newNodeSize.height / 2

  let dx = 0
  let dy = 0

  switch (direction) {
    case 'above':
      dy = -(dist + halfH)
      break
    case 'below':
      dy = dist + halfH
      break
    case 'left':
      dx = -(dist + halfW)
      break
    case 'right':
      dx = dist + halfW
      break
    case 'above left':
      dx = -(options.xDistance ?? dist) - halfW
      dy = -(options.yDistance ?? dist) - halfH
      break
    case 'above right':
      dx = (options.xDistance ?? dist) + halfW
      dy = -(options.yDistance ?? dist) - halfH
      break
    case 'below left':
      dx = -(options.xDistance ?? dist) - halfW
      dy = (options.yDistance ?? dist) + halfH
      break
    case 'below right':
      dx = (options.xDistance ?? dist) + halfW
      dy = (options.yDistance ?? dist) + halfH
      break
  }

  return point(refAnchor.x + dx, refAnchor.y + dy)
}

/**
 * Create a node positioned relative to another node
 *
 * @example
 * const A = rectNode({ at: point(100, 100), text: 'A' })
 * const B = nodeAt(A, 'right', { distance: 20 }, { text: 'B' })
 * // B is positioned 20px to the right of A
 */
export function nodeAt(
  reference: Anchorable | PointLike,
  direction: PositionDirection,
  positionOptions: PositionOptions = {},
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  // First create a temporary node to get its size
  const tempNode = new Node({ ...nodeOptions, at: { x: 0, y: 0 } })
  const size = { width: tempNode.width, height: tempNode.height }

  // Calculate position
  const position = calculateRelativePosition(reference, direction, positionOptions, size)

  // Create the actual node
  return new Node({ ...nodeOptions, at: position })
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience factory functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a node above another
 */
export function nodeAbove(
  reference: Anchorable | PointLike,
  distance?: number,
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  return nodeAt(reference, 'above', { distance }, nodeOptions)
}

/**
 * Create a node below another
 */
export function nodeBelow(
  reference: Anchorable | PointLike,
  distance?: number,
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  return nodeAt(reference, 'below', { distance }, nodeOptions)
}

/**
 * Create a node to the left of another
 */
export function nodeLeft(
  reference: Anchorable | PointLike,
  distance?: number,
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  return nodeAt(reference, 'left', { distance }, nodeOptions)
}

/**
 * Create a node to the right of another
 */
export function nodeRight(
  reference: Anchorable | PointLike,
  distance?: number,
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  return nodeAt(reference, 'right', { distance }, nodeOptions)
}

/**
 * Create a node above and to the left of another
 */
export function nodeAboveLeft(
  reference: Anchorable | PointLike,
  distance?: number | { x: number; y: number },
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  const opts: PositionOptions = typeof distance === 'number'
    ? { distance }
    : { xDistance: distance?.x, yDistance: distance?.y }
  return nodeAt(reference, 'above left', opts, nodeOptions)
}

/**
 * Create a node above and to the right of another
 */
export function nodeAboveRight(
  reference: Anchorable | PointLike,
  distance?: number | { x: number; y: number },
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  const opts: PositionOptions = typeof distance === 'number'
    ? { distance }
    : { xDistance: distance?.x, yDistance: distance?.y }
  return nodeAt(reference, 'above right', opts, nodeOptions)
}

/**
 * Create a node below and to the left of another
 */
export function nodeBelowLeft(
  reference: Anchorable | PointLike,
  distance?: number | { x: number; y: number },
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  const opts: PositionOptions = typeof distance === 'number'
    ? { distance }
    : { xDistance: distance?.x, yDistance: distance?.y }
  return nodeAt(reference, 'below left', opts, nodeOptions)
}

/**
 * Create a node below and to the right of another
 */
export function nodeBelowRight(
  reference: Anchorable | PointLike,
  distance?: number | { x: number; y: number },
  nodeOptions: Omit<NodeOptions, 'at'> = {}
): Node {
  const opts: PositionOptions = typeof distance === 'number'
    ? { distance }
    : { xDistance: distance?.x, yDistance: distance?.y }
  return nodeAt(reference, 'below right', opts, nodeOptions)
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a row of nodes
 *
 * @example
 * const nodes = nodeRow(point(50, 100), ['A', 'B', 'C', 'D'], { distance: 15 })
 */
export function nodeRow(
  start: PointLike,
  labels: string[],
  options: { distance?: number; nodeOptions?: Omit<NodeOptions, 'at' | 'text'> } = {}
): Node[] {
  const dist = options.distance ?? DEFAULT_NODE_DISTANCE
  const nodeOpts = options.nodeOptions ?? {}
  const nodes: Node[] = []

  for (let i = 0; i < labels.length; i++) {
    if (i === 0) {
      nodes.push(new Node({ ...nodeOpts, at: start, text: labels[i], name: labels[i] }))
    } else {
      const prev = nodes[i - 1]!
      nodes.push(nodeRight(prev, dist, { ...nodeOpts, text: labels[i], name: labels[i] }))
    }
  }

  return nodes
}

/**
 * Create a column of nodes
 */
export function nodeColumn(
  start: PointLike,
  labels: string[],
  options: { distance?: number; nodeOptions?: Omit<NodeOptions, 'at' | 'text'> } = {}
): Node[] {
  const dist = options.distance ?? DEFAULT_NODE_DISTANCE
  const nodeOpts = options.nodeOptions ?? {}
  const nodes: Node[] = []

  for (let i = 0; i < labels.length; i++) {
    if (i === 0) {
      nodes.push(new Node({ ...nodeOpts, at: start, text: labels[i], name: labels[i] }))
    } else {
      const prev = nodes[i - 1]!
      nodes.push(nodeBelow(prev, dist, { ...nodeOpts, text: labels[i], name: labels[i] }))
    }
  }

  return nodes
}

/**
 * Create a grid of nodes
 *
 * @example
 * const grid = nodeGrid(point(50, 50), [
 *   ['A', 'B', 'C'],
 *   ['D', 'E', 'F'],
 *   ['G', 'H', 'I']
 * ], { xDistance: 20, yDistance: 15 })
 */
export function nodeGrid(
  start: PointLike,
  labels: string[][],
  options: {
    xDistance?: number;
    yDistance?: number;
    nodeOptions?: Omit<NodeOptions, 'at' | 'text'>
  } = {}
): Node[][] {
  const xDist = options.xDistance ?? DEFAULT_NODE_DISTANCE
  const yDist = options.yDistance ?? DEFAULT_NODE_DISTANCE
  const nodeOpts = options.nodeOptions ?? {}
  const grid: Node[][] = []

  for (let row = 0; row < labels.length; row++) {
    const rowNodes: Node[] = []
    for (let col = 0; col < labels[row]!.length; col++) {
      const label = labels[row]![col]!
      if (row === 0 && col === 0) {
        rowNodes.push(new Node({ ...nodeOpts, at: start, text: label, name: label }))
      } else if (col === 0) {
        // First column: position below previous row's first node
        const above = grid[row - 1]![0]!
        rowNodes.push(nodeBelow(above, yDist, { ...nodeOpts, text: label, name: label }))
      } else {
        // Other columns: position right of previous column
        const left = rowNodes[col - 1]!
        rowNodes.push(nodeRight(left, xDist, { ...nodeOpts, text: label, name: label }))
      }
    }
    grid.push(rowNodes)
  }

  return grid
}

/**
 * Arrange nodes in a circle
 *
 * @example
 * const nodes = nodeCircle(point(150, 150), 80, ['A', 'B', 'C', 'D', 'E', 'F'])
 */
export function nodeCircle(
  center: PointLike,
  radius: number,
  labels: string[],
  options: {
    startAngle?: number;  // degrees, default -90 (top)
    nodeOptions?: Omit<NodeOptions, 'at' | 'text'>
  } = {}
): Node[] {
  const startAngle = options.startAngle ?? -90
  const nodeOpts = options.nodeOptions ?? {}
  const nodes: Node[] = []
  const step = 360 / labels.length

  for (let i = 0; i < labels.length; i++) {
    const angle = startAngle + i * step
    const rad = degToRad(angle)
    const pos = point(
      center.x + radius * Math.cos(rad),
      center.y + radius * Math.sin(rad)
    )
    nodes.push(new Node({ ...nodeOpts, at: pos, text: labels[i], name: labels[i] }))
  }

  return nodes
}
