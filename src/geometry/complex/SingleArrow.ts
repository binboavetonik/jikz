import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'
import { degToRad } from '../../utils/math'

/**
 * Direction for arrow shapes
 */
export type ArrowDirection = 'east' | 'west' | 'north' | 'south'

/**
 * Options specific to single arrow shape
 */
export interface SingleArrowOptions extends ShapeOptions {
  /**
   * Angle of the arrow tip in degrees (default: 90)
   */
  tipAngle?: number

  /**
   * How far the head extends beyond the body (default: 10)
   */
  headExtend?: number

  /**
   * Indent at the base of the head (default: 0)
   */
  headIndent?: number

  /**
   * Direction the arrow points (default: 'east')
   */
  direction?: ArrowDirection
}

/**
 * A block arrow shape pointing in one direction
 *
 * Visual (direction: 'east'):
 * ```
 *     +-----+
 *     |     |=====>
 *     +-----+
 * ```
 *
 * Anchors: standard compass anchors plus `'tip'` and `'tail'` via
 * {@link customAnchor}.
 */
export class SingleArrow extends AnchoredPolygon {
  readonly type = 'single arrow' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly tipAngle: number
  readonly headExtend: number
  readonly headIndent: number
  readonly direction: ArrowDirection

  constructor(options: SingleArrowOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.tipAngle = options.tipAngle ?? 90
    this.headExtend = options.headExtend ?? 10
    this.headIndent = options.headIndent ?? 0
    this.direction = options.direction ?? 'east'

    // Fit the declared box exactly: the head flares INSIDE the box,
    // so the body is narrowed by headExtend rather than the head
    // extending past it.
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
    return this.direction === 'east' || this.direction === 'west'
  }

  /**
   * Half-extent of the body perpendicular to the arrow direction.
   * The head flares from bodyHalf to the full box half-extent.
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
    // Head base sits at bodyHalf + extend = the declared box edge.
    const bodyHalf = this.bodyHalfExtent

    let pts: Point[]

    switch (this.direction) {
      case 'east':
        pts = [
          point(-hw, -bodyHalf),                          // top-left of body
          point(hw - headLen, -bodyHalf),                 // top-right of body
          point(hw - headLen - indent, -bodyHalf - extend), // top of head base
          point(hw, 0),                                   // tip
          point(hw - headLen - indent, bodyHalf + extend),  // bottom of head base
          point(hw - headLen, bodyHalf),                  // bottom-right of body
          point(-hw, bodyHalf),                           // bottom-left of body
        ]
        break
      case 'west':
        pts = [
          point(hw, -bodyHalf),                           // top-right of body
          point(-hw + headLen, -bodyHalf),                // top-left of body
          point(-hw + headLen + indent, -bodyHalf - extend), // top of head base
          point(-hw, 0),                                  // tip
          point(-hw + headLen + indent, bodyHalf + extend),  // bottom of head base
          point(-hw + headLen, bodyHalf),                 // bottom-left of body
          point(hw, bodyHalf),                            // bottom-right of body
        ]
        break
      case 'north':
        pts = [
          point(-bodyHalf, hh),                           // bottom-left of body
          point(-bodyHalf, -hh + headLen),                // top-left of body
          point(-bodyHalf - extend, -hh + headLen + indent), // left of head base
          point(0, -hh),                                  // tip
          point(bodyHalf + extend, -hh + headLen + indent),  // right of head base
          point(bodyHalf, -hh + headLen),                 // top-right of body
          point(bodyHalf, hh),                            // bottom-right of body
        ]
        break
      case 'south':
        pts = [
          point(-bodyHalf, -hh),                          // top-left of body
          point(-bodyHalf, hh - headLen),                 // bottom-left of body
          point(-bodyHalf - extend, hh - headLen - indent),  // left of head base
          point(0, hh),                                   // tip
          point(bodyHalf + extend, hh - headLen - indent),   // right of head base
          point(bodyHalf, hh - headLen),                  // bottom-right of body
          point(bodyHalf, -hh),                           // top-right of body
        ]
        break
    }

    return pts.map(p => p.add(this.center))
  }

  /**
   * Get the tip point of the arrow
   */
  get tip(): Point {
    const hw = this.width / 2
    const hh = this.height / 2
    switch (this.direction) {
      case 'east': return this.center.add(hw, 0)
      case 'west': return this.center.add(-hw, 0)
      case 'north': return this.center.add(0, -hh)
      case 'south': return this.center.add(0, hh)
    }
  }

  /**
   * Get the tail center point of the arrow
   */
  get tail(): Point {
    const hw = this.width / 2
    const hh = this.height / 2
    switch (this.direction) {
      case 'east': return this.center.add(-hw, 0)
      case 'west': return this.center.add(hw, 0)
      case 'north': return this.center.add(0, hh)
      case 'south': return this.center.add(0, -hh)
    }
  }

  protected customAnchor(normalized: string): Point | null {
    switch (normalized) {
      case 'tip':
        return this.tip
      case 'tail':
        return this.tail
    }
    return null
  }

  moveTo(center: PointLike): SingleArrow {
    return new SingleArrow({
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

  resize(width: number, height: number): SingleArrow {
    return new SingleArrow({
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
    return `SingleArrow(${this.center}, ${this.width}x${this.height}, dir=${this.direction})`
  }
}

/**
 * Create a single arrow shape
 */
export function singleArrow(options?: SingleArrowOptions): SingleArrow {
  return new SingleArrow(options)
}
