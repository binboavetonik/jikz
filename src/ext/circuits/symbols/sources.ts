import { point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import { circle } from '../../../geometry/Circle'
import type { ShapeOptions } from '../../../geometry/Shape'
import { intrinsicSize } from '../../../geometry/PortedShape'
import { TwoTerminalSymbol } from '../ports'

/** Voltage/current source symbol options. */
export type SourceOptions = ShapeOptions

/** Intrinsic symbol width when no width is given. */
export const SOURCE_DEFAULT_WIDTH = 60
/** Intrinsic symbol height when no height is given. */
export const SOURCE_DEFAULT_HEIGHT = 36

/**
 * Independent voltage source: circle with +/− markings and leads.
 * `+` is toward north (top) when horizontal — rotate 90° for a
 * vertical branch with `+` on the right. Ports: `in` (west lead tip),
 * `out` (east lead tip).
 */
export class VoltageSource extends TwoTerminalSymbol {
  readonly type = 'voltage source' as const

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const r = this.height / 2

    const s = r * 0.35 // half-size of the +/− glyphs
    const py = cy - r * 0.45 // + glyph center y
    const my = cy + r * 0.45 // − glyph center y

    return [
      `M ${westX} ${cy} L ${cx - r} ${cy}`,
      circle(point(cx, cy), r).toSVGPath(),
      `M ${cx + r} ${cy} L ${eastX} ${cy}`,
      // plus
      `M ${cx - s} ${py} L ${cx + s} ${py} M ${cx} ${py - s} L ${cx} ${py + s}`,
      // minus
      `M ${cx - s} ${my} L ${cx + s} ${my}`,
    ].join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): VoltageSource {
    return new VoltageSource(center, width, height)
  }
}

/**
 * Independent current source: circle with an internal arrow pointing
 * north (IEC style — rotate the node to aim it along the branch).
 * Ports: `in` (west lead tip), `out` (east lead tip).
 */
export class CurrentSource extends TwoTerminalSymbol {
  readonly type = 'current source' as const

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const r = this.height / 2

    const ay = r * 0.55 // arrow shaft half-length
    const ah = r * 0.25 // arrowhead half-width

    return [
      `M ${westX} ${cy} L ${cx - r} ${cy}`,
      circle(point(cx, cy), r).toSVGPath(),
      `M ${cx + r} ${cy} L ${eastX} ${cy}`,
      // arrow shaft (pointing up)
      `M ${cx} ${cy + ay} L ${cx} ${cy - ay}`,
      // arrowhead
      `M ${cx - ah} ${cy - ay + ah * 1.6} L ${cx} ${cy - ay} L ${cx + ah} ${cy - ay + ah * 1.6}`,
    ].join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): CurrentSource {
    return new CurrentSource(center, width, height)
  }
}

/** Create a voltage source symbol (intrinsic 60×36 default). */
export function voltageSource(options: SourceOptions = {}): VoltageSource {
  const { width, height } = intrinsicSize(
    options,
    SOURCE_DEFAULT_WIDTH,
    SOURCE_DEFAULT_HEIGHT
  )
  return new VoltageSource(options.center ?? { x: 0, y: 0 }, width, height)
}

/** Create a current source symbol (intrinsic 60×36 default). */
export function currentSource(options: SourceOptions = {}): CurrentSource {
  const { width, height } = intrinsicSize(
    options,
    SOURCE_DEFAULT_WIDTH,
    SOURCE_DEFAULT_HEIGHT
  )
  return new CurrentSource(options.center ?? { x: 0, y: 0 }, width, height)
}
