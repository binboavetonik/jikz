import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'
import { degToRad } from '../../utils/math'

/**
 * Direction for double arrow shapes
 */
export type DoubleArrowDirection = 'horizontal' | 'vertical'

/**
 * Options specific to double arrow shape
 */
export interface DoubleArrowOptions extends ShapeOptions {
  /**
   * Angle of the arrow tips in degrees (default: 90)
   */
  tipAngle?: number

  /**
   * How far the heads extend beyond the body (default: 10)
   */
  headExtend?: number

  /**
   * Indent at the base of the heads (default: 0)
   */
  headIndent?: number

  /**
   * Direction of the arrow (default: 'horizontal')
   */
  direction?: DoubleArrowDirection
}

/**
 * A block arrow shape pointing in both directions
 *
 * Visual (direction: 'horizontal'):
 * ```
 *       +-----+
 *  <====|     |====>
 *       +-----+
 * ```
 *
 * Anchors: standard compass anchors plus `'tip1'` (west/north tip)
 * and `'tip2'` (east/south tip) via {@link customAnchor}.
 */
export class DoubleArrow extends AnchoredPolygon {
  readonly type = 'double arrow' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly tipAngle: number
  readonly headExtend: number
  readonly headIndent: number
  readonly direction: DoubleArrowDirection

  constructor(options: DoubleArrowOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.tipAngle = options.tipAngle ?? 90
    this.headExtend = options.headExtend ?? 10
    this.headIndent = options.headIndent ?? 0
    this.direction = options.direction ?? 'horizontal'

    // Fit the declared box exactly: heads flare INSIDE the box.
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Calculate the arrow head length based on tip angle and body height
   */
  private get headLength(): number {
    const halfAngle = this.tipAngle / 2
    const totalHalfHeight = this.isHorizontal ? this.height / 2 : this.width / 2
    return totalHalfHeight / Math.tan(degToRad(halfAngle))
  }

  private get isHorizontal(): boolean {
    return this.direction === 'horizontal'
  }

  /**
   * Half-extent of the body perpendicular to the arrow direction.
   * Heads flare from bodyHalf to the full box half-extent.
   */
  private get bodyHalfExtent(): number {
    const full = this.isHorizontal ? this.height / 2 : this.width / 2
    return Math.max(full - this.headExtend, full * 0.2)
  }

  /**
   * Get the vertices of the arrow shape
   */
  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    const headLen = this.headLength
    const extend = this.headExtend
    const indent = this.headIndent

    // Body half-width/height (perpendicular to arrow direction).
    // Head bases sit at bodyHalf + extend = the declared box edge.
    const bodyHalf = this.bodyHalfExtent

    let pts: Point[]

    if (this.isHorizontal) {
      // Horizontal double arrow: <====>
      pts = [
        // Left tip and head
        point(-hw, 0),                                    // left tip
        point(-hw + headLen + indent, -bodyHalf - extend), // top of left head
        point(-hw + headLen, -bodyHalf),                  // top-left of body
        // Right head and tip
        point(hw - headLen, -bodyHalf),                   // top-right of body
        point(hw - headLen - indent, -bodyHalf - extend), // top of right head
        point(hw, 0),                                     // right tip
        point(hw - headLen - indent, bodyHalf + extend),  // bottom of right head
        point(hw - headLen, bodyHalf),                    // bottom-right of body
        // Back to left
        point(-hw + headLen, bodyHalf),                   // bottom-left of body
        point(-hw + headLen + indent, bodyHalf + extend), // bottom of left head
      ]
    } else {
      // Vertical double arrow
      pts = [
        // Top tip and head
        point(0, -hh),                                    // top tip
        point(bodyHalf + extend, -hh + headLen + indent), // right of top head
        point(bodyHalf, -hh + headLen),                   // top-right of body
        // Bottom head and tip
        point(bodyHalf, hh - headLen),                    // bottom-right of body
        point(bodyHalf + extend, hh - headLen - indent),  // right of bottom head
        point(0, hh),                                     // bottom tip
        point(-bodyHalf - extend, hh - headLen - indent), // left of bottom head
        point(-bodyHalf, hh - headLen),                   // bottom-left of body
        // Back to top
        point(-bodyHalf, -hh + headLen),                  // top-left of body
        point(-bodyHalf - extend, -hh + headLen + indent), // left of top head
      ]
    }

    return pts.map(p => p.add(this.center))
  }

  /**
   * Get the first tip point (west for horizontal, north for vertical)
   */
  get tip1(): Point {
    const hw = this.width / 2
    const hh = this.height / 2
    return this.isHorizontal
      ? this.center.add(-hw, 0)
      : this.center.add(0, -hh)
  }

  /**
   * Get the second tip point (east for horizontal, south for vertical)
   */
  get tip2(): Point {
    const hw = this.width / 2
    const hh = this.height / 2
    return this.isHorizontal
      ? this.center.add(hw, 0)
      : this.center.add(0, hh)
  }

  protected customAnchor(normalized: string): Point | null {
    switch (normalized) {
      case 'tip1':
        return this.tip1
      case 'tip2':
        return this.tip2
    }
    return null
  }

  moveTo(center: PointLike): DoubleArrow {
    return new DoubleArrow({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      tipAngle: this.tipAngle,
      headExtend: this.headExtend,
      headIndent: this.headIndent,
      direction: this.direction,
    })
  }

  resize(width: number, height: number): DoubleArrow {
    return new DoubleArrow({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      tipAngle: this.tipAngle,
      headExtend: this.headExtend,
      headIndent: this.headIndent,
      direction: this.direction,
    })
  }

  toString(): string {
    return `DoubleArrow(${this.center}, ${this.width}x${this.height}, dir=${this.direction})`
  }
}

/**
 * Create a double arrow shape
 */
export function doubleArrow(options?: DoubleArrowOptions): DoubleArrow {
  return new DoubleArrow(options)
}
