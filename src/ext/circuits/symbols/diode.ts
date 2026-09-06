import { Point, point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { TwoTerminalSymbol, symbolSize } from '../ports'

/** Diode family: standard, Zener (hooked cathode bar), LED (light arrows). */
export type DiodeVariant = 'standard' | 'zener' | 'led'

export interface DiodeOptions extends ShapeOptions {
  /** Default: 'standard'. */
  variant?: DiodeVariant
}

export const DIODE_DEFAULT_WIDTH = 60
export const DIODE_DEFAULT_HEIGHT = 20

/** Triangle body occupies this fraction of the width. */
const BODY_FRACTION = 0.3

/**
 * Two-terminal diode: triangle anode → cathode bar, with leads.
 * Conduction direction is west → east (anode `in`, cathode `out`).
 * Ports: `in` (anode lead tip), `out` (cathode lead tip).
 */
export class Diode extends TwoTerminalSymbol {
  readonly type = 'diode' as const
  readonly variant: DiodeVariant

  constructor(
    center: PointLike,
    width: number,
    height: number,
    variant: DiodeVariant = 'standard'
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
    const halfH = (this.height * 0.9) / 2
    const top = cy - halfH
    const bottom = cy + halfH

    const parts = [
      `M ${westX} ${cy} L ${x1} ${cy}`,
      // Anode triangle (closed, fillable) pointing east.
      `M ${x1} ${top} L ${x1} ${bottom} L ${x2} ${cy} Z`,
    ]

    // Cathode bar.
    if (this.variant === 'zener') {
      // Bar with bent tips (Zener "Z" hooks).
      const hook = halfH * 0.4
      parts.push(
        `M ${x2 + hook} ${top + hook} L ${x2} ${top} L ${x2} ${bottom} L ${x2 - hook} ${bottom - hook}`
      )
    } else {
      parts.push(`M ${x2} ${top} L ${x2} ${bottom}`)
    }

    parts.push(`M ${x2} ${cy} L ${eastX} ${cy}`)

    if (this.variant === 'led') {
      // Two light arrows escaping north-east of the triangle.
      parts.push(ledArrow(point(cx - 2, top - 2), 9))
      parts.push(ledArrow(point(cx + 6, top - 2), 9))
    }

    return parts.join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): Diode {
    return new Diode(center, width, height, this.variant)
  }
}

/** Small NE-pointing arrow (shaft + two barbs), length ≈ len. */
function ledArrow(from: Point, len: number): string {
  const dx = len * 0.7
  const dy = -len * 0.7
  const tx = from.x + dx
  const ty = from.y + dy
  const barb = len * 0.35
  return [
    `M ${from.x} ${from.y} L ${tx} ${ty}`,
    `M ${tx - barb} ${ty} L ${tx} ${ty} L ${tx} ${ty + barb}`,
  ].join(' ')
}

/** Create a diode symbol (intrinsic 60×20 default). */
export function diode(options: DiodeOptions = {}): Diode {
  const { width, height } = symbolSize(
    options,
    DIODE_DEFAULT_WIDTH,
    DIODE_DEFAULT_HEIGHT
  )
  return new Diode(
    options.center ?? { x: 0, y: 0 },
    width,
    height,
    options.variant ?? 'standard'
  )
}
