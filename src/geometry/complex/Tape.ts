import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to tape shape
 */
export interface TapeOptions extends ShapeOptions {
  /**
   * Height of the bend/curve (default: 8)
   */
  bendHeight?: number

  /**
   * Position of the bend midpoint 0-1 (default: 0.5)
   */
  bendPosition?: number
}

/**
 * A tape/ticket shape with curved top and bottom edges
 *
 * Visual:
 * ```
 *   ~~~~~~~~~
 *  |         |
 *  |         |
 *   ~~~~~~~~~
 * ```
 */
export class Tape implements Shape {
  readonly type = 'tape' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly bendHeight: number
  readonly bendPosition: number

  constructor(options: TapeOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.bendHeight = options.bendHeight ?? 8
    this.bendPosition = Math.max(0, Math.min(1, options.bendPosition ?? 0.5))

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the corner points (for approximation and anchors)
   */
  private get corners(): { tl: Point; tr: Point; br: Point; bl: Point } {
    const hw = this.width / 2
    const hh = this.height / 2
    return {
      tl: point(this.center.x - hw, this.center.y - hh),
      tr: point(this.center.x + hw, this.center.y - hh),
      br: point(this.center.x + hw, this.center.y + hh),
      bl: point(this.center.x - hw, this.center.y + hh),
    }
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const { tl, tr, br, bl } = this.corners

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          // Top edge of the declared box (the wave touches it at the corners)
          return point(this.center.x, tl.y - sep)
        case 'south':
        case 's':
          return point(this.center.x, bl.y + sep)
        case 'east':
        case 'e':
          return point(tr.x + sep, this.center.y)
        case 'west':
        case 'w':
          return point(tl.x - sep, this.center.y)
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

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    // Approximate boundary using the declared rectangle; the wavy edge
    // bends inward, so the box edge is the boundary.
    const rad = degToRad(angle)
    const hw = this.width / 2
    const hh = this.height / 2

    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // Find intersection with bounding rectangle
    let t = Infinity

    if (Math.abs(cos) > 1e-10) {
      const tx = (cos > 0 ? hw : -hw) / cos
      if (tx > 0) t = Math.min(t, tx)
    }
    if (Math.abs(sin) > 1e-10) {
      const ty = (sin > 0 ? hh : -hh) / sin
      if (ty > 0) t = Math.min(t, ty)
    }

    return point(this.center.x + t * cos, this.center.y + t * sin)
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
    // Approximate with the declared bounding rectangle
    const hw = this.width / 2
    const hh = this.height / 2
    const dx = Math.abs(p.x - this.center.x)
    const dy = Math.abs(p.y - this.center.y)
    return dx <= hw && dy <= hh
  }

  get bounds(): [number, number, number, number] {
    // The wavy edges bend INWARD from the declared box (see toSVGPath),
    // so the declared box is the true extent.
    const hw = this.width / 2
    const hh = this.height / 2
    return [
      this.center.x - hw,
      this.center.y - hh,
      this.center.x + hw,
      this.center.y + hh,
    ]
  }

  moveTo(center: PointLike): Tape {
    return new Tape({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      bendHeight: this.bendHeight,
      bendPosition: this.bendPosition,
    })
  }

  resize(width: number, height: number): Tape {
    return new Tape({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      bendHeight: this.bendHeight,
      bendPosition: this.bendPosition,
    })
  }

  toSVGPath(): string {
    const hw = this.width / 2
    const hh = this.height / 2
    const bend = this.bendHeight
    const bendX = this.center.x - hw + this.width * this.bendPosition

    // Control points for the curves
    const cx = this.center.x
    const cy = this.center.y

    // Top edge: starts at top-left, curves down at bend point, continues to top-right
    // Bottom edge: starts at bottom-right, curves up at bend point, continues to bottom-left

    const topLeft = point(cx - hw, cy - hh)
    const topRight = point(cx + hw, cy - hh)
    const bottomRight = point(cx + hw, cy + hh)
    const bottomLeft = point(cx - hw, cy + hh)

    // Using quadratic bezier curves for the wavy effect
    // Top edge bends down (concave)
    // Bottom edge bends down (convex from inside)

    const topControlY = cy - hh + bend
    const bottomControlY = cy + hh - bend

    return `M ${topLeft.x} ${topLeft.y} ` +
           `Q ${bendX} ${topControlY} ${topRight.x} ${topRight.y} ` +
           `L ${bottomRight.x} ${bottomRight.y} ` +
           `Q ${bendX} ${bottomControlY} ${bottomLeft.x} ${bottomLeft.y} ` +
           `Z`
  }

  toString(): string {
    return `Tape(${this.center}, ${this.width}x${this.height}, bend=${this.bendHeight})`
  }
}

/**
 * Create a tape shape
 */
export function tape(options?: TapeOptions): Tape {
  return new Tape(options)
}
