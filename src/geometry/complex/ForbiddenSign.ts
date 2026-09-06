import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to forbidden sign shape
 */
export interface ForbiddenSignOptions extends ShapeOptions {
  /**
   * Width of the circle border and slash (default: 4)
   */
  lineWidth?: number

  /**
   * Angle of the slash in degrees (default: 45)
   */
  slashAngle?: number
}

/**
 * A "no" / forbidden sign (circle with diagonal line)
 *
 * Visual:
 * ```
 *     .---.
 *    /  /  \
 *   |  /    |
 *   | /     |
 *    \/    /
 *     '---'
 * ```
 */
export class ForbiddenSign implements Shape {
  readonly type = 'forbidden sign' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly lineWidth: number
  readonly slashAngle: number

  constructor(options: ForbiddenSignOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.lineWidth = options.lineWidth ?? 4
    this.slashAngle = options.slashAngle ?? 45

    const size = Math.max(opts.width, opts.height, opts.minWidth, opts.minHeight, 50)
    this.width = size
    this.height = size
  }

  /**
   * Radius of the forbidden sign
   */
  get radius(): number {
    return this.width / 2
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const r = this.radius

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          return point(this.center.x, this.center.y - r - sep)
        case 'south':
        case 's':
          return point(this.center.x, this.center.y + r + sep)
        case 'east':
        case 'e':
          return point(this.center.x + r + sep, this.center.y)
        case 'west':
        case 'w':
          return point(this.center.x - r - sep, this.center.y)
        case 'north east':
        case 'ne':
          return point(
            this.center.x + r * 0.707 + sep * 0.7,
            this.center.y - r * 0.707 - sep * 0.7
          )
        case 'north west':
        case 'nw':
          return point(
            this.center.x - r * 0.707 - sep * 0.7,
            this.center.y - r * 0.707 - sep * 0.7
          )
        case 'south east':
        case 'se':
          return point(
            this.center.x + r * 0.707 + sep * 0.7,
            this.center.y + r * 0.707 + sep * 0.7
          )
        case 'south west':
        case 'sw':
          return point(
            this.center.x - r * 0.707 - sep * 0.7,
            this.center.y + r * 0.707 + sep * 0.7
          )
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
    const r = this.radius
    return point(
      this.center.x + r * Math.cos(rad),
      this.center.y + r * Math.sin(rad)
    )
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
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    return dx * dx + dy * dy <= this.radius * this.radius
  }

  get bounds(): [number, number, number, number] {
    const r = this.radius
    return [
      this.center.x - r,
      this.center.y - r,
      this.center.x + r,
      this.center.y + r,
    ]
  }

  moveTo(center: PointLike): ForbiddenSign {
    return new ForbiddenSign({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      lineWidth: this.lineWidth,
      slashAngle: this.slashAngle,
    })
  }

  resize(width: number, height: number): ForbiddenSign {
    return new ForbiddenSign({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      lineWidth: this.lineWidth,
      slashAngle: this.slashAngle,
    })
  }

  toSVGPath(): string {
    const r = this.radius
    const cx = this.center.x
    const cy = this.center.y

    // Circle path
    const circlePath = `M ${cx + r} ${cy} ` +
                       `A ${r} ${r} 0 1 1 ${cx - r} ${cy} ` +
                       `A ${r} ${r} 0 1 1 ${cx + r} ${cy}`

    // Slash line
    const slashRad = degToRad(this.slashAngle)
    const slashX = r * Math.cos(slashRad)
    const slashY = r * Math.sin(slashRad)
    const slashPath = `M ${cx - slashX} ${cy + slashY} L ${cx + slashX} ${cy - slashY}`

    return `${circlePath} ${slashPath}`
  }

  toString(): string {
    return `ForbiddenSign(${this.center}, r=${this.radius})`
  }
}

/**
 * Create a forbidden sign shape
 */
export function forbiddenSign(options?: ForbiddenSignOptions): ForbiddenSign {
  return new ForbiddenSign(options)
}
