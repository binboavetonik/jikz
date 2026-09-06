import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to strike out shape
 */
export interface StrikeOutOptions extends ShapeOptions {
  /**
   * Line width of the strike (default: 2)
   */
  lineWidth?: number
}

/**
 * A strike-out mark (single horizontal line through)
 * Used to indicate deletion
 *
 * Visual:
 * ```
 *  +---------+
 *  |         |
 *  |---------|
 *  |         |
 *  +---------+
 * ```
 */
export class StrikeOut implements Shape {
  readonly type = 'strike out' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly lineWidth: number

  constructor(options: StrikeOutOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.lineWidth = options.lineWidth ?? 2

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const hw = this.width / 2
      const hh = this.height / 2

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          return point(this.center.x, this.center.y - hh - sep)
        case 'south':
        case 's':
          return point(this.center.x, this.center.y + hh + sep)
        case 'east':
        case 'e':
          return point(this.center.x + hw + sep, this.center.y)
        case 'west':
        case 'w':
          return point(this.center.x - hw - sep, this.center.y)
        case 'north east':
        case 'ne':
          return point(this.center.x + hw + sep * 0.7, this.center.y - hh - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(this.center.x - hw - sep * 0.7, this.center.y - hh - sep * 0.7)
        case 'south east':
        case 'se':
          return point(this.center.x + hw + sep * 0.7, this.center.y + hh + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(this.center.x - hw - sep * 0.7, this.center.y + hh + sep * 0.7)
        case 'line start':
          return point(this.center.x - hw, this.center.y)
        case 'line end':
          return point(this.center.x + hw, this.center.y)
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle)
    const hw = this.width / 2
    const hh = this.height / 2

    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // Find intersection with bounding rectangle
    let t = Infinity

    if (Math.abs(cos) > 1e-10) {
      const tx = (cos > 0 ? hw : -hw) / cos
      if (tx > 0) t = Math.min(t, tx)
    }
    if (Math.abs(sin) > 1e-10) {
      const ty = (sin > 0 ? hh : -hh) / sin
      if (ty > 0) t = Math.min(t, ty)
    }

    return point(this.center.x + t * cos, this.center.y + t * sin)
  }

  get north(): Point { return this.anchor('north') }
  get south(): Point { return this.anchor('south') }
  get east(): Point { return this.anchor('east') }
  get west(): Point { return this.anchor('west') }
  get northEast(): Point { return this.anchor('north east') }
  get northWest(): Point { return this.anchor('north west') }
  get southEast(): Point { return this.anchor('south east') }
  get southWest(): Point { return this.anchor('south west') }

  contains(p: PointLike): boolean {
    const hw = this.width / 2
    const hh = this.height / 2
    const dx = Math.abs(p.x - this.center.x)
    const dy = Math.abs(p.y - this.center.y)

    // Check if on the horizontal line
    if (dx <= hw && dy <= this.lineWidth / 2) return true

    // Check bounding box
    return dx <= hw && dy <= hh
  }

  get bounds(): [number, number, number, number] {
    const hw = this.width / 2
    const hh = this.height / 2
    return [
      this.center.x - hw,
      this.center.y - hh,
      this.center.x + hw,
      this.center.y + hh,
    ]
  }

  moveTo(center: PointLike): StrikeOut {
    return new StrikeOut({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      lineWidth: this.lineWidth,
    })
  }

  resize(width: number, height: number): StrikeOut {
    return new StrikeOut({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      lineWidth: this.lineWidth,
    })
  }

  toSVGPath(): string {
    const hw = this.width / 2
    const cx = this.center.x
    const cy = this.center.y

    // Single horizontal line through center
    return `M ${cx - hw} ${cy} L ${cx + hw} ${cy}`
  }

  toString(): string {
    return `StrikeOut(${this.center}, ${this.width}x${this.height})`
  }
}

/**
 * Create a strike out shape
 */
export function strikeOut(options?: StrikeOutOptions): StrikeOut {
  return new StrikeOut(options)
}
