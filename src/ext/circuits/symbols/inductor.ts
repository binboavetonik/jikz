import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { TwoTerminalSymbol, symbolSize } from '../ports'

export type InductorOptions = ShapeOptions

export const INDUCTOR_DEFAULT_WIDTH = 60
export const INDUCTOR_DEFAULT_HEIGHT = 20

/** Coil body occupies this fraction of the width; the rest is leads. */
const BODY_FRACTION = 0.6
/** Number of coil bumps (semicircles). */
const BUMPS = 4

/**
 * Two-terminal inductor: leads + a row of semicircular bumps (IEC/ANSI
 * coil style). Ports: `in` (west lead tip), `out` (east lead tip).
 */
export class Inductor extends TwoTerminalSymbol {
  readonly type = 'inductor' as const

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const bodyW = this.width * BODY_FRACTION
    let x = cx - bodyW / 2

    const r = bodyW / (2 * BUMPS)
    const parts = [`M ${westX} ${cy} L ${x} ${cy}`]
    for (let i = 0; i < BUMPS; i++) {
      // sweep=1 in y-down space arcs clockwise → bump rises UP.
      parts.push(`A ${r} ${r} 0 0 1 ${x + 2 * r} ${cy}`)
      x += 2 * r
    }
    parts.push(`L ${eastX} ${cy}`)
    return parts.join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): Inductor {
    return new Inductor(center, width, height)
  }
}

/** Create an inductor symbol (intrinsic 60×20 default). */
export function inductor(options: InductorOptions = {}): Inductor {
  const { width, height } = symbolSize(
    options,
    INDUCTOR_DEFAULT_WIDTH,
    INDUCTOR_DEFAULT_HEIGHT
  )
  return new Inductor(options.center ?? { x: 0, y: 0 }, width, height)
}
