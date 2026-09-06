import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to cylinder shape
 */
export interface CylinderOptions extends ShapeOptions {
  /**
   * Aspect ratio for the elliptical top/bottom (default: 0.25)
   * This controls how "tilted" the cylinder looks
   */
  aspect?: number
}

/**
 * A cylinder shape (3D-looking with elliptical top and bottom)
 */
export class Cylinder implements Shape {
  readonly type = 'cylinder' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly aspect: number

  constructor(options: CylinderOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.aspect = options.aspect ?? 0.25
  }

  /**
   * Height of the elliptical cap
   */
  get capHeight(): number {
    return this.width * this.aspect / 2
  }

  /**
   * Y coordinate of top ellipse center
   */
  get topY(): number {
    return this.center.y - this.height / 2 + this.capHeight
  }

  /**
   * Y coordinate of bottom ellipse center
   */
  get bottomY(): number {
    return this.center.y + this.height / 2 - this.capHeight
  }

  anchor(spec: AnchorSpec): Point {
    // Handle string anchors directly
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const halfW = this.width / 2
      const sep = this.outerSep

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          return point(this.center.x, this.center.y - this.height / 2 - sep)
        case 'south':
        case 's':
          return point(this.center.x, this.center.y + this.height / 2 + sep)
        case 'east':
        case 'e':
          return point(this.center.x + halfW + sep, this.center.y)
        case 'west':
        case 'w':
          return point(this.center.x - halfW - sep, this.center.y)
        case 'north east':
        case 'ne':
          return point(this.center.x + halfW * 0.7 + sep * 0.7, this.topY - this.capHeight * 0.7 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(this.center.x - halfW * 0.7 - sep * 0.7, this.topY - this.capHeight * 0.7 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(this.center.x + halfW * 0.7 + sep * 0.7, this.bottomY + this.capHeight * 0.7 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(this.center.x - halfW * 0.7 - sep * 0.7, this.bottomY + this.capHeight * 0.7 + sep * 0.7)
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
    // Simplified: treat as rectangle for boundary calculations
    const rad = degToRad(angle)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const halfW = this.width / 2
    const halfH = this.height / 2

    // Check which side we hit
    if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
      // Hit left or right side
      const x = cos > 0 ? halfW : -halfW
      const y = x * sin / cos
      return point(this.center.x + x, this.center.y + y)
    } else {
      // Hit top or bottom
      const y = sin > 0 ? halfH : -halfH
      const x = y * cos / sin
      return point(this.center.x + x, this.center.y + y)
    }
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
    // Check if within rectangular bounds
    const halfW = this.width / 2
    const halfH = this.height / 2
    return (
      p.x >= this.center.x - halfW &&
      p.x <= this.center.x + halfW &&
      p.y >= this.center.y - halfH &&
      p.y <= this.center.y + halfH
    )
  }

  get bounds(): [number, number, number, number] {
    const halfW = this.width / 2
    const halfH = this.height / 2
    return [
      this.center.x - halfW,
      this.center.y - halfH,
      this.center.x + halfW,
      this.center.y + halfH,
    ]
  }

  moveTo(center: PointLike): Cylinder {
    return new Cylinder({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      aspect: this.aspect,
    })
  }

  resize(width: number, height: number): Cylinder {
    return new Cylinder({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      aspect: this.aspect,
    })
  }

  /**
   * Generate SVG path for the cylinder outline
   * Draws: top ellipse, right side, bottom ellipse (bottom half), left side
   */
  toSVGPath(): string {
    const halfW = this.width / 2
    const rx = halfW
    const ry = this.capHeight

    // Top ellipse (full ellipse)
    const topPath = `M ${this.center.x - rx} ${this.topY} ` +
      `A ${rx} ${ry} 0 1 1 ${this.center.x + rx} ${this.topY} ` +
      `A ${rx} ${ry} 0 1 1 ${this.center.x - rx} ${this.topY}`

    // Body: right side down, bottom arc, left side up
    const bodyPath = `M ${this.center.x + rx} ${this.topY} ` +
      `L ${this.center.x + rx} ${this.bottomY} ` +
      `A ${rx} ${ry} 0 0 1 ${this.center.x - rx} ${this.bottomY} ` +
      `L ${this.center.x - rx} ${this.topY}`

    return `${topPath} ${bodyPath}`
  }

  /**
   * Generate just the visible outline (no hidden lines)
   */
  toSVGPathOutline(): string {
    const halfW = this.width / 2
    const rx = halfW
    const ry = this.capHeight

    // Top ellipse (full)
    let path = `M ${this.center.x - rx} ${this.topY} `
    path += `A ${rx} ${ry} 0 1 1 ${this.center.x + rx} ${this.topY} `
    path += `A ${rx} ${ry} 0 1 1 ${this.center.x - rx} ${this.topY} `

    // Right side
    path += `M ${this.center.x + rx} ${this.topY} `
    path += `L ${this.center.x + rx} ${this.bottomY} `

    // Bottom ellipse (front half only)
    path += `A ${rx} ${ry} 0 0 1 ${this.center.x - rx} ${this.bottomY} `

    // Left side
    path += `L ${this.center.x - rx} ${this.topY}`

    return path
  }

  toString(): string {
    return `Cylinder(${this.center}, ${this.width}x${this.height})`
  }
}

export function cylinder(options: CylinderOptions = {}): Cylinder {
  return new Cylinder(options)
}
