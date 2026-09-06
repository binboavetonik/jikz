import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to parallelogram shape
 */
export interface ParallelogramOptions extends ShapeOptions {
  /**
   * Slant angle in degrees (default: 15)
   * Positive = slant right, negative = slant left
   */
  slant?: number
}

/**
 * A parallelogram shape (slanted rectangle)
 */
export class Parallelogram implements Shape {
  readonly type = 'parallelogram' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly slant: number

  constructor(options: ParallelogramOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.slant = options.slant ?? 15
  }

  /**
   * Calculate the horizontal offset due to slant
   */
  get slantOffset(): number {
    return this.height * Math.tan(degToRad(this.slant)) / 2
  }

  /**
   * Get the four corners of the parallelogram
   * Returns [topLeft, topRight, bottomRight, bottomLeft]
   */
  get corners(): [Point, Point, Point, Point] {
    // The slant shifts the top/bottom edges WITHIN the declared width:
    // extreme points land exactly on the declared box edges.
    const halfW = this.width / 2
    const halfH = this.height / 2
    const offset = this.slantOffset
    const bodyHalf = Math.max(halfW - Math.abs(offset), 0)

    return [
      point(this.center.x - bodyHalf + offset, this.center.y - halfH),   // top left
      point(this.center.x + bodyHalf + offset, this.center.y - halfH),   // top right
      point(this.center.x + bodyHalf - offset, this.center.y + halfH),   // bottom right
      point(this.center.x - bodyHalf - offset, this.center.y + halfH),   // bottom left
    ]
  }

  anchor(spec: AnchorSpec): Point {
    // Handle string anchors directly
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const [tl, tr, br, bl] = this.corners
      const sep = this.outerSep

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          return point((tl.x + tr.x) / 2, tl.y - sep)
        case 'south':
        case 's':
          return point((bl.x + br.x) / 2, bl.y + sep)
        case 'east':
        case 'e':
          return point((tr.x + br.x) / 2 + sep, this.center.y)
        case 'west':
        case 'w':
          return point((tl.x + bl.x) / 2 - sep, this.center.y)
        case 'north east':
        case 'ne':
          return point(tr.x + sep * 0.7, tr.y - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(tl.x - sep * 0.7, tl.y - sep * 0.7)
        case 'south east':
        case 'se':
          return point(br.x + sep * 0.7, br.y + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(bl.x - sep * 0.7, bl.y + sep * 0.7)
      }
    }

    // Handle numeric angles
    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle)
    const dir = point(Math.cos(rad), Math.sin(rad))
    const [tl, tr, br, bl] = this.corners

    const edges: [Point, Point][] = [
      [tl, tr], [tr, br], [br, bl], [bl, tl],
    ]

    let closest: Point | null = null
    let minDist = Infinity

    for (const [p1, p2] of edges) {
      const intersection = this.rayEdgeIntersection(this.center, dir, p1, p2)
      if (intersection) {
        const dist = this.center.distanceTo(intersection)
        if (dist < minDist) {
          minDist = dist
          closest = intersection
        }
      }
    }

    return closest ?? this.center
  }

  private rayEdgeIntersection(origin: Point, dir: Point, p1: Point, p2: Point): Point | null {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const denom = dir.x * dy - dir.y * dx
    if (Math.abs(denom) < 1e-10) return null

    const t = ((p1.x - origin.x) * dy - (p1.y - origin.y) * dx) / denom
    const s = ((p1.x - origin.x) * dir.y - (p1.y - origin.y) * dir.x) / denom

    if (t > 0 && s >= 0 && s <= 1) {
      return point(origin.x + t * dir.x, origin.y + t * dir.y)
    }
    return null
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
    const [tl, tr, br, bl] = this.corners
    return this.pointInPolygon(p, [tl, tr, br, bl])
  }

  private pointInPolygon(p: PointLike, polygon: Point[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i]!.x, yi = polygon[i]!.y
      const xj = polygon[j]!.x, yj = polygon[j]!.y
      if (((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }

  get bounds(): [number, number, number, number] {
    const [tl, tr, br, bl] = this.corners
    return [
      Math.min(tl.x, bl.x),
      Math.min(tl.y, tr.y),
      Math.max(tr.x, br.x),
      Math.max(bl.y, br.y),
    ]
  }

  moveTo(center: PointLike): Parallelogram {
    return new Parallelogram({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      slant: this.slant,
    })
  }

  resize(width: number, height: number): Parallelogram {
    return new Parallelogram({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      slant: this.slant,
    })
  }

  toSVGPath(): string {
    const [tl, tr, br, bl] = this.corners
    return `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} L ${bl.x} ${bl.y} Z`
  }

  toString(): string {
    return `Parallelogram(${this.center}, ${this.width}x${this.height}, slant=${this.slant}°)`
  }
}

export function parallelogram(options: ParallelogramOptions = {}): Parallelogram {
  return new Parallelogram(options)
}
