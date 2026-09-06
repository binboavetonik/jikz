import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to chamfered rectangle shape
 */
export interface ChamferedRectangleOptions extends ShapeOptions {
  /**
   * Size of the corner chamfer (default: 8)
   */
  chamferSize?: number
}

/**
 * A rectangle with chamfered (cut) corners
 *
 * Visual:
 * ```
 *   .------.
 *  /        \
 * |          |
 *  \        /
 *   '------'
 * ```
 */
export class ChamferedRectangle implements Shape {
  readonly type = 'chamfered rectangle' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly chamferSize: number

  constructor(options: ChamferedRectangleOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)

    // Chamfer shouldn't exceed half of the smaller dimension
    const maxChamfer = Math.min(this.width, this.height) / 2
    this.chamferSize = Math.min(options.chamferSize ?? 8, maxChamfer)
  }

  /**
   * Get the 8 vertices of the chamfered rectangle
   */
  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    const c = this.chamferSize
    const cx = this.center.x
    const cy = this.center.y

    return [
      point(cx - hw + c, cy - hh),     // top-left after chamfer
      point(cx + hw - c, cy - hh),     // top-right before chamfer
      point(cx + hw, cy - hh + c),     // top-right after chamfer
      point(cx + hw, cy + hh - c),     // bottom-right before chamfer
      point(cx + hw - c, cy + hh),     // bottom-right after chamfer
      point(cx - hw + c, cy + hh),     // bottom-left before chamfer
      point(cx - hw, cy + hh - c),     // bottom-left after chamfer
      point(cx - hw, cy - hh + c),     // top-left before chamfer
    ]
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const hw = this.width / 2
      const hh = this.height / 2
      const c = this.chamferSize

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
          return point(this.center.x + hw - c / 2 + sep * 0.7, this.center.y - hh + c / 2 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(this.center.x - hw + c / 2 - sep * 0.7, this.center.y - hh + c / 2 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(this.center.x + hw - c / 2 + sep * 0.7, this.center.y + hh - c / 2 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(this.center.x - hw + c / 2 - sep * 0.7, this.center.y + hh - c / 2 + sep * 0.7)
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
    const dir = point(Math.cos(rad), Math.sin(rad))
    const vertices = this.vertices

    let closest: Point | null = null
    let minDist = Infinity

    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i]!
      const p2 = vertices[(i + 1) % vertices.length]!
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
    return this.pointInPolygon(p, this.vertices)
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
    const hw = this.width / 2
    const hh = this.height / 2
    return [
      this.center.x - hw,
      this.center.y - hh,
      this.center.x + hw,
      this.center.y + hh,
    ]
  }

  moveTo(center: PointLike): ChamferedRectangle {
    return new ChamferedRectangle({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      chamferSize: this.chamferSize,
    })
  }

  resize(width: number, height: number): ChamferedRectangle {
    return new ChamferedRectangle({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      chamferSize: this.chamferSize,
    })
  }

  toSVGPath(): string {
    const verts = this.vertices
    let path = `M ${verts[0]!.x} ${verts[0]!.y}`
    for (let i = 1; i < verts.length; i++) {
      path += ` L ${verts[i]!.x} ${verts[i]!.y}`
    }
    return path + ' Z'
  }

  toString(): string {
    return `ChamferedRectangle(${this.center}, ${this.width}x${this.height}, c=${this.chamferSize})`
  }
}

/**
 * Create a chamfered rectangle shape
 */
export function chamferedRectangle(options?: ChamferedRectangleOptions): ChamferedRectangle {
  return new ChamferedRectangle(options)
}
