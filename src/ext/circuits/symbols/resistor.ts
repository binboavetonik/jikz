import { point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { TwoTerminalSymbol, symbolSize } from '../ports'

/** Resistor drawing style: ANSI zigzag (US) or IEC rectangle (EU). */
export type ResistorVariant = 'ansi' | 'iec'

export interface ResistorOptions extends ShapeOptions {
  /** Drawing style. Default: 'ansi'. */
  variant?: ResistorVariant
}

export const RESISTOR_DEFAULT_WIDTH = 60
export const RESISTOR_DEFAULT_HEIGHT = 20

/** Zigzag/rect body occupies this fraction of the width; the rest is leads. */
const BODY_FRACTION = 0.6
/** Number of zigzag segments across the body (classic 3-peak form). */
const ZIGZAG_SEGMENTS = 6

/**
 * A two-terminal resistor symbol. Drawn horizontally; rotate with
 * `node({ rotate })` for vertical placement. Ports: `in` (west lead
 * tip), `out` (east lead tip).
 */
export class Resistor extends TwoTerminalSymbol {
  readonly type = 'resistor' as const
  readonly variant: ResistorVariant

  constructor(
    center: PointLike,
    width: number,
    height: number,
    variant: ResistorVariant = 'ansi'
  ) {
    super(center, width, height)
    this.variant = variant
  }

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const bodyW = this.width * BODY_FRACTION
    const x1 = cx - bodyW / 2
    const x2 = cx + bodyW / 2

    if (this.variant === 'iec') {
      const halfH = this.height / 2
      const top = cy - halfH
      const bottom = cy + halfH
      // Leads as separate subpaths; body is a closed rect (fillable).
      return [
        `M ${westX} ${cy} L ${x1} ${cy}`,
        `M ${x1} ${top} L ${x2} ${top} L ${x2} ${bottom} L ${x1} ${bottom} Z`,
        `M ${x2} ${cy} L ${eastX} ${cy}`,
      ].join(' ')
    }

    // ANSI zigzag: lead → 5 alternating peaks → lead, starting and
    // ending on the center line. Peak amplitude = half the height.
    const amp = this.height / 2
    const step = bodyW / ZIGZAG_SEGMENTS
    const parts = [`M ${westX} ${cy} L ${x1} ${cy}`]
    for (let i = 1; i < ZIGZAG_SEGMENTS; i++) {
      const x = x1 + i * step
      const y = cy + (i % 2 === 1 ? -amp : amp)
      parts.push(`L ${x} ${y}`)
    }
    parts.push(`L ${x2} ${cy} L ${eastX} ${cy}`)
    return parts.join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): Resistor {
    return new Resistor(center, width, height, this.variant)
  }
}

/**
 * Create a resistor symbol. Honors {@link symbolSize} (intrinsic 60×20
 * default; width/height override when larger than the minimums).
 */
export function resistor(options: ResistorOptions = {}): Resistor {
  const { width, height } = symbolSize(
    options,
    RESISTOR_DEFAULT_WIDTH,
    RESISTOR_DEFAULT_HEIGHT
  )
  return new Resistor(
    options.center ?? point(0, 0),
    width,
    height,
    options.variant ?? 'ansi'
  )
}
