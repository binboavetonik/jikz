import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to magnetic tape shape
 */
export interface MagneticTapeOptions extends ShapeOptions {
  /**
   * Angle where the tail starts in degrees (default: -30)
   */
  tailStartAngle?: number

  /**
   * Length of the tail as ratio of radius (default: 0.5)
   */
  tailLength?: number
}

/**
 * A magnetic tape reel shape (circle with tail for data storage)
 *
 * Visual:
 * ```
 *    .---.
 *   /     \
 *  |   o   |
 *   \     /
 *    '-+-'
 *       \___
 * ```
 */
export class MagneticTape implements Shape {
  readonly type = 'magnetic tape' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly tailStartAngle: number
  readonly tailLength: number

  constructor(options: MagneticTapeOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    // Screen convention: +30° is visually down-right (the doc sketch
    // above). Was −30° under the old math convention.
    this.tailStartAngle = options.tailStartAngle ?? 30
    this.tailLength = options.tailLength ?? 0.5

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Radius of the tape reel — sized so reel + tail fit inside the
   * declared box.
   */
  get radius(): number {
    const hw = this.width / 2
    const hh = this.height / 2
    // Tail extends ~1.37r right of the reel center; reel spans ±r.
    return Math.max(4, Math.min(hw / 1.4, hh))
  }

  /**
   * Center of the reel — shifted left by half the tail overhang so the
   * total extent (reel + tail) is centered on `at`.
   */
  private get reelCenter(): Point {
    const r = this.radius
    const overhang = (r * Math.cos(degToRad(this.tailStartAngle)) + r * this.tailLength - r) / 2
    return point(this.center.x - Math.max(overhang, 0), this.center.y)
  }

  /**
   * Get the tail start point on the circle
   */
  get tailStart(): Point {
    const rad = degToRad(this.tailStartAngle)
    const r = this.radius
    const rc = this.reelCenter
    return point(rc.x + r * Math.cos(rad), rc.y + r * Math.sin(rad))
  }

  /**
   * Get the tail end point
   */
  get tailEnd(): Point {
    const start = this.tailStart
    const r = this.radius
    const len = r * this.tailLength
    // Tail extends horizontally to the right, then down
    return point(start.x + len, start.y + len * 0.5)
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const r = this.radius
      const rc = this.reelCenter

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'tail start':
          return this.tailStart
        case 'tail end':
          return this.tailEnd
        case 'north':
        case 'n':
          return point(rc.x, rc.y - r - sep)
        case 'south':
        case 's':
          return point(rc.x, rc.y + r + sep)
        case 'east':
        case 'e':
          return point(rc.x + r + sep, rc.y)
        case 'west':
        case 'w':
          return point(rc.x - r - sep, rc.y)
        case 'north east':
        case 'ne':
          return point(rc.x + r * 0.707 + sep * 0.7, rc.y - r * 0.707 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(rc.x - r * 0.707 - sep * 0.7, rc.y - r * 0.707 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(rc.x + r * 0.707 + sep * 0.7, rc.y + r * 0.707 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(rc.x - r * 0.707 - sep * 0.7, rc.y + r * 0.707 + sep * 0.7)
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
    const rc = this.reelCenter
    return point(rc.x + r * Math.cos(rad), rc.y + r * Math.sin(rad))
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
    // Check main circle
    const rc = this.reelCenter
    const dx = p.x - rc.x
    const dy = p.y - rc.y
    const r = this.radius
    if (dx * dx + dy * dy <= r * r) return true

    // Could add tail check here if needed
    return false
  }

  get bounds(): [number, number, number, number] {
    const r = this.radius
    const tailEnd = this.tailEnd

    const rc = this.reelCenter
    return [
      Math.min(rc.x - r, tailEnd.x),
      Math.min(rc.y - r, tailEnd.y),
      Math.max(rc.x + r, tailEnd.x),
      Math.max(rc.y + r, tailEnd.y),
    ]
  }

  moveTo(center: PointLike): MagneticTape {
    return new MagneticTape({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      tailStartAngle: this.tailStartAngle,
      tailLength: this.tailLength,
    })
  }

  resize(width: number, height: number): MagneticTape {
    return new MagneticTape({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      tailStartAngle: this.tailStartAngle,
      tailLength: this.tailLength,
    })
  }

  toSVGPath(): string {
    const r = this.radius
    const rc = this.reelCenter
    const cx = rc.x
    const cy = rc.y
    const tailStart = this.tailStart
    const tailEnd = this.tailEnd

    // Main circle with gap for tail
    const gapAngle = 30 // degrees for the gap
    const endRad = degToRad(this.tailStartAngle + gapAngle)

    const arcStart = point(cx + r * Math.cos(endRad), cy + r * Math.sin(endRad))
    const arcEnd = tailStart

    // Draw circle arc (most of circle)
    const circlePath = `M ${arcStart.x} ${arcStart.y} ` +
                       `A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`

    // Draw tail as curved path
    const midX = (tailStart.x + tailEnd.x) / 2
    const midY = tailStart.y
    const tailPath = `L ${midX} ${midY} Q ${tailEnd.x} ${midY} ${tailEnd.x} ${tailEnd.y}`

    return `${circlePath} ${tailPath}`
  }

  toString(): string {
    return `MagneticTape(${this.center}, r=${this.radius})`
  }
}

/**
 * Create a magnetic tape shape
 */
export function magneticTape(options?: MagneticTapeOptions): MagneticTape {
  return new MagneticTape(options)
}
