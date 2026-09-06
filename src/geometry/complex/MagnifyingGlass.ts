import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to magnifying glass shape
 */
export interface MagnifyingGlassOptions extends ShapeOptions {
  /**
   * Angle of the handle in degrees (default: -45, pointing to bottom-right)
   */
  handleAngle?: number

  /**
   * Length of the handle as ratio of radius (default: 0.7)
   */
  handleLength?: number

  /**
   * Width of the handle as ratio of radius (default: 0.15)
   */
  handleWidth?: number
}

/**
 * A magnifying glass shape
 *
 * Visual:
 * ```
 *    .---.
 *   /     \
 *  |       |
 *   \     /
 *    '-+-'
 *      \
 *       \
 * ```
 */
export class MagnifyingGlass implements Shape {
  readonly type = 'magnifying glass' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly handleAngle: number
  readonly handleLength: number
  readonly handleWidth: number

  constructor(options: MagnifyingGlassOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    // Screen convention: +45° is visually down-right (the doc sketch
    // above). Was −45° under the old math convention.
    this.handleAngle = options.handleAngle ?? 45
    this.handleLength = options.handleLength ?? 0.7
    this.handleWidth = options.handleWidth ?? 0.15

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Radius of the lens — sized so lens + handle fit inside the
   * declared box along the handle direction (approximate, ≤1px slack).
   */
  get lensRadius(): number {
    const hw = this.width / 2
    const hh = this.height / 2
    const rad = degToRad(this.handleAngle)
    const tx = Math.cos(rad) !== 0 ? hw / Math.abs(Math.cos(rad)) : Infinity
    const ty = Math.sin(rad) !== 0 ? hh / Math.abs(Math.sin(rad)) : Infinity
    const tBox = Math.min(tx, ty)
    // Along the handle axis the tip reaches ~1.45r from `at` after
    // recentering; perpendicular the lens spans ~1.1r.
    return Math.max(4, Math.min(tBox / 1.45, Math.min(hw, hh) / 1.1))
  }

  /**
   * Center of the lens — shifted opposite the handle so the total
   * extent (lens + handle) is centered on `at`.
   */
  get lensCenter(): Point {
    const rad = degToRad(this.handleAngle)
    const offset = this.lensRadius * 0.25
    return point(
      this.center.x - offset * Math.cos(rad),
      this.center.y - offset * Math.sin(rad)
    )
  }

  /**
   * Get the handle end point
   */
  get handleEnd(): Point {
    const rad = degToRad(this.handleAngle)
    const r = this.lensRadius
    const len = r * this.handleLength
    const lc = this.lensCenter
    return point(
      lc.x + (r + len) * Math.cos(rad),
      lc.y + (r + len) * Math.sin(rad)
    )
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const r = this.lensRadius
      const lc = this.lensCenter

      switch (normalized) {
        case 'center':
        case 'c':
        case 'lens center':
          return lc
        case 'handle':
        case 'handle end':
          return this.handleEnd
        case 'north':
        case 'n':
          return point(lc.x, lc.y - r - sep)
        case 'south':
        case 's':
          return point(lc.x, lc.y + r + sep)
        case 'east':
        case 'e':
          return point(lc.x + r + sep, lc.y)
        case 'west':
        case 'w':
          return point(lc.x - r - sep, lc.y)
        case 'north east':
        case 'ne':
          return point(lc.x + r * 0.707 + sep * 0.7, lc.y - r * 0.707 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(lc.x - r * 0.707 - sep * 0.7, lc.y - r * 0.707 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(lc.x + r * 0.707 + sep * 0.7, lc.y + r * 0.707 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(lc.x - r * 0.707 - sep * 0.7, lc.y + r * 0.707 + sep * 0.7)
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.lensCenter
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle)
    const r = this.lensRadius
    const lc = this.lensCenter
    return point(
      lc.x + r * Math.cos(rad),
      lc.y + r * Math.sin(rad)
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
    // Check lens circle
    const lc = this.lensCenter
    const r = this.lensRadius
    const dx = p.x - lc.x
    const dy = p.y - lc.y
    if (dx * dx + dy * dy <= r * r) return true

    // Check handle (simplified as line segment)
    const handleRad = degToRad(this.handleAngle)
    const handleStart = point(
      lc.x + r * Math.cos(handleRad),
      lc.y + r * Math.sin(handleRad)
    )
    const handleEnd = this.handleEnd
    const handleW = r * this.handleWidth

    // Distance from point to line segment
    const hdx = handleEnd.x - handleStart.x
    const hdy = handleEnd.y - handleStart.y
    const len2 = hdx * hdx + hdy * hdy
    const t = Math.max(0, Math.min(1, ((p.x - handleStart.x) * hdx + (p.y - handleStart.y) * hdy) / len2))
    const projX = handleStart.x + t * hdx
    const projY = handleStart.y + t * hdy
    const dist2 = (p.x - projX) ** 2 + (p.y - projY) ** 2

    return dist2 <= handleW * handleW

  }

  get bounds(): [number, number, number, number] {
    const lc = this.lensCenter
    const r = this.lensRadius
    const handleEnd = this.handleEnd

    const minX = Math.min(lc.x - r, handleEnd.x)
    const minY = Math.min(lc.y - r, handleEnd.y)
    const maxX = Math.max(lc.x + r, handleEnd.x)
    const maxY = Math.max(lc.y + r, handleEnd.y)

    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): MagnifyingGlass {
    return new MagnifyingGlass({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      handleAngle: this.handleAngle,
      handleLength: this.handleLength,
      handleWidth: this.handleWidth,
    })
  }

  resize(width: number, height: number): MagnifyingGlass {
    return new MagnifyingGlass({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      handleAngle: this.handleAngle,
      handleLength: this.handleLength,
      handleWidth: this.handleWidth,
    })
  }

  toSVGPath(): string {
    const lc = this.lensCenter
    const r = this.lensRadius
    const handleRad = degToRad(this.handleAngle)
    const handleW = r * this.handleWidth

    // Lens circle
    const lensPath = `M ${lc.x + r} ${lc.y} ` +
                     `A ${r} ${r} 0 1 1 ${lc.x - r} ${lc.y} ` +
                     `A ${r} ${r} 0 1 1 ${lc.x + r} ${lc.y}`

    // Handle as rectangle
    const handleStart = point(
      lc.x + r * Math.cos(handleRad),
      lc.y + r * Math.sin(handleRad)
    )
    const handleEnd = this.handleEnd

    // Perpendicular direction for handle width
    const perpX = -Math.sin(handleRad) * handleW
    const perpY = Math.cos(handleRad) * handleW

    const handlePath = `M ${handleStart.x + perpX} ${handleStart.y + perpY} ` +
                       `L ${handleEnd.x + perpX} ${handleEnd.y + perpY} ` +
                       `L ${handleEnd.x - perpX} ${handleEnd.y - perpY} ` +
                       `L ${handleStart.x - perpX} ${handleStart.y - perpY} Z`

    return `${lensPath} ${handlePath}`
  }

  toString(): string {
    return `MagnifyingGlass(${this.center}, r=${this.lensRadius})`
  }
}

/**
 * Create a magnifying glass shape
 */
export function magnifyingGlass(options?: MagnifyingGlassOptions): MagnifyingGlass {
  return new MagnifyingGlass(options)
}
