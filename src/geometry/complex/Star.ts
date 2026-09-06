import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'
import { degToRad } from '../../utils/math'

/**
 * Options specific to star shape
 */
export interface StarOptions extends ShapeOptions {
  /**
   * Number of points (default: 5)
   */
  points?: number

  /**
   * Inner radius ratio (0-1, default: 0.4)
   * Ratio of inner radius to outer radius
   */
  innerRatio?: number

  /**
   * Rotation offset in degrees (default: 0)
   */
  rotation?: number
}

/**
 * A star shape with specified number of points.
 *
 * Anchors: standard compass anchors plus `"tip N"` (1-indexed outer
 * tip) via {@link customAnchor}.
 */
export class Star extends AnchoredPolygon {
  readonly type = 'star' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly points: number
  readonly innerRatio: number
  readonly rotation: number

  constructor(options: StarOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.points = options.points ?? 5
    this.innerRatio = options.innerRatio ?? 0.4
    this.rotation = options.rotation ?? 0

    const size = Math.max(
      Math.max(opts.width, opts.minWidth),
      Math.max(opts.height, opts.minHeight)
    )
    this.width = size
    this.height = size
  }

  /**
   * Outer radius
   */
  get outerRadius(): number {
    return this.width / 2
  }

  /**
   * Inner radius (valley between points)
   */
  get innerRadius(): number {
    return this.outerRadius * this.innerRatio
  }

  /**
   * Get all vertices of the star (alternating outer/inner)
   */
  get vertices(): Point[] {
    const vertices: Point[] = []
    const angleStep = 360 / this.points
    const halfStep = angleStep / 2
    const startAngle = -90 + this.rotation

    for (let i = 0; i < this.points; i++) {
      // Outer point
      const outerAngle = startAngle + i * angleStep
      const outerRad = degToRad(outerAngle)
      vertices.push(point(
        this.center.x + this.outerRadius * Math.cos(outerRad),
        this.center.y + this.outerRadius * Math.sin(outerRad)
      ))

      // Inner point
      const innerAngle = outerAngle + halfStep
      const innerRad = degToRad(innerAngle)
      vertices.push(point(
        this.center.x + this.innerRadius * Math.cos(innerRad),
        this.center.y + this.innerRadius * Math.sin(innerRad)
      ))
    }

    return vertices
  }

  /**
   * Get just the outer points (tips of the star)
   */
  get tips(): Point[] {
    const tips: Point[] = []
    const angleStep = 360 / this.points
    const startAngle = -90 + this.rotation

    for (let i = 0; i < this.points; i++) {
      const angle = startAngle + i * angleStep
      const rad = degToRad(angle)
      tips.push(point(
        this.center.x + this.outerRadius * Math.cos(rad),
        this.center.y + this.outerRadius * Math.sin(rad)
      ))
    }

    return tips
  }

  protected customAnchor(normalized: string): Point | null {
    // Tip anchors like "tip 1", "tip 2" (1-indexed outer tips)
    if (normalized.startsWith('tip ')) {
      const idx = parseInt(normalized.slice(4), 10) - 1
      if (idx >= 0 && idx < this.points) {
        return this.tips[idx]!
      }
    }
    return null
  }

  /**
   * Get a specific tip (1-indexed)
   */
  tip(n: number): Point {
    const idx = (((n - 1) % this.points) + this.points) % this.points
    return this.tips[idx]!
  }

  /**
   * The star's declared box is the circumscribed square (center ±
   * outerRadius), not the vertex min/max — keep width/height consistent
   * with `bounds`.
   */
  get bounds(): [number, number, number, number] {
    return [
      this.center.x - this.outerRadius,
      this.center.y - this.outerRadius,
      this.center.x + this.outerRadius,
      this.center.y + this.outerRadius,
    ]
  }

  moveTo(center: PointLike): Star {
    return new Star({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      points: this.points,
      innerRatio: this.innerRatio,
      rotation: this.rotation,
    })
  }

  resize(width: number, height: number): Star {
    const size = Math.max(width, height)
    return new Star({
      center: this.center,
      width: size,
      height: size,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      points: this.points,
      innerRatio: this.innerRatio,
      rotation: this.rotation,
    })
  }

  toString(): string {
    return `Star(${this.center}, points=${this.points}, r=${this.outerRadius})`
  }
}

export function star(options: StarOptions = {}): Star {
  return new Star(options)
}
