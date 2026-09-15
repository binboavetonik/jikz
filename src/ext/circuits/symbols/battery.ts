import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { intrinsicSize } from '../../../geometry/PortedShape'
import { TwoTerminalSymbol } from '../ports'

/** Battery cell count — TikZ draws one cell, two is the common idiom. */
export type BatteryVariant = 'single' | 'multi'

/** Battery symbol options. */
export interface BatteryOptions extends ShapeOptions {
  variant?: BatteryVariant
}

/** Intrinsic symbol width when no width is given. */
export const BATTERY_DEFAULT_WIDTH = 60
/** Intrinsic symbol height when no height is given. */
export const BATTERY_DEFAULT_HEIGHT = 36

const PLATE_GAP = 6

/**
 * Battery — jikz's `circuit ee IEC battery`. Alternating long and
 * short plates: long is the positive terminal, short the negative, so
 * `out` (east) is positive in the default orientation.
 *
 * `variant: 'multi'` draws two cells, the usual way of saying "a
 * battery" rather than "a cell". Ports: `in` (west lead tip), `out`
 * (east lead tip).
 */
export class Battery extends TwoTerminalSymbol {
  readonly type = 'battery' as const
  readonly variant: BatteryVariant

  constructor(center: PointLike, width: number, height: number, variant: BatteryVariant = 'multi') {
    super(center, width, height)
    this.variant = variant
  }

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const long = (this.height * 0.9) / 2
    const short = long * 0.48

    // Plates run short, long, short, long … so the east-most plate is
    // long and `out` reads as the positive terminal.
    const cells = this.variant === 'multi' ? 2 : 1
    const plates = cells * 2
    const span = (plates - 1) * PLATE_GAP
    const x0 = cx - span / 2

    const parts: string[] = []
    for (let i = 0; i < plates; i++) {
      const x = x0 + i * PLATE_GAP
      const h = i % 2 === 0 ? short : long
      parts.push(`M ${x} ${cy - h} L ${x} ${cy + h}`)
    }

    return [
      `M ${cx - this.width / 2} ${cy} L ${x0} ${cy}`,
      ...parts,
      `M ${x0 + span} ${cy} L ${cx + this.width / 2} ${cy}`,
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): Battery {
    return new Battery(center, width, height, this.variant)
  }
}

/** Create a battery symbol (intrinsic 60×36 default). */
export function battery(options: BatteryOptions = {}): Battery {
  const { width, height } = intrinsicSize(options, BATTERY_DEFAULT_WIDTH, BATTERY_DEFAULT_HEIGHT)
  return new Battery(options.center ?? { x: 0, y: 0 }, width, height, options.variant ?? 'multi')
}
