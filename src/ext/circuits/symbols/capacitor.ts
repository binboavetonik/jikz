import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { TwoTerminalSymbol, symbolSize } from '../ports'

/** Capacitor drawing style: two straight plates, or one curved (polarized). */
export type CapacitorVariant = 'normal' | 'polarized'

export interface CapacitorOptions extends ShapeOptions {
  /** Default: 'normal'. */
  variant?: CapacitorVariant
}

export const CAPACITOR_DEFAULT_WIDTH = 60
export const CAPACITOR_DEFAULT_HEIGHT = 20

/** Gap between the plates, px. */
const PLATE_GAP = 6

/**
 * Two-terminal capacitor: leads + two parallel plates. Ports: `in`
 * (west lead tip), `out` (east lead tip). The `polarized` variant draws
 * the cathode plate curved (electrolytic convention).
 */
export class Capacitor extends TwoTerminalSymbol {
  readonly type = 'capacitor' as const
  readonly variant: CapacitorVariant

  constructor(
    center: PointLike,
    width: number,
    height: number,
    variant: CapacitorVariant = 'normal'
  ) {
    super(center, width, height)
    this.variant = variant
  }

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const x1 = cx - PLATE_GAP / 2
    const x2 = cx + PLATE_GAP / 2
    const halfPlate = (this.height * 0.9) / 2
    const top = cy - halfPlate
    const bottom = cy + halfPlate

    const parts = [`M ${westX} ${cy} L ${x1} ${cy}`, `M ${x1} ${top} L ${x1} ${bottom}`]

    if (this.variant === 'polarized') {
      // Cathode plate curves away from the dielectric (bulges east).
      const bulge = PLATE_GAP * 1.5
      parts.push(`M ${x2} ${top} A ${bulge} ${halfPlate} 0 0 1 ${x2} ${bottom}`)
    } else {
      parts.push(`M ${x2} ${top} L ${x2} ${bottom}`)
    }

    parts.push(`M ${x2} ${cy} L ${eastX} ${cy}`)
    return parts.join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): Capacitor {
    return new Capacitor(center, width, height, this.variant)
  }
}

/** Create a capacitor symbol (intrinsic 60×20 default). */
export function capacitor(options: CapacitorOptions = {}): Capacitor {
  const { width, height } = symbolSize(
    options,
    CAPACITOR_DEFAULT_WIDTH,
    CAPACITOR_DEFAULT_HEIGHT
  )
  return new Capacitor(
    options.center ?? { x: 0, y: 0 },
    width,
    height,
    options.variant ?? 'normal'
  )
}
