import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to cross out shape
 */
export interface CrossOutOptions extends ShapeOptions {
  /**
   * Line width of the cross (default: 2)
   */
  lineWidth?: number
}

/**
 * A cross-out mark (X through a rectangle)
 * Used to indicate deletion or cancellation
 *
 * Visual:
 * ```
 *  \       /
 *   \     /
 *    \   /
 *     \ /
 *      X
 *     / \
 *    /   \
 *   /     \
 *  /       \
 * ```
 */
export class CrossOut implements Shape {
  readonly type = 'cross out' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly lineWidth: number

  constructor(options: CrossOutOptions = {}) {
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
    // Point is "inside" if it's near either diagonal line
    const hw = this.width / 2
    const hh = this.height / 2
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y

    // Check bounding box first
    if (Math.abs(dx) > hw || Math.abs(dy) > hh) return false

    // Check distance to diagonals
    // Diagonal 1: from (-hw, -hh) to (hw, hh)
    // Diagonal 2: from (hw, -hh) to (-hw, hh)
    const slope1 = hh / hw
    const slope2 = -hh / hw

    const dist1 = Math.abs(dy - slope1 * dx) / Math.sqrt(1 + slope1 * slope1)
    const dist2 = Math.abs(dy - slope2 * dx) / Math.sqrt(1 + slope2 * slope2)

    return dist1 <= this.lineWidth || dist2 <= this.lineWidth
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

  moveTo(center: PointLike): CrossOut {
    return new CrossOut({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      lineWidth: this.lineWidth,
    })
  }

  resize(width: number, height: number): CrossOut {
    return new CrossOut({
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
    const hh = this.height / 2
    const cx = this.center.x
    const cy = this.center.y

    // Two diagonal lines forming an X
    return `M ${cx - hw} ${cy - hh} L ${cx + hw} ${cy + hh} ` +
           `M ${cx + hw} ${cy - hh} L ${cx - hw} ${cy + hh}`
  }

  toString(): string {
    return `CrossOut(${this.center}, ${this.width}x${this.height})`
  }
}

/**
 * Create a cross out shape
 */
export function crossOut(options?: CrossOutOptions): CrossOut {
  return new CrossOut(options)
}
