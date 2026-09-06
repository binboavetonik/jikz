import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to trapezium shape
 */
export interface TrapeziumOptions extends ShapeOptions {
  /**
   * How much to indent the top edge on each side (default: width * 0.2)
   * Can be a number (pixels) or a ratio of width (0-0.5)
   */
  topIndent?: number

  /**
   * How much to indent the bottom edge on each side (default: 0)
   */
  bottomIndent?: number
}

/**
 * A trapezium (trapezoid) shape
 * By default, the top is narrower than the bottom
 */
export class Trapezium implements Shape {
  readonly type = 'trapezium' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly topIndent: number
  readonly bottomIndent: number

  constructor(options: TrapeziumOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep

    // Default top indent is 20% of width on each side
    const defaultIndent = this.width * 0.2
    this.topIndent = options.topIndent ?? defaultIndent
    this.bottomIndent = options.bottomIndent ?? 0
  }

  /**
   * Get the four corners of the trapezium
   * Returns [topLeft, topRight, bottomRight, bottomLeft]
   */
  get corners(): [Point, Point, Point, Point] {
    const halfW = this.width / 2
    const halfH = this.height / 2

    return [
      point(this.center.x - halfW + this.topIndent, this.center.y - halfH),      // top left
      point(this.center.x + halfW - this.topIndent, this.center.y - halfH),      // top right
      point(this.center.x + halfW - this.bottomIndent, this.center.y + halfH),   // bottom right
      point(this.center.x - halfW + this.bottomIndent, this.center.y + halfH),   // bottom left
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
          return point(this.center.x, tl.y - sep)
        case 'south':
        case 's':
          return point(this.center.x, bl.y + sep)
        case 'east':
        case 'e':
          return point(Math.max(tr.x, br.x) + sep, this.center.y)
        case 'west':
        case 'w':
          return point(Math.min(tl.x, bl.x) - sep, this.center.y)
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
    // Find intersection of ray from center at angle with trapezium edges
    const rad = degToRad(angle)
    const dir = point(Math.cos(rad), Math.sin(rad))
    const [tl, tr, br, bl] = this.corners

    // Check intersection with each edge
    const edges: [Point, Point][] = [
      [tl, tr],  // top
      [tr, br],  // right
      [br, bl],  // bottom
      [bl, tl],  // left
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

  moveTo(center: PointLike): Trapezium {
    return new Trapezium({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      topIndent: this.topIndent,
      bottomIndent: this.bottomIndent,
    })
  }

  resize(width: number, height: number): Trapezium {
    return new Trapezium({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      topIndent: this.topIndent * (width / this.width),
      bottomIndent: this.bottomIndent * (width / this.width),
    })
  }

  toSVGPath(): string {
    const [tl, tr, br, bl] = this.corners
    return `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} L ${bl.x} ${bl.y} Z`
  }

  toString(): string {
    return `Trapezium(${this.center}, ${this.width}x${this.height})`
  }
}

export function trapezium(options: TrapeziumOptions = {}): Trapezium {
  return new Trapezium(options)
}
