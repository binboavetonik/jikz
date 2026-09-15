import { point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import { circle } from '../../../geometry/Circle'
import type { ShapeOptions } from '../../../geometry/Shape'
import { intrinsicSize } from '../../../geometry/PortedShape'
import { TwoTerminalSymbol } from '../ports'

/** AC/DC source symbol options. */
export type SupplyOptions = ShapeOptions

/** Intrinsic symbol width when no width is given. */
export const SUPPLY_DEFAULT_WIDTH = 60
/** Intrinsic symbol height when no height is given. */
export const SUPPLY_DEFAULT_HEIGHT = 36

const n = (v: number): number => Math.round(v * 1e6) / 1e6

/**
 * AC supply — jikz's `circuit ee IEC ac source`. A circle with one
 * full sine period across it. Ports: `in` (west lead tip), `out`
 * (east lead tip).
 */
export class AcSource extends TwoTerminalSymbol {
  readonly type = 'ac source' as const

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const r = this.height / 2
    const a = r * 0.6 // half the wave's horizontal extent
    const b = r * 0.55 // wave amplitude, as a control-point offset

    return [
      `M ${cx - this.width / 2} ${cy} L ${cx - r} ${cy}`,
      circle(point(cx, cy), r).toSVGPath(),
      `M ${cx + r} ${cy} L ${cx + this.width / 2} ${cy}`,
      // One period: up over the first half, down over the second.
      `M ${n(cx - a)} ${cy}` +
        ` C ${n(cx - a / 2)} ${n(cy - b * 1.6)}, ${n(cx - a / 2)} ${n(cy - b * 1.6)}, ${cx} ${cy}` +
        ` C ${n(cx + a / 2)} ${n(cy + b * 1.6)}, ${n(cx + a / 2)} ${n(cy + b * 1.6)}, ${n(cx + a)} ${cy}`,
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): AcSource {
    return new AcSource(center, width, height)
  }
}

/**
 * DC supply — jikz's `circuit ee IEC dc source`. A circle carrying the
 * IEC direct-current mark: a solid line over a broken one. Ports: `in`
 * (west lead tip), `out` (east lead tip).
 */
export class DcSource extends TwoTerminalSymbol {
  readonly type = 'dc source' as const

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const r = this.height / 2
    const a = r * 0.55 // half-width of the marks
    const gap = r * 0.28 // vertical offset from centre

    // The broken line is drawn as three dashes rather than with
    // stroke-dasharray, because a symbol is one path and one stroke —
    // a dash pattern would apply to the leads and circle too.
    const dash = (a * 2) / 5
    const lower = cy + gap
    return [
      `M ${cx - this.width / 2} ${cy} L ${cx - r} ${cy}`,
      circle(point(cx, cy), r).toSVGPath(),
      `M ${cx + r} ${cy} L ${cx + this.width / 2} ${cy}`,
      `M ${n(cx - a)} ${n(cy - gap)} L ${n(cx + a)} ${n(cy - gap)}`,
      `M ${n(cx - a)} ${n(lower)} L ${n(cx - a + dash)} ${n(lower)}`,
      `M ${n(cx - dash / 2)} ${n(lower)} L ${n(cx + dash / 2)} ${n(lower)}`,
      `M ${n(cx + a - dash)} ${n(lower)} L ${n(cx + a)} ${n(lower)}`,
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): DcSource {
    return new DcSource(center, width, height)
  }
}

/** Create an AC supply symbol (intrinsic 60×36 default). */
export function acSource(options: SupplyOptions = {}): AcSource {
  const { width, height } = intrinsicSize(options, SUPPLY_DEFAULT_WIDTH, SUPPLY_DEFAULT_HEIGHT)
  return new AcSource(options.center ?? { x: 0, y: 0 }, width, height)
}

/** Create a DC supply symbol (intrinsic 60×36 default). */
export function dcSource(options: SupplyOptions = {}): DcSource {
  const { width, height } = intrinsicSize(options, SUPPLY_DEFAULT_WIDTH, SUPPLY_DEFAULT_HEIGHT)
  return new DcSource(options.center ?? { x: 0, y: 0 }, width, height)
}
