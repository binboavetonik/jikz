import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to circular sector shape
 */
export interface CircularSectorOptions extends ShapeOptions {
  /**
   * Start angle in degrees (default: -60)
   */
  startAngle?: number

  /**
   * End angle in degrees (default: 60)
   */
  endAngle?: number
}

/**
 * A circular sector (pie slice) shape
 *
 * Visual:
 * ```
 *       ___
 *      /   \
 *     /     \
 *    *-------*
 *     \     /
 *      \   /
 *       \ /
 *        *
 * ```
 */
export class CircularSector implements Shape {
  readonly type = 'circular sector' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly startAngle: number
  readonly endAngle: number

  constructor(options: CircularSectorOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.startAngle = options.startAngle ?? -60
    this.endAngle = options.endAngle ?? 60

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Radius of the sector — fits inside the declared box for the
   * configured sweep (conservative for non-default orientations).
   */
  get radius(): number {
    const rawSweep = Math.abs(this.endAngle - this.startAngle) % 360
    const sweep = Math.min(rawSweep === 0 ? 360 : rawSweep, 360)
    const half = Math.min(sweep, 360 - sweep) / 2
    const sinHalf = Math.sin(degToRad(half))
    const rMaxX = this.width / 2
    const rMaxY = sinHalf > 1e-6 ? this.height / (2 * sinHalf) : this.height / 2
    return Math.max(4, Math.min(rMaxX, rMaxY))
  }

  /**
   * The apex point of the sector (center of the circle), placed so the
   * sector's bounding box is centered on `at`: the sector geometry is
   * computed around the origin, its bbox center measured, and the apex
   * offset by the negation.
   */
  get apex(): Point {
    const r = this.radius
    const pts: Point[] = [point(0, 0)]
    let start = this.startAngle
    let end = this.endAngle
    if (end < start) end += 360
    for (let a = start; a <= end; a += 5) {
      const rad = degToRad(a)
      pts.push(point(r * Math.cos(rad), r * Math.sin(rad)))
    }
    const endRad = degToRad(end)
    pts.push(point(r * Math.cos(endRad), r * Math.sin(endRad)))

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return point(
      this.center.x - (minX + maxX) / 2,
      this.center.y - (minY + maxY) / 2
    )
  }

  /**
   * Get the arc start point
   */
  get arcStart(): Point {
    const rad = degToRad(this.startAngle)
    return point(
      this.apex.x + this.radius * Math.cos(rad),
      this.apex.y + this.radius * Math.sin(rad)
    )
  }

  /**
   * Get the arc end point
   */
  get arcEnd(): Point {
    const rad = degToRad(this.endAngle)
    return point(
      this.apex.x + this.radius * Math.cos(rad),
      this.apex.y + this.radius * Math.sin(rad)
    )
  }

  /**
   * Get the midpoint of the arc
   */
  get arcMid(): Point {
    const midAngle = (this.startAngle + this.endAngle) / 2
    const rad = degToRad(midAngle)
    return point(
      this.apex.x + this.radius * Math.cos(rad),
      this.apex.y + this.radius * Math.sin(rad)
    )
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'apex':
          return this.apex
        case 'arc start':
          return this.arcStart
        case 'arc end':
          return this.arcEnd
        case 'arc mid':
        case 'arc center':
          return this.arcMid
        case 'north':
        case 'n':
          return this.boundaryPoint(270).add(0, -sep)
        case 'south':
        case 's':
          return this.boundaryPoint(90).add(0, sep)
        case 'east':
        case 'e':
          return this.boundaryPoint(0).add(sep, 0)
        case 'west':
        case 'w':
          return this.boundaryPoint(180).add(-sep, 0)
        case 'north east':
        case 'ne':
          return this.boundaryPoint(315).add(sep * 0.7, -sep * 0.7)
        case 'north west':
        case 'nw':
          return this.boundaryPoint(225).add(-sep * 0.7, -sep * 0.7)
        case 'south east':
        case 'se':
          return this.boundaryPoint(45).add(sep * 0.7, sep * 0.7)
        case 'south west':
        case 'sw':
          return this.boundaryPoint(135).add(-sep * 0.7, sep * 0.7)
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const r = this.radius

    // Normalize angles
    let start = this.startAngle
    let end = this.endAngle
    if (end < start) end += 360

    // Check if angle is within the arc
    let testAngle = angle
    while (testAngle < start) testAngle += 360
    while (testAngle > start + 360) testAngle -= 360

    if (testAngle >= start && testAngle <= end) {
      // On the arc
      const rad = degToRad(angle)
      return point(
        this.apex.x + r * Math.cos(rad),
        this.apex.y + r * Math.sin(rad)
      )
    }

    // On one of the straight edges
    const rad = degToRad(angle)
    const dir = point(Math.cos(rad), Math.sin(rad))

    // Check intersection with both edges
    const startRad = degToRad(this.startAngle)
    const endRad = degToRad(this.endAngle)

    const startEdgeEnd = point(
      this.apex.x + r * Math.cos(startRad),
      this.apex.y + r * Math.sin(startRad)
    )
    const endEdgeEnd = point(
      this.apex.x + r * Math.cos(endRad),
      this.apex.y + r * Math.sin(endRad)
    )

    let closest: Point | null = null
    let minDist = Infinity

    // Check start edge
    const int1 = this.rayEdgeIntersection(this.apex, dir, this.apex, startEdgeEnd)
    if (int1) {
      const dist = this.apex.distanceTo(int1)
      if (dist < minDist) {
        minDist = dist
        closest = int1
      }
    }

    // Check end edge
    const int2 = this.rayEdgeIntersection(this.apex, dir, this.apex, endEdgeEnd)
    if (int2) {
      const dist = this.apex.distanceTo(int2)
      if (dist < minDist) {
        minDist = dist
        closest = int2
      }
    }

    return closest ?? this.apex
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
    const dx = p.x - this.apex.x
    const dy = p.y - this.apex.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > this.radius) return false

    let angle = Math.atan2(dy, dx) * 180 / Math.PI
    let start = this.startAngle
    let end = this.endAngle

    // Normalize
    while (angle < start) angle += 360
    while (end < start) end += 360

    return angle >= start && angle <= end
  }

