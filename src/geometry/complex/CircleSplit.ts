import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to circle split shape
 */
export interface CircleSplitOptions extends ShapeOptions {
  /**
   * Number of parts to split into (default: 2)
   */
  parts?: number

  /**
   * Labels for each part
   */
  labels?: string[]
}

/**
 * A circle split into multiple horizontal parts
 *
 * Visual (2 parts):
 * ```
 *    .---.
 *   / top \
 *  |-------|
 *   \bottom/
 *    '---'
 * ```
 */
export class CircleSplit implements Shape {
  readonly type = 'circle split' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly parts: number
  readonly labels: string[]

  constructor(options: CircleSplitOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.parts = Math.max(2, options.parts ?? 2)
    this.labels = options.labels ?? []

    const size = Math.max(opts.width, opts.height, opts.minWidth, opts.minHeight, 50)
    this.width = size
    this.height = size
  }

  /**
   * Radius of the circle
   */
  get radius(): number {
    return this.width / 2
  }

  /**
   * Get the center of a specific part (0-indexed)
   */
  partCenter(index: number): Point {
    const r = this.radius
    const partHeight = (2 * r) / this.parts
    const topY = this.center.y - r
    const partCenterY = topY + partHeight * (index + 0.5)
    return point(this.center.x, partCenterY)
  }

  /**
   * Get the divider line Y positions
   */
  get dividerYs(): number[] {
    const r = this.radius
    const partHeight = (2 * r) / this.parts
    const topY = this.center.y - r
    const ys: number[] = []
    for (let i = 1; i < this.parts; i++) {
      ys.push(topY + partHeight * i)
    }
    return ys
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
          return point(this.center.x + r * 0.707 + sep * 0.7, this.center.y - r * 0.707 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(this.center.x - r * 0.707 - sep * 0.7, this.center.y - r * 0.707 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(this.center.x + r * 0.707 + sep * 0.7, this.center.y + r * 0.707 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(this.center.x - r * 0.707 - sep * 0.7, this.center.y + r * 0.707 + sep * 0.7)
      }

      // Part anchors like "part 1", "part 2"
      if (normalized.startsWith('part ')) {
        const idx = parseInt(normalized.slice(5), 10) - 1
        if (idx >= 0 && idx < this.parts) {
          return this.partCenter(idx)
        }
      }

      // Text anchors for parts
      if (normalized.startsWith('text ')) {
        const idx = parseInt(normalized.slice(5), 10) - 1
        if (idx >= 0 && idx < this.parts) {
          return this.partCenter(idx)
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

  moveTo(center: PointLike): CircleSplit {
    return new CircleSplit({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      parts: this.parts,
      labels: this.labels,
    })
  }

  resize(width: number, height: number): CircleSplit {
    return new CircleSplit({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      parts: this.parts,
      labels: this.labels,
    })
  }

  toSVGPath(): string {
    const r = this.radius
    const cx = this.center.x
    const cy = this.center.y

    // Main circle
    let path = `M ${cx + r} ${cy} ` +
               `A ${r} ${r} 0 1 1 ${cx - r} ${cy} ` +
               `A ${r} ${r} 0 1 1 ${cx + r} ${cy}`

    // Divider lines
    for (const y of this.dividerYs) {
      const dy = y - cy
      const halfWidth = Math.sqrt(r * r - dy * dy)
      path += ` M ${cx - halfWidth} ${y} L ${cx + halfWidth} ${y}`
    }

    return path
  }

  toString(): string {
    return `CircleSplit(${this.center}, r=${this.radius}, parts=${this.parts})`
  }
}

/**
 * Create a circle split shape
 */
export function circleSplit(options?: CircleSplitOptions): CircleSplit {
  return new CircleSplit(options)
}
