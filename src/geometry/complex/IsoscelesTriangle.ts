import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'

/**
 * Options specific to isosceles triangle shape
 */
export interface IsoscelesTriangleOptions extends ShapeOptions {
  /**
   * Apex angle in degrees (default: 60)
   * The angle at the top vertex
   */
  apexAngle?: number

  /**
   * Direction the apex points: 'up', 'down', 'left', 'right' (default: 'up')
   */
  direction?: 'up' | 'down' | 'left' | 'right'
}

/**
 * An isosceles triangle shape.
 *
 * Anchors: compass anchors on the apex side resolve to the apex (and
 * on the base side to the base midpoint) according to `direction`;
 * diagonals ray-cast the outline. Custom anchors: `'apex'`,
 * `'left corner'`, `'right corner'` via {@link customAnchor}.
 */
export class IsoscelesTriangle extends AnchoredPolygon {
  readonly type = 'isosceles triangle' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly apexAngle: number
  readonly direction: 'up' | 'down' | 'left' | 'right'

  constructor(options: IsoscelesTriangleOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.apexAngle = options.apexAngle ?? 60
    this.direction = options.direction ?? 'up'
  }

  /**
   * Get the three vertices of the triangle
   * Returns [apex, baseLeft, baseRight] relative to direction
   */
  get vertices(): [Point, Point, Point] {
    const halfW = this.width / 2
    const halfH = this.height / 2

    switch (this.direction) {
      case 'up':
        return [
          point(this.center.x, this.center.y - halfH),                    // apex (top)
          point(this.center.x - halfW, this.center.y + halfH),           // base left
          point(this.center.x + halfW, this.center.y + halfH),           // base right
        ]
      case 'down':
        return [
          point(this.center.x, this.center.y + halfH),                    // apex (bottom)
          point(this.center.x + halfW, this.center.y - halfH),           // base right
          point(this.center.x - halfW, this.center.y - halfH),           // base left
        ]
      case 'left':
        return [
          point(this.center.x - halfW, this.center.y),                    // apex (left)
          point(this.center.x + halfW, this.center.y - halfH),           // base top
          point(this.center.x + halfW, this.center.y + halfH),           // base bottom
        ]
      case 'right':
        return [
          point(this.center.x + halfW, this.center.y),                    // apex (right)
          point(this.center.x - halfW, this.center.y + halfH),           // base bottom
          point(this.center.x - halfW, this.center.y - halfH),           // base top
        ]
    }
  }

  get apex(): Point {
    return this.vertices[0]
  }

  protected customAnchor(normalized: string): Point | null {
    const [apex, bl, br] = this.vertices
    const sep = this.outerSep

    switch (normalized) {
      case 'apex':
        return apex
      case 'north':
      case 'n':
        if (this.direction === 'up') return point(apex.x, apex.y - sep)
        if (this.direction === 'down') return point((bl.x + br.x) / 2, bl.y - sep)
        return null // left/right: base ray-casts the outline
      case 'south':
      case 's':
        if (this.direction === 'down') return point(apex.x, apex.y + sep)
        if (this.direction === 'up') return point((bl.x + br.x) / 2, bl.y + sep)
        return null
      case 'east':
      case 'e':
        if (this.direction === 'right') return point(apex.x + sep, apex.y)
        if (this.direction === 'left') return point(bl.x + sep, (bl.y + br.y) / 2)
        return null
      case 'west':
      case 'w':
        if (this.direction === 'left') return point(apex.x - sep, apex.y)
        if (this.direction === 'right') return point(bl.x - sep, (bl.y + br.y) / 2)
        return null
      case 'left corner':
        return bl
      case 'right corner':
        return br
    }
    return null
  }

  moveTo(center: PointLike): IsoscelesTriangle {
    return new IsoscelesTriangle({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      apexAngle: this.apexAngle,
      direction: this.direction,
    })
  }

  resize(width: number, height: number): IsoscelesTriangle {
    return new IsoscelesTriangle({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      apexAngle: this.apexAngle,
      direction: this.direction,
    })
  }

  toString(): string {
    return `IsoscelesTriangle(${this.center}, ${this.width}x${this.height}, ${this.direction})`
  }
}

export function isoscelesTriangle(options: IsoscelesTriangleOptions = {}): IsoscelesTriangle {
  return new IsoscelesTriangle(options)
}
