import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to semicircle shape
 */
export interface SemicircleOptions extends ShapeOptions {
  /**
   * Rotation of the semicircle in degrees (default: 0)
   * 0 = flat edge at bottom, 90 = flat edge at left, etc.
   */
  rotation?: number
}

/**
 * A semicircle shape (half circle)
 *
 * Visual (rotation: 0):
 * ```
 *    _____
 *   /     \
 *  |       |
 *  +-------+
 * ```
 */
export class Semicircle implements Shape {
  readonly type = 'semicircle' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly rotation: number

  constructor(options: SemicircleOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.rotation = options.rotation ?? 0

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Radius of the semicircle — fits inside the declared box.
   */
  get radius(): number {
    return Math.min(this.width / 2, this.height)
  }

  /**
   * The circle center the semicircle is drawn around. Offset from
   * `at` (along the chord direction, respecting rotation) so the
   * semicircle's bounding box — arc plus chord — is centered on `at`.
   */
  private get origin(): Point {
    const rot = degToRad(this.rotation)
    const oy = this.radius / 2
    return point(
      this.center.x - oy * Math.sin(rot),
      this.center.y + oy * Math.cos(rot)
    )
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const r = this.radius
      const rot = degToRad(this.rotation)

      // Transform point by rotation
      const transform = (x: number, y: number): Point => {
        const rx = x * Math.cos(rot) - y * Math.sin(rot)
        const ry = x * Math.sin(rot) + y * Math.cos(rot)
        return point(this.origin.x + rx, this.origin.y + ry)
      }

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          return transform(0, -r - sep)
        case 'south':
        case 's':
          return transform(0, sep)
        case 'east':
        case 'e':
          return transform(r + sep, 0)
        case 'west':
        case 'w':
          return transform(-r - sep, 0)
        case 'north east':
        case 'ne':
          return transform(r * 0.707 + sep * 0.7, -r * 0.707 - sep * 0.7)
        case 'north west':
        case 'nw':
          return transform(-r * 0.707 - sep * 0.7, -r * 0.707 - sep * 0.7)
        case 'south east':
        case 'se':
          return transform(r + sep * 0.7, sep * 0.7)
        case 'south west':
        case 'sw':
          return transform(-r - sep * 0.7, sep * 0.7)
        case 'arc start':
          return transform(-r, 0)
        case 'arc end':
          return transform(r, 0)
        case 'chord center':
          return transform(0, 0)
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle - this.rotation)
    const r = this.radius

    // Normalize to local coordinates (rotation = 0)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    let x: number, y: number

    // Check if angle points to arc or flat edge
    if (sin <= 0) {
      // Points to arc (upper half)
      x = r * cos
      y = r * sin
    } else {
      // Points to flat edge (bottom)
      if (Math.abs(cos) < 1e-10) {
        x = 0
        y = 0
      } else {
        // Intersect with y = 0 line
        x = Math.max(-r, Math.min(r, cos > 0 ? r : -r))
        y = 0
      }
    }

    // Transform back by rotation
    const rot = degToRad(this.rotation)
    const rx = x * Math.cos(rot) - y * Math.sin(rot)
    const ry = x * Math.sin(rot) + y * Math.cos(rot)

    return point(this.origin.x + rx, this.origin.y + ry)
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
    // Transform point to local coordinates (around the circle center)
    const rot = degToRad(-this.rotation)
    const dx = p.x - this.origin.x
    const dy = p.y - this.origin.y
    const lx = dx * Math.cos(rot) - dy * Math.sin(rot)
    const ly = dx * Math.sin(rot) + dy * Math.cos(rot)

    // Check if in semicircle (y <= 0 and within circle)
    const r = this.radius
    return ly <= 0 && (lx * lx + ly * ly) <= r * r
  }

  get bounds(): [number, number, number, number] {
    const r = this.radius
    const rot = degToRad(this.rotation)

    // Sample points on the boundary
    const points: Point[] = []
    for (let a = 180; a <= 360; a += 10) {
      const rad = degToRad(a)
      const x = r * Math.cos(rad)
      const y = r * Math.sin(rad)
      const rx = x * Math.cos(rot) - y * Math.sin(rot)
      const ry = x * Math.sin(rot) + y * Math.cos(rot)
      points.push(point(this.origin.x + rx, this.origin.y + ry))
    }
    // Add flat edge endpoints
    points.push(point(
      this.origin.x + r * Math.cos(rot),
      this.origin.y + r * Math.sin(rot)
    ))
    points.push(point(
      this.origin.x - r * Math.cos(rot),
      this.origin.y - r * Math.sin(rot)
    ))

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const pt of points) {
      minX = Math.min(minX, pt.x)
      minY = Math.min(minY, pt.y)
      maxX = Math.max(maxX, pt.x)
      maxY = Math.max(maxY, pt.y)
    }

    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): Semicircle {
    return new Semicircle({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      rotation: this.rotation,
    })
  }

  resize(width: number, height: number): Semicircle {
    return new Semicircle({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      rotation: this.rotation,
    })
  }

  toSVGPath(): string {
    const r = this.radius
    const rot = degToRad(this.rotation)

    // Start and end points of the arc (flat edge)
    const startX = this.origin.x + r * Math.cos(rot)
    const startY = this.origin.y + r * Math.sin(rot)
    const endX = this.origin.x - r * Math.cos(rot)
    const endY = this.origin.y - r * Math.sin(rot)

    // Arc rotation in degrees for SVG
    const arcRot = this.rotation

    return `M ${startX} ${startY} ` +
           `A ${r} ${r} ${arcRot} 0 0 ${endX} ${endY} ` +
           `Z`
  }

  toString(): string {
    return `Semicircle(${this.center}, r=${this.radius}, rot=${this.rotation})`
  }
}

/**
 * Create a semicircle shape
 */
export function semicircle(options?: SemicircleOptions): Semicircle {
  return new Semicircle(options)
}
