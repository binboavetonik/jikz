import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Position where the callout pointer attaches
 */
export type CalloutPointerPosition = 'south' | 'north' | 'east' | 'west'

/**
 * Options specific to callout shape
 */
export interface CalloutOptions extends ShapeOptions {
  /**
   * Where the pointer attaches (default: 'south')
   */
  pointerPosition?: CalloutPointerPosition

  /**
   * Width of the pointer base (default: 15)
   */
  pointerWidth?: number

  /**
   * Length of the pointer (default: 20)
   */
  pointerLength?: number

  /**
   * Offset from center (-1 to 1, default: 0)
   * -1 = left/top edge, 0 = center, 1 = right/bottom edge
   */
  pointerOffset?: number
}

/**
 * A rectangle with a triangular pointer (speech bubble)
 *
 * Visual (pointerPosition: 'south'):
 * ```
 *  +----------+
 *  |          |
 *  |          |
 *  +----\/----+
 *       \/
 * ```
 */
export class Callout implements Shape {
  readonly type = 'callout' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly pointerPosition: CalloutPointerPosition
  readonly pointerWidth: number
  readonly pointerLength: number
  readonly pointerOffset: number

  constructor(options: CalloutOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.pointerPosition = options.pointerPosition ?? 'south'
    this.pointerWidth = options.pointerWidth ?? 15
    this.pointerLength = options.pointerLength ?? 20
    this.pointerOffset = Math.max(-1, Math.min(1, options.pointerOffset ?? 0))

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the rectangle bounds (without pointer). The body is shrunk
   * along the pointer axis by pointerLength and shifted opposite the
   * pointer by half that, so body + pointer together fill exactly the
   * declared box centered at `at` — the pointer never sticks out of
   * the declared size.
   */
  private get rectBounds(): { left: number; right: number; top: number; bottom: number } {
    let cx = this.center.x
    let cy = this.center.y
    let bw = this.width
    let bh = this.height

    switch (this.pointerPosition) {
      case 'south':
        bh = Math.max(this.height - this.pointerLength, 4)
        cy = this.center.y - (this.height - bh) / 2
        break
      case 'north':
        bh = Math.max(this.height - this.pointerLength, 4)
        cy = this.center.y + (this.height - bh) / 2
        break
      case 'east':
        bw = Math.max(this.width - this.pointerLength, 4)
        cx = this.center.x - (this.width - bw) / 2
        break
      case 'west':
        bw = Math.max(this.width - this.pointerLength, 4)
        cx = this.center.x + (this.width - bw) / 2
        break
    }

    return {
      left: cx - bw / 2,
      right: cx + bw / 2,
      top: cy - bh / 2,
      bottom: cy + bh / 2,
    }
  }

  /**
   * Get the tip point of the pointer
   */
  get pointerTip(): Point {
    const rect = this.rectBounds
    const hw = this.width / 2
    const hh = this.height / 2

    switch (this.pointerPosition) {
      case 'south':
        return point(
          this.center.x + this.pointerOffset * (hw - this.pointerWidth / 2),
          rect.bottom + this.pointerLength
        )
      case 'north':
        return point(
          this.center.x + this.pointerOffset * (hw - this.pointerWidth / 2),
          rect.top - this.pointerLength
        )
      case 'east':
        return point(
          rect.right + this.pointerLength,
          this.center.y + this.pointerOffset * (hh - this.pointerWidth / 2)
        )
      case 'west':
        return point(
          rect.left - this.pointerLength,
          this.center.y + this.pointerOffset * (hh - this.pointerWidth / 2)
        )
    }
  }

  /**
   * Get the vertices of the callout shape
   */
  get vertices(): Point[] {
    const rect = this.rectBounds
    const hw = this.width / 2
    const hh = this.height / 2
    const pw = this.pointerWidth / 2

    // Calculate pointer base position along the edge
    const offsetX = this.pointerOffset * (hw - pw)
    const offsetY = this.pointerOffset * (hh - pw)

    const pts: Point[] = []

    switch (this.pointerPosition) {
      case 'south':
        pts.push(
          point(rect.left, rect.top),
          point(rect.right, rect.top),
          point(rect.right, rect.bottom),
          point(this.center.x + offsetX + pw, rect.bottom),
          this.pointerTip,
          point(this.center.x + offsetX - pw, rect.bottom),
          point(rect.left, rect.bottom)
        )
        break
      case 'north':
        pts.push(
          point(rect.left, rect.bottom),
          point(rect.left, rect.top),
          point(this.center.x + offsetX - pw, rect.top),
          this.pointerTip,
          point(this.center.x + offsetX + pw, rect.top),
          point(rect.right, rect.top),
          point(rect.right, rect.bottom)
        )
        break
      case 'east':
        pts.push(
          point(rect.left, rect.top),
          point(rect.right, rect.top),
          point(rect.right, this.center.y + offsetY - pw),
          this.pointerTip,
          point(rect.right, this.center.y + offsetY + pw),
          point(rect.right, rect.bottom),
          point(rect.left, rect.bottom)
        )
        break
      case 'west':
        pts.push(
          point(rect.right, rect.top),
          point(rect.right, rect.bottom),
          point(rect.left, rect.bottom),
          point(rect.left, this.center.y + offsetY + pw),
          this.pointerTip,
          point(rect.left, this.center.y + offsetY - pw),
          point(rect.left, rect.top)
        )
        break
    }

    return pts
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const rect = this.rectBounds

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'pointer':
        case 'tip':
          return this.pointerTip
        case 'north':
        case 'n':
          if (this.pointerPosition === 'north') {
            return this.pointerTip.add(0, -sep)
          }
          return point(this.center.x, rect.top - sep)
        case 'south':
        case 's':
          if (this.pointerPosition === 'south') {
            return this.pointerTip.add(0, sep)
          }
          return point(this.center.x, rect.bottom + sep)
        case 'east':
        case 'e':
          if (this.pointerPosition === 'east') {
            return this.pointerTip.add(sep, 0)
          }
          return point(rect.right + sep, this.center.y)
        case 'west':
        case 'w':
          if (this.pointerPosition === 'west') {
            return this.pointerTip.add(-sep, 0)
          }
          return point(rect.left - sep, this.center.y)
        case 'north east':
        case 'ne':
          return point(rect.right + sep * 0.7, rect.top - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(rect.left - sep * 0.7, rect.top - sep * 0.7)
        case 'south east':
        case 'se':
          return point(rect.right + sep * 0.7, rect.bottom + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(rect.left - sep * 0.7, rect.bottom + sep * 0.7)
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
    const vertices = this.vertices
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const v of vertices) {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
    }
    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): Callout {
    return new Callout({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      pointerPosition: this.pointerPosition,
      pointerWidth: this.pointerWidth,
      pointerLength: this.pointerLength,
      pointerOffset: this.pointerOffset,
    })
  }

  resize(width: number, height: number): Callout {
    return new Callout({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      pointerPosition: this.pointerPosition,
      pointerWidth: this.pointerWidth,
      pointerLength: this.pointerLength,
      pointerOffset: this.pointerOffset,
    })
  }

  toSVGPath(): string {
    const vertices = this.vertices
    if (vertices.length === 0) return ''

    let path = `M ${vertices[0]!.x} ${vertices[0]!.y}`
    for (let i = 1; i < vertices.length; i++) {
      path += ` L ${vertices[i]!.x} ${vertices[i]!.y}`
    }
    return path + ' Z'
  }

  toString(): string {
    return `Callout(${this.center}, ${this.width}x${this.height}, pointer=${this.pointerPosition})`
  }
}

/**
 * Create a callout shape
 */
export function callout(options?: CalloutOptions): Callout {
  return new Callout(options)
}
