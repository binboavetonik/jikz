import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to cloud shape
 */
export interface CloudOptions extends ShapeOptions {
  /**
   * Number of puffs around the cloud (default: 10)
   */
  puffs?: number

  /**
   * Arc angle of each puff in degrees (default: 135)
   */
  puffArc?: number
}

/**
 * A puffy cloud shape made of overlapping circular arcs
 *
 * Visual:
 * ```
 *     .-~~~-.
 *   .'       '.
 *  /    ___    \
 * |   .'   '.   |
 *  \ /       \ /
 *   '~._____.'
 * ```
 */
export class Cloud implements Shape {
  readonly type = 'cloud' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly puffs: number
  readonly puffArc: number

  constructor(options: CloudOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.puffs = Math.max(4, options.puffs ?? 10)
    this.puffArc = options.puffArc ?? 135

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the inner radii of the cloud (ellipse that the puffs sit on)
   */
  private get innerRadii(): { rx: number; ry: number } {
    return {
      rx: this.width / 2 * 0.7,
      ry: this.height / 2 * 0.7,
    }
  }

  /**
   * Calculate the radius of each puff based on the arc and spacing
   */
  private get puffRadius(): number {
    const angleStep = (2 * Math.PI) / this.puffs
    const { rx, ry } = this.innerRadii
    const avgRadius = (rx + ry) / 2
    // Approximate chord length between puff centers
    const chordLength = 2 * avgRadius * Math.sin(angleStep / 2)
    // Puff radius should create nice overlap
    const halfArcRad = degToRad(this.puffArc / 2)
    return chordLength / (2 * Math.sin(halfArcRad)) * 1.2
  }

  /**
   * Get the center points of each puff
   */
  get puffCenters(): Point[] {
    const centers: Point[] = []
    const { rx, ry } = this.innerRadii
    const angleStep = (2 * Math.PI) / this.puffs

    for (let i = 0; i < this.puffs; i++) {
      const angle = angleStep * i - Math.PI / 2 // Start from top
      centers.push(point(
        this.center.x + rx * Math.cos(angle),
        this.center.y + ry * Math.sin(angle)
      ))
    }

    return centers
  }

  /**
   * Get the outermost points of each puff (for boundary)
   */
  get puffOuterPoints(): Point[] {
    const points: Point[] = []
    const { rx, ry } = this.innerRadii
    const puffR = this.puffRadius
    const angleStep = (2 * Math.PI) / this.puffs

    for (let i = 0; i < this.puffs; i++) {
      const angle = angleStep * i - Math.PI / 2
      const cx = this.center.x + rx * Math.cos(angle)
      const cy = this.center.y + ry * Math.sin(angle)
      // Outer point is along the radial direction from center
      const dx = cx - this.center.x
      const dy = cy - this.center.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        points.push(point(
          cx + (dx / len) * puffR,
          cy + (dy / len) * puffR
        ))
      } else {
        points.push(point(cx, cy - puffR))
      }
    }

    return points
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
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

      // Check for puff anchors like "puff 1", "puff 2"
      if (normalized.startsWith('puff ')) {
        const idx = parseInt(normalized.slice(5), 10) - 1
        const outerPoints = this.puffOuterPoints
        if (idx >= 0 && idx < outerPoints.length) {
          return outerPoints[idx]!
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
    // For cloud, we find the farthest point on any puff circle in this direction
    const rad = degToRad(angle)
    const dir = point(Math.cos(rad), Math.sin(rad))
    const puffR = this.puffRadius
    const centers = this.puffCenters

    let farthest: Point | null = null
    let maxDist = -Infinity

    for (const c of centers) {
      // Point on this puff circle in the given direction
      const puffPoint = point(c.x + puffR * dir.x, c.y + puffR * dir.y)
      const dist = this.center.distanceTo(puffPoint)
      if (dist > maxDist) {
        maxDist = dist
        farthest = puffPoint
      }
    }

    return farthest ?? this.center
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
    // Point is inside if it's inside any puff circle
    const puffR = this.puffRadius
    for (const c of this.puffCenters) {
      const dx = p.x - c.x
      const dy = p.y - c.y
      if (dx * dx + dy * dy <= puffR * puffR) {
        return true
      }
    }
    // Also check the inner ellipse
    const { rx, ry } = this.innerRadii
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
  }

  get bounds(): [number, number, number, number] {
    const puffR = this.puffRadius
    const centers = this.puffCenters

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const c of centers) {
      minX = Math.min(minX, c.x - puffR)
      minY = Math.min(minY, c.y - puffR)
      maxX = Math.max(maxX, c.x + puffR)
      maxY = Math.max(maxY, c.y + puffR)
    }

    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): Cloud {
    return new Cloud({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      puffs: this.puffs,
      puffArc: this.puffArc,
    })
  }

  resize(width: number, height: number): Cloud {
    return new Cloud({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      puffs: this.puffs,
      puffArc: this.puffArc,
    })
  }

  toSVGPath(): string {
    // Draw the cloud as a series of arcs connecting puff outer points
    const centers = this.puffCenters
    const puffR = this.puffRadius
    const n = centers.length

    if (n < 3) return ''

    // Calculate the connection points between adjacent puffs
    const connections: Point[] = []
    for (let i = 0; i < n; i++) {
      const c1 = centers[i]!
      const c2 = centers[(i + 1) % n]!

      // Find the intersection/connection point between two puff circles
      // This is approximately the midpoint between centers, pushed outward
      const midX = (c1.x + c2.x) / 2
      const midY = (c1.y + c2.y) / 2

      // Direction from cloud center to midpoint
      const dx = midX - this.center.x
      const dy = midY - this.center.y
      const len = Math.sqrt(dx * dx + dy * dy)

      if (len > 0) {
        // Push the connection point outward
        const { rx, ry } = this.innerRadii
        const avgR = (rx + ry) / 2
        const factor = (avgR + puffR * 0.6) / len
        connections.push(point(
          this.center.x + dx * factor,
          this.center.y + dy * factor
        ))
      } else {
        connections.push(point(midX, midY))
      }
    }

    // Build path with arcs
    let path = `M ${connections[0]!.x} ${connections[0]!.y}`

    for (let i = 0; i < n; i++) {
      const endPt = connections[(i + 1) % n]!
      // Arc to next connection point, curving around puff center
      path += ` A ${puffR} ${puffR} 0 0 1 ${endPt.x} ${endPt.y}`
    }

    return path + ' Z'
  }

  toString(): string {
    return `Cloud(${this.center}, ${this.width}x${this.height}, puffs=${this.puffs})`
  }
}

/**
 * Create a cloud shape
 */
export function cloud(options?: CloudOptions): Cloud {
  return new Cloud(options)
}
