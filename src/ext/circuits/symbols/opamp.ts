import { Point, point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { CircuitSymbol, symbolSize } from '../ports'

export type OpAmpOptions = ShapeOptions

export const OPAMP_DEFAULT_WIDTH = 60
export const OPAMP_DEFAULT_HEIGHT = 50

/** Triangle body occupies this fraction of the width. */
const BODY_FRACTION = 2 / 3
/** Input pin offset from the center line, as a fraction of height. */
const PIN_OFFSET_FRACTION = 0.32

/**
 * Operational amplifier: triangle pointing east with two input pins on
 * the flat (west) side and the output at the east apex.
 *
 * Ports: `in-` / `-` (upper input), `in+` / `+` (lower input),
 * `out` (east apex lead tip). Input leads run from the west box edge
 * to the triangle's flat side; the output lead runs apex → east edge.
 * This is the multi-port validation of the CircuitSymbol port table:
 * non-compass names on the border, typo'd names throw AnchorError.
 */
export class OpAmp extends CircuitSymbol {
  readonly type = 'op amp' as const

  private get pinOffset(): number {
    return this.height * PIN_OFFSET_FRACTION
  }

  /** West edge of the triangle body (flat side x). */
  private get bodyWestX(): number {
    return this.center.x - (this.width * BODY_FRACTION) / 2
  }

  protected portTable(): Record<string, Point> {
    const westX = this.center.x - this.width / 2
    const eastX = this.center.x + this.width / 2
    const cy = this.center.y
    const minus = point(westX, cy - this.pinOffset)
    const plus = point(westX, cy + this.pinOffset)
    const out = point(eastX, cy)
    return {
      'in-': minus,
      '-': minus,
      'in+': plus,
      '+': plus,
      out,
    }
  }

  /** Inverting input (−) lead tip — typed form of `anchor('-')`. */
  get minus(): Point {
    return this.anchor('-')
  }

  /** Non-inverting input (+) lead tip — typed form of `anchor('+')`. */
  get plus(): Point {
    return this.anchor('+')
  }

  /** Output lead tip — typed form of `anchor('out')`. */
  get out(): Point {
    return this.anchor('out')
  }

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const x1 = this.bodyWestX
    const x2 = cx + (this.width * BODY_FRACTION) / 2
    const halfBody = this.height / 2
    const top = cy - halfBody
    const bottom = cy + halfBody
    const pinUp = cy - this.pinOffset
    const pinDown = cy + this.pinOffset

    // +/− glyphs just inside the flat side.
    const gx = x1 + 6
    const gs = 3.5

    return [
      // input leads
      `M ${westX} ${pinUp} L ${x1} ${pinUp}`,
      `M ${westX} ${pinDown} L ${x1} ${pinDown}`,
      // triangle body
      `M ${x1} ${top} L ${x1} ${bottom} L ${x2} ${cy} Z`,
      // output lead
      `M ${x2} ${cy} L ${eastX} ${cy}`,
      // − glyph (upper input)
      `M ${gx - gs} ${pinUp} L ${gx + gs} ${pinUp}`,
      // + glyph (lower input)
      `M ${gx - gs} ${pinDown} L ${gx + gs} ${pinDown} M ${gx} ${pinDown - gs} L ${gx} ${pinDown + gs}`,
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): OpAmp {
    return new OpAmp(center, width, height)
  }
}

/** Create an op-amp symbol (intrinsic 60×50 default). */
export function opAmp(options: OpAmpOptions = {}): OpAmp {
  const { width, height } = symbolSize(
    options,
    OPAMP_DEFAULT_WIDTH,
    OPAMP_DEFAULT_HEIGHT
  )
  return new OpAmp(options.center ?? { x: 0, y: 0 }, width, height)
}
