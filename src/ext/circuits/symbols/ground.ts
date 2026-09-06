import { Point, point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { CircuitSymbol, symbolSize } from '../ports'

/** Ground symbol options (no variant — earth ground only). */
export type GroundOptions = ShapeOptions

/** Intrinsic symbol width when no width is given. */
export const GROUND_DEFAULT_WIDTH = 24
/** Intrinsic symbol height when no height is given. */
export const GROUND_DEFAULT_HEIGHT = 18

const STUB = 7
const LINE_SPACING = 5

/**
 * Earth ground symbol: a stub from the single `in` port (at the north
 * box edge) down to three horizontal bars of decreasing width. Drawn
 * pointing DOWN (the common case) — rotate for other orientations.
 * Port: `in` (also `north`, via the box).
 */
export class Ground extends CircuitSymbol {
  readonly type = 'ground' as const

  protected portTable(): Record<string, Point> {
    return {
      in: point(this.center.x, this.center.y - this.height / 2),
    }
  }

  /** Connection stub tip (north edge) — typed form of `anchor('in')`. */
  get in(): Point {
    return this.anchor('in')
  }

  toSVGPath(): string {
    const cx = this.center.x
    const top = this.center.y - this.height / 2
    const w1 = this.width
    const w2 = this.width * 0.62
    const w3 = this.width * 0.28

    const y1 = top + STUB
    const y2 = y1 + LINE_SPACING
    const y3 = y2 + LINE_SPACING

    return [
      `M ${cx} ${top} L ${cx} ${y1}`,
      `M ${cx - w1 / 2} ${y1} L ${cx + w1 / 2} ${y1}`,
      `M ${cx - w2 / 2} ${y2} L ${cx + w2 / 2} ${y2}`,
      `M ${cx - w3 / 2} ${y3} L ${cx + w3 / 2} ${y3}`,
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): Ground {
    return new Ground(center, width, height)
  }
}

/** Create a ground symbol (intrinsic 24×18 default). */
export function ground(options: GroundOptions = {}): Ground {
  const { width, height } = symbolSize(
    options,
    GROUND_DEFAULT_WIDTH,
    GROUND_DEFAULT_HEIGHT
  )
  return new Ground(options.center ?? { x: 0, y: 0 }, width, height)
}
