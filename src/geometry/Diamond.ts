import { point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Polygon } from './Polygon'

/**
 * An axis-aligned diamond (rhombus with horizontal/vertical diagonals).
 *
 * Lives on top of {@link Polygon} — the anchor/bounds/contains/toSVGPath
 * logic is inherited. The only additions are a stable `type` tag of
 * `'diamond'` and factory convenience.
 *
 * Vertices are placed at (top, right, bottom, left) of the bounding box,
 * which places the math-convention "north" anchor (angle 90° → +y) at the
 * south vertex in SVG's y-down screen space — the same as every other
 * geometry primitive in this library.
 */
export class Diamond extends Polygon {
  override readonly type: string = 'diamond'

  constructor(center: PointLike, width: number, height: number) {
    const halfW = width / 2
    const halfH = height / 2
    super([
      point(center.x, center.y - halfH),
      point(center.x + halfW, center.y),
      point(center.x, center.y + halfH),
      point(center.x - halfW, center.y),
    ])
  }
}

/**
 * Create an axis-aligned diamond centered at `center` with the given
 * bounding-box dimensions.
 */
export function diamond(
  center: PointLike,
  width: number,
  height: number
): Diamond {
  return new Diamond(center, width, height)
}