  get bounds(): [number, number, number, number] {
    const r = this.radius
    const points: Point[] = [this.apex, this.arcStart, this.arcEnd]

    // Add cardinal points if they're within the arc
    const cardinals = [0, 90, 180, 270]
    let start = this.startAngle
    let end = this.endAngle
    if (end < start) end += 360

    for (const c of cardinals) {
      let test = c
      while (test < start) test += 360
      if (test >= start && test <= end) {
        const rad = degToRad(c)
        points.push(point(
          this.apex.x + r * Math.cos(rad),
          this.apex.y + r * Math.sin(rad)
        ))
      }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const pt of points) {
      minX = Math.min(minX, pt.x)
      minY = Math.min(minY, pt.y)
      maxX = Math.max(maxX, pt.x)
      maxY = Math.max(maxY, pt.y)
    }

    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): CircularSector {
    return new CircularSector({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
    })
  }

  resize(width: number, height: number): CircularSector {
    return new CircularSector({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
    })
  }

  toSVGPath(): string {
    const r = this.radius
    const start = this.arcStart
    const end = this.arcEnd

    // Determine if we need the large arc flag
    let angleDiff = this.endAngle - this.startAngle
    while (angleDiff < 0) angleDiff += 360
    const largeArc = angleDiff > 180 ? 1 : 0

    return `M ${this.apex.x} ${this.apex.y} ` +
           `L ${start.x} ${start.y} ` +
           `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} ` +
           `Z`
  }

  toString(): string {
    return `CircularSector(${this.center}, r=${this.radius}, ${this.startAngle}° to ${this.endAngle}°)`
  }
}

/**
 * Create a circular sector shape
 */
export function circularSector(options?: CircularSectorOptions): CircularSector {
  return new CircularSector(options)
}
