import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'
import { degToRad } from '../../utils/math'

/**
 * Options specific to regular polygon shape
 */
export interface RegularPolygonOptions extends ShapeOptions {
  /**
   * Number of sides (default: 6 for hexagon)
   */
  sides?: number

  /**
   * Rotation offset in degrees (default: 0)
   * 0 means first vertex points up for odd sides, flat top for even sides
   */
  rotation?: number
}

/**
 * A regular polygon shape (equilateral, equal angles).
 *
 * Anchors: standard compass anchors plus `"corner N"` (1-indexed
 * vertex, TikZ-style) via {@link customAnchor}.
 */
export class RegularPolygon extends AnchoredPolygon {
  readonly type = 'regular polygon' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly sides: number
  readonly rotation: number

  constructor(options: RegularPolygonOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.sides = options.sides ?? 6
    this.rotation = options.rotation ?? 0

    // Use the larger of width/height as the diameter
    const size = Math.max(
      Math.max(opts.width, opts.minWidth),
      Math.max(opts.height, opts.minHeight)
    )
    this.width = size
    this.height = size
  }

  /**
   * Radius of circumscribed circle
   */
  get radius(): number {
    return this.width / 2
  }

  /**
   * Get all vertices of the polygon
   */
  get vertices(): Point[] {
    const vertices: Point[] = []
    const angleStep = 360 / this.sides
    // Start angle: -90 points first vertex up
    const startAngle = -90 + this.rotation

    for (let i = 0; i < this.sides; i++) {
      const angle = startAngle + i * angleStep
      const rad = degToRad(angle)
      vertices.push(point(
        this.center.x + this.radius * Math.cos(rad),
        this.center.y + this.radius * Math.sin(rad)
      ))
    }

    return vertices
  }

  protected customAnchor(normalized: string): Point | null {
    // Corner anchors like "corner 1", "corner 2" (1-indexed, TikZ-style)
    if (normalized.startsWith('corner ')) {
      const idx = parseInt(normalized.slice(7), 10) - 1
      if (idx >= 0 && idx < this.sides) {
        return this.vertices[idx]!
      }
    }
    return null
  }

  /**
   * Get a specific vertex (1-indexed like TikZ)
   */
  corner(n: number): Point {
    const idx = (((n - 1) % this.sides) + this.sides) % this.sides
    return this.vertices[idx]!
  }

  moveTo(center: PointLike): RegularPolygon {
    return new RegularPolygon({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      sides: this.sides,
      rotation: this.rotation,
    })
  }

  resize(width: number, height: number): RegularPolygon {
    const size = Math.max(width, height)
    return new RegularPolygon({
      center: this.center,
      width: size,
      height: size,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      sides: this.sides,
      rotation: this.rotation,
    })
  }

  toString(): string {
    return `RegularPolygon(${this.center}, sides=${this.sides}, r=${this.radius})`
  }
}

export function regularPolygon(options: RegularPolygonOptions = {}): RegularPolygon {
  return new RegularPolygon(options)
}

/**
 * Create a triangle shape (3-sided regular polygon)
 */
export function isoscelesTriangle(options: Omit<RegularPolygonOptions, 'sides'> = {}): RegularPolygon {
  return new RegularPolygon({ ...options, sides: 3 })
}

/**
 * Create a pentagon shape (5-sided regular polygon)
 */
export function pentagon(options: Omit<RegularPolygonOptions, 'sides'> = {}): RegularPolygon {
  return new RegularPolygon({ ...options, sides: 5 })
}

/**
 * Create a hexagon shape (6-sided regular polygon)
 */
export function hexagon(options: Omit<RegularPolygonOptions, 'sides'> = {}): RegularPolygon {
  return new RegularPolygon({ ...options, sides: 6 })
}

/**
 * Create an octagon shape (8-sided regular polygon)
 */
export function octagon(options: Omit<RegularPolygonOptions, 'sides'> = {}): RegularPolygon {
  return new RegularPolygon({ ...options, sides: 8 })
}
