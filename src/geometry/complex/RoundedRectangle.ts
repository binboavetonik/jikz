import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to rounded rectangle shape
 */
export interface RoundedRectangleOptions extends ShapeOptions {
  /**
   * Corner radius (default: 8)
   */
  cornerRadius?: number
}

/**
 * A rectangle with rounded corners
 *
 * Visual:
 * ```
 *  .-------.
 * |         |
 * |         |
 *  '-------'
 * ```
 */
export class RoundedRectangle implements Shape {
  readonly type = 'rounded rectangle' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly cornerRadius: number

  constructor(options: RoundedRectangleOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)

    // Corner radius shouldn't exceed half of the smaller dimension
    const maxRadius = Math.min(this.width, this.height) / 2
    this.cornerRadius = Math.min(options.cornerRadius ?? 8, maxRadius)
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
        case 'ne': {
          const r = this.cornerRadius
          const cx = this.center.x + hw - r
          const cy = this.center.y - hh + r
          return point(cx + r * 0.707 + sep * 0.7, cy - r * 0.707 - sep * 0.7)
        }
        case 'north west':
        case 'nw': {
          const r = this.cornerRadius
          const cx = this.center.x - hw + r
          const cy = this.center.y - hh + r
          return point(cx - r * 0.707 - sep * 0.7, cy - r * 0.707 - sep * 0.7)
        }
        case 'south east':
        case 'se': {
          const r = this.cornerRadius
          const cx = this.center.x + hw - r
          const cy = this.center.y + hh - r
          return point(cx + r * 0.707 + sep * 0.7, cy + r * 0.707 + sep * 0.7)
        }
        case 'south west':
        case 'sw': {
          const r = this.cornerRadius
          const cx = this.center.x - hw + r
          const cy = this.center.y + hh - r
          return point(cx - r * 0.707 - sep * 0.7, cy + r * 0.707 + sep * 0.7)
        }
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
    const r = this.cornerRadius

    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // Find intersection with the rounded rectangle
    // First check straight edges, then corners

    // Check if hitting a straight edge (not a corner)
    const innerHW = hw - r
    const innerHH = hh - r

    // Ray from center
    let t = Infinity

    // Right edge (if not in corner zone)
    if (cos > 0) {
      const tx = hw / cos
      const y = tx * sin
      if (Math.abs(y) <= innerHH) {
        t = Math.min(t, tx)
      }
    }
    // Left edge
    if (cos < 0) {
      const tx = -hw / cos
      const y = tx * sin
      if (Math.abs(y) <= innerHH) {
        t = Math.min(t, tx)
      }
    }
    // Top edge
    if (sin < 0) {
      const ty = -hh / sin
      const x = ty * cos
      if (Math.abs(x) <= innerHW) {
        t = Math.min(t, ty)
      }
    }
    // Bottom edge
    if (sin > 0) {
      const ty = hh / sin
      const x = ty * cos
      if (Math.abs(x) <= innerHW) {
        t = Math.min(t, ty)
      }
    }

    // Check corner arcs
    const corners = [
      { cx: innerHW, cy: -innerHH },  // top-right
      { cx: -innerHW, cy: -innerHH }, // top-left
      { cx: -innerHW, cy: innerHH },  // bottom-left
      { cx: innerHW, cy: innerHH },   // bottom-right
    ]

    for (const corner of corners) {
      // Solve for intersection with circle centered at corner
      // (cos*t - cx)^2 + (sin*t - cy)^2 = r^2
      const a = 1 // cos^2 + sin^2
      const b = -2 * (cos * corner.cx + sin * corner.cy)
      const c = corner.cx * corner.cx + corner.cy * corner.cy - r * r

      const disc = b * b - 4 * a * c
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc)
        const t1 = (-b + sqrtDisc) / (2 * a)
        const t2 = (-b - sqrtDisc) / (2 * a)

        for (const tc of [t1, t2]) {
          if (tc > 0) {
            const px = tc * cos
            const py = tc * sin
            // Check if this point is actually in the corner region
            if ((corner.cx > 0 ? px >= innerHW : px <= -innerHW) &&
                (corner.cy > 0 ? py >= innerHH : py <= -innerHH)) {
              t = Math.min(t, tc)
            }
          }
        }
      }
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
    const r = this.cornerRadius
    const dx = Math.abs(p.x - this.center.x)
    const dy = Math.abs(p.y - this.center.y)

    // Outside bounding box
    if (dx > hw || dy > hh) return false

    // Inside inner rectangle (no corners)
    if (dx <= hw - r || dy <= hh - r) return true

    // Check corner
    const cornerX = dx - (hw - r)
    const cornerY = dy - (hh - r)
    return cornerX * cornerX + cornerY * cornerY <= r * r
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

  moveTo(center: PointLike): RoundedRectangle {
    return new RoundedRectangle({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      cornerRadius: this.cornerRadius,
    })
  }

  resize(width: number, height: number): RoundedRectangle {
    return new RoundedRectangle({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      cornerRadius: this.cornerRadius,
    })
  }

  toSVGPath(): string {
    const hw = this.width / 2
    const hh = this.height / 2
    const r = this.cornerRadius
    const cx = this.center.x
    const cy = this.center.y

    // Start at top-left after corner
    return `M ${cx - hw + r} ${cy - hh} ` +
           `L ${cx + hw - r} ${cy - hh} ` +
           `A ${r} ${r} 0 0 1 ${cx + hw} ${cy - hh + r} ` +
           `L ${cx + hw} ${cy + hh - r} ` +
           `A ${r} ${r} 0 0 1 ${cx + hw - r} ${cy + hh} ` +
           `L ${cx - hw + r} ${cy + hh} ` +
           `A ${r} ${r} 0 0 1 ${cx - hw} ${cy + hh - r} ` +
           `L ${cx - hw} ${cy - hh + r} ` +
           `A ${r} ${r} 0 0 1 ${cx - hw + r} ${cy - hh} ` +
           `Z`
  }

  toString(): string {
    return `RoundedRectangle(${this.center}, ${this.width}x${this.height}, r=${this.cornerRadius})`
  }
}

/**
 * Create a rounded rectangle shape
 */
export function roundedRectangle(options?: RoundedRectangleOptions): RoundedRectangle {
  return new RoundedRectangle(options)
}
