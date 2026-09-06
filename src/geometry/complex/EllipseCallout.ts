import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Position where the callout pointer attaches
 */
export type EllipseCalloutPointerPosition = 'south' | 'north' | 'east' | 'west'

/**
 * Options specific to ellipse callout shape
 */
export interface EllipseCalloutOptions extends ShapeOptions {
  /**
   * Where the pointer attaches (default: 'south')
   */
  pointerPosition?: EllipseCalloutPointerPosition

  /**
   * Width of the pointer base (default: 15)
   */
  pointerWidth?: number

  /**
   * Length of the pointer (default: 25)
   */
  pointerLength?: number

  /**
   * Angle offset from center in degrees (default: 0)
   */
  pointerAngle?: number
}

/**
 * An ellipse with a triangular pointer (speech bubble)
 *
 * Visual (pointerPosition: 'south'):
 * ```
 *    .-----.
 *   /       \
 *  |         |
 *   \       /
 *    '-._.-'
 *       \/
 * ```
 */
export class EllipseCallout implements Shape {
  readonly type = 'ellipse callout' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly pointerPosition: EllipseCalloutPointerPosition
  readonly pointerWidth: number
  readonly pointerLength: number
  readonly pointerAngle: number

  constructor(options: EllipseCalloutOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.pointerPosition = options.pointerPosition ?? 'south'
    this.pointerWidth = options.pointerWidth ?? 15
    this.pointerLength = options.pointerLength ?? 25
    this.pointerAngle = options.pointerAngle ?? 0

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * The ellipse body's center and radii. The body is shrunk along the
   * pointer axis by the pointer length and shifted opposite the
   * pointer by half that, so body + pointer together fill exactly the
   * declared box centered at `at` — the pointer never sticks out of
   * the declared size.
   */
  private get body(): { cx: number; cy: number; rx: number; ry: number } {
    let cx = this.center.x
    let cy = this.center.y
    let rx = this.width / 2
    let ry = this.height / 2
    const pl = this.pointerLength / 2

    switch (this.pointerPosition) {
      case 'south':
        ry = Math.max(ry - pl, 2)
        cy = this.center.y - pl
        break
      case 'north':
        ry = Math.max(ry - pl, 2)
        cy = this.center.y + pl
        break
      case 'east':
        rx = Math.max(rx - pl, 2)
        cx = this.center.x - pl
        break
      case 'west':
        rx = Math.max(rx - pl, 2)
        cx = this.center.x + pl
        break
    }

    return { cx, cy, rx, ry }
  }

  /**
   * Get the tip point of the pointer
   */
  get pointerTip(): Point {
    const { cx, cy, rx, ry } = this.body

    switch (this.pointerPosition) {
      case 'south':
        return point(cx + this.pointerAngle, cy + ry + this.pointerLength)
      case 'north':
        return point(cx + this.pointerAngle, cy - ry - this.pointerLength)
      case 'east':
        return point(cx + rx + this.pointerLength, cy + this.pointerAngle)
      case 'west':
        return point(cx - rx - this.pointerLength, cy + this.pointerAngle)
    }
  }

  /**
   * Get the base points of the pointer on the ellipse
   */
  private get pointerBase(): { p1: Point; p2: Point } {
    const { cx, cy, rx, ry } = this.body

    let angle1: number, angle2: number

    switch (this.pointerPosition) {
      case 'south': {
        // Find angles on ellipse where pointer connects
        const baseAngle = 270 + this.pointerAngle * 2 // crude approximation
        angle1 = baseAngle - 15
        angle2 = baseAngle + 15
        break
      }
      case 'north': {
        const baseAngle = 90 + this.pointerAngle * 2
        angle1 = baseAngle - 15
        angle2 = baseAngle + 15
        break
      }
      case 'east': {
        const baseAngle = 0 + this.pointerAngle * 2
        angle1 = baseAngle - 15
        angle2 = baseAngle + 15
        break
      }
      case 'west': {
        const baseAngle = 180 + this.pointerAngle * 2
        angle1 = baseAngle - 15
        angle2 = baseAngle + 15
        break
      }
    }

    const rad1 = degToRad(angle1)
    const rad2 = degToRad(angle2)

    return {
      p1: point(cx + rx * Math.cos(rad1), cy - ry * Math.sin(rad1)),
      p2: point(cx + rx * Math.cos(rad2), cy - ry * Math.sin(rad2)),
    }
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const { cx, cy, rx, ry } = this.body

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
          return point(cx, cy - ry - sep)
        case 'south':
        case 's':
          if (this.pointerPosition === 'south') {
            return this.pointerTip.add(0, sep)
          }
          return point(cx, cy + ry + sep)
        case 'east':
        case 'e':
          if (this.pointerPosition === 'east') {
            return this.pointerTip.add(sep, 0)
          }
          return point(cx + rx + sep, cy)
        case 'west':
        case 'w':
          if (this.pointerPosition === 'west') {
            return this.pointerTip.add(-sep, 0)
          }
          return point(cx - rx - sep, cy)
        case 'north east':
        case 'ne':
          return point(cx + rx * 0.707 + sep * 0.7, cy - ry * 0.707 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(cx - rx * 0.707 - sep * 0.7, cy - ry * 0.707 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(cx + rx * 0.707 + sep * 0.7, cy + ry * 0.707 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(cx - rx * 0.707 - sep * 0.7, cy + ry * 0.707 + sep * 0.7)
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
    const { cx, cy, rx, ry } = this.body
    return point(cx + rx * Math.cos(rad), cy + ry * Math.sin(rad))
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
    // Check ellipse
    const { cx, cy, rx, ry } = this.body
    const dx = p.x - cx
    const dy = p.y - cy
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) return true

    // Check pointer triangle
    const base = this.pointerBase
    return this.pointInTriangle(p, base.p1, base.p2, this.pointerTip)
  }

  private pointInTriangle(p: PointLike, a: Point, b: Point, c: Point): boolean {
    const sign = (p1: PointLike, p2: Point, p3: Point) =>
      (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)

    const d1 = sign(p, a, b)
    const d2 = sign(p, b, c)
    const d3 = sign(p, c, a)

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)

    return !(hasNeg && hasPos)
  }

  get bounds(): [number, number, number, number] {
    const { cx, cy, rx, ry } = this.body
    const tip = this.pointerTip

    return [
      Math.min(cx - rx, tip.x),
      Math.min(cy - ry, tip.y),
      Math.max(cx + rx, tip.x),
      Math.max(cy + ry, tip.y),
    ]
  }

  moveTo(center: PointLike): EllipseCallout {
    return new EllipseCallout({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      pointerPosition: this.pointerPosition,
      pointerWidth: this.pointerWidth,
      pointerLength: this.pointerLength,
      pointerAngle: this.pointerAngle,
    })
  }

  resize(width: number, height: number): EllipseCallout {
    return new EllipseCallout({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      pointerPosition: this.pointerPosition,
      pointerWidth: this.pointerWidth,
      pointerLength: this.pointerLength,
      pointerAngle: this.pointerAngle,
    })
  }

  toSVGPath(): string {
    const { rx, ry } = this.body
    const base = this.pointerBase
    const tip = this.pointerTip

    // Draw ellipse with gap for pointer
    // Start at p2, arc to p1, then pointer
    return `M ${base.p2.x} ${base.p2.y} ` +
           `A ${rx} ${ry} 0 1 1 ${base.p1.x} ${base.p1.y} ` +
           `L ${tip.x} ${tip.y} ` +
           `Z`
  }

  toString(): string {
    return `EllipseCallout(${this.center}, ${this.width}x${this.height}, pointer=${this.pointerPosition})`
  }
}

/**
 * Create an ellipse callout shape
 */
export function ellipseCallout(options?: EllipseCalloutOptions): EllipseCallout {
  return new EllipseCallout(options)
}
