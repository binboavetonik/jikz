import { point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import { circle } from '../../../geometry/Circle'
import type { ShapeOptions } from '../../../geometry/Shape'
import { intrinsicSize } from '../../../geometry/PortedShape'
import { TwoTerminalSymbol } from '../ports'

/** Bulb symbol options. */
export type BulbOptions = ShapeOptions

/** Intrinsic symbol width when no width is given. */
export const BULB_DEFAULT_WIDTH = 60
/** Intrinsic symbol height when no height is given. */
export const BULB_DEFAULT_HEIGHT = 36

/**
 * Lamp — jikz's `circuit ee IEC bulb`. A circle crossed by an X, with
 * the diagonals running to the circle itself rather than to the
 * bounding box, so the symbol reads at any size. Ports: `in` (west
 * lead tip), `out` (east lead tip).
 */
export class Bulb extends TwoTerminalSymbol {
  readonly type = 'bulb' as const

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const r = this.height / 2
    const d = r / Math.SQRT2 // where a 45° diagonal meets the circle

    return [
      `M ${cx - this.width / 2} ${cy} L ${cx - r} ${cy}`,
      circle(point(cx, cy), r).toSVGPath(),
      `M ${cx + r} ${cy} L ${cx + this.width / 2} ${cy}`,
      `M ${round(cx - d)} ${round(cy - d)} L ${round(cx + d)} ${round(cy + d)}`,
      `M ${round(cx - d)} ${round(cy + d)} L ${round(cx + d)} ${round(cy - d)}`,
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): Bulb {
    return new Bulb(center, width, height)
  }
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

/** Create a bulb symbol (intrinsic 60×36 default). */
export function bulb(options: BulbOptions = {}): Bulb {
  const { width, height } = intrinsicSize(options, BULB_DEFAULT_WIDTH, BULB_DEFAULT_HEIGHT)
  return new Bulb(options.center ?? { x: 0, y: 0 }, width, height)
}
