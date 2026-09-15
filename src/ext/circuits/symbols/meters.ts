import { point } from '../../../core/Point'
import type { PointLike } from '../../../core/types'
import { circle } from '../../../geometry/Circle'
import type { ShapeOptions } from '../../../geometry/Shape'
import { intrinsicSize } from '../../../geometry/PortedShape'
import { TwoTerminalSymbol } from '../ports'

/** Which meter — the letter inside the circle. */
export type MeterVariant = 'ammeter' | 'voltmeter' | 'ohmmeter'

/** Meter symbol options. */
export interface MeterOptions extends ShapeOptions {
  variant?: MeterVariant
}

/** Intrinsic symbol width when no width is given. */
export const METER_DEFAULT_WIDTH = 60
/** Intrinsic symbol height when no height is given. */
export const METER_DEFAULT_HEIGHT = 36

/**
 * Meters — jikz's `circuit ee IEC amperemeter`, `voltmeter` and
 * `ohmmeter`. A circle in the branch with A, V or Ω inside.
 *
 * The letter is **stroked as part of the symbol**, not set as node
 * text. Two reasons: a meter is the same symbol whatever font the
 * picture uses, and `ext/circuits` symbols opt out of text
 * auto-sizing, so a text glyph would be the one part of the drawing
 * that did not scale with `width`/`height`.
 *
 * Ports: `in` (west lead tip), `out` (east lead tip).
 */
export class Meter extends TwoTerminalSymbol {
  readonly type = 'meter' as const
  readonly variant: MeterVariant

  constructor(center: PointLike, width: number, height: number, variant: MeterVariant = 'ammeter') {
    super(center, width, height)
    this.variant = variant
  }

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const r = this.height / 2

    return [
      `M ${cx - this.width / 2} ${cy} L ${cx - r} ${cy}`,
      circle(point(cx, cy), r).toSVGPath(),
      `M ${cx + r} ${cy} L ${cx + this.width / 2} ${cy}`,
      glyph(this.variant, cx, cy, r),
    ].join(' ')
  }

  protected recreate(center: PointLike, width: number, height: number): Meter {
    return new Meter(center, width, height, this.variant)
  }
}

/** The letter, stroked to fit inside a circle of radius `r`. */
function glyph(variant: MeterVariant, cx: number, cy: number, r: number): string {
  const w = r * 0.5 // half-width
  const h = r * 0.55 // half-height
  const n = (v: number) => Math.round(v * 1e6) / 1e6

  if (variant === 'ammeter') {
    // Apex up, with the crossbar low, as in the IEC glyph.
    return [
      `M ${n(cx - w)} ${n(cy + h)} L ${n(cx)} ${n(cy - h)} L ${n(cx + w)} ${n(cy + h)}`,
      `M ${n(cx - w * 0.52)} ${n(cy + h * 0.28)} L ${n(cx + w * 0.52)} ${n(cy + h * 0.28)}`,
    ].join(' ')
  }

  if (variant === 'voltmeter') {
    return `M ${n(cx - w)} ${n(cy - h)} L ${n(cx)} ${n(cy + h)} L ${n(cx + w)} ${n(cy - h)}`
  }

  // Ω: a near-closed ring opening at the bottom, with two feet. The
  // arc runs from the lower-right foot anticlockwise over the top to
  // the lower-left — screen space, so 270° is north.
  const rr = h * 0.78
  const ax = n(cx + rr * Math.cos((60 * Math.PI) / 180))
  const ay = n(cy + rr * Math.sin((60 * Math.PI) / 180))
  const bx = n(cx + rr * Math.cos((120 * Math.PI) / 180))
  const by = n(cy + rr * Math.sin((120 * Math.PI) / 180))
  const foot = rr * 0.55
  return [
    `M ${ax} ${ay} A ${n(rr)} ${n(rr)} 0 1 0 ${bx} ${by}`,
    `M ${ax} ${ay} L ${n(ax + foot)} ${ay}`,
    `M ${bx} ${by} L ${n(bx - foot)} ${by}`,
  ].join(' ')
}

/** Create a meter symbol (intrinsic 60×36 default, ammeter). */
export function meter(options: MeterOptions = {}): Meter {
  const { width, height } = intrinsicSize(options, METER_DEFAULT_WIDTH, METER_DEFAULT_HEIGHT)
  return new Meter(options.center ?? { x: 0, y: 0 }, width, height, options.variant ?? 'ammeter')
}
