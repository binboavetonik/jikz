import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'

/**
 * Growth direction shared by the layout builders. `tree()` re-exports
 * this as `TreeGrowth`; `layered()` (Level 2) will use it directly.
 */
export type LayoutGrowth = 'down' | 'up' | 'right' | 'left'

/** Whether the growth axis is vertical (down/up) rather than horizontal. */
export function isVerticalGrowth(grow: LayoutGrowth): boolean {
  return grow === 'down' || grow === 'up'
}

/**
 * Extent of a node along the growth axis — `width` for horizontal
 * growth, `height` for vertical growth.
 */
export function primaryExtent(node: Node, grow: LayoutGrowth): number {
  return isVerticalGrowth(grow) ? node.height : node.width
}

/**
 * Extent of a node along the axis perpendicular to growth.
 */
export function perpendicularExtent(node: Node, grow: LayoutGrowth): number {
  return isVerticalGrowth(grow) ? node.width : node.height
}

/** Primary-axis sign: +1 for down/right, -1 for up/left. */
export function primarySign(grow: LayoutGrowth): 1 | -1 {
  return grow === 'up' || grow === 'left' ? -1 : 1
}

/**
 * Resolve a layout node's `content` (a bare string or NodeOptions) into
 * concrete NodeOptions, merged over the builder's default `nodeOptions`.
 */
export function contentToNodeOptions(
  content: string | Omit<NodeOptions, 'at'>,
  nodeOptions?: Omit<NodeOptions, 'at' | 'text'>,
): Omit<NodeOptions, 'at'> {
  if (typeof content === 'string') {
    return { ...nodeOptions, text: content, name: content }
  }
  return { ...nodeOptions, ...content }
}

/**
 * Build a throwaway Node at the origin to read its measured dimensions.
 * Width/height reflect the shape, explicit size, minWidth/minHeight and
 * (when auto-sizing applies) the measured text.
 */
export function measureNode(
  content: string | Omit<NodeOptions, 'at'>,
  nodeOptions?: Omit<NodeOptions, 'at' | 'text'>,
): Node {
  return new Node({ ...contentToNodeOptions(content, nodeOptions), at: { x: 0, y: 0 } })
}

/**
 * Edge-to-edge advance along the growth axis: the gap sits between the
 * parent's far boundary and the child's near boundary. Both half-extents
 * are included, so wider children sit further out with their near edges
 * aligned under the parent.
 */
export function primaryAdvance(
  parentPrimary: number,
  gap: number,
  childPrimary: number,
): number {
  return parentPrimary / 2 + gap + childPrimary / 2
}

/** Primary coordinate of a screen point under `grow` (x for right/left, y for down/up). */
export function primaryOf(p: PointLike, grow: LayoutGrowth): number {
  return isVerticalGrowth(grow) ? p.y : p.x
}

/** Secondary (perpendicular) coordinate of a screen point under `grow`. */
export function secondaryOf(p: PointLike, grow: LayoutGrowth): number {
  return isVerticalGrowth(grow) ? p.x : p.y
}

/** Map a (primary, secondary) pair to a screen point for `grow`. */
export function axesToPoint(
  primary: number,
  secondary: number,
  grow: LayoutGrowth,
): Point {
  return isVerticalGrowth(grow) ? point(secondary, primary) : point(primary, secondary)
}
