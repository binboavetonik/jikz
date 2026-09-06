import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'
import { degToRad } from '../../utils/math'

/**
 * Signal pointer direction
 */
export type SignalDirection = 'east' | 'west' | 'north' | 'south' | 'nowhere'

/**
 * Options specific to signal shape
 */
export interface SignalOptions extends ShapeOptions {
  /**
   * Where the signal comes from (default: 'west')
   */
  from?: SignalDirection

  /**
   * Where the signal points to (default: 'east')
   */
  to?: SignalDirection

  /**
   * Angle of the pointer in degrees (default: 90)
   */
  pointerAngle?: number
}

/**
 * A ribbon/chevron signal shape that can point in cardinal directions
 *
 * Visual (from: 'west', to: 'east'):
 * ```
 *   _________
 *  /         \>
 *  \_________/>
 * ```
 */
export class Signal extends AnchoredPolygon {
  readonly type = 'signal' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly from: SignalDirection
  readonly to: SignalDirection
  readonly pointerAngle: number

  constructor(options: SignalOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.from = options.from ?? 'west'
    this.to = options.to ?? 'east'
    this.pointerAngle = options.pointerAngle ?? 90

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Calculate the pointer depth based on angle and height
   */
  private get pointerDepth(): number {
    const halfAngle = this.pointerAngle / 2
    const halfHeight = this.isHorizontal ? this.height / 2 : this.width / 2
    return halfHeight / Math.tan(degToRad(halfAngle))
  }

  private get isHorizontal(): boolean {
    return (this.from === 'west' || this.from === 'east' || this.from === 'nowhere') &&
           (this.to === 'west' || this.to === 'east' || this.to === 'nowhere')
  }

  /**
   * Get the vertices of the signal shape
   */
  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    const depth = this.pointerDepth

    const pts: Point[] = []

    if (this.isHorizontal) {
      // Horizontal signal
      const leftX = -hw + (this.from === 'west' ? depth : 0)
      const rightX = hw - (this.to === 'east' ? depth : 0)

      // Start from top-left, go clockwise
      if (this.from === 'west') {
        pts.push(point(-hw, 0)) // left point (incoming)
        pts.push(point(leftX, -hh)) // top after point
      } else {
        pts.push(point(-hw, -hh)) // top-left corner
      }

      if (this.to === 'east') {
        pts.push(point(rightX, -hh)) // top before point
        pts.push(point(hw, 0)) // right point (outgoing)
        pts.push(point(rightX, hh)) // bottom after point
      } else {
        pts.push(point(hw, -hh)) // top-right corner
        pts.push(point(hw, hh)) // bottom-right corner
      }

      if (this.from === 'west') {
        pts.push(point(leftX, hh)) // bottom before point
      } else {
        pts.push(point(-hw, hh)) // bottom-left corner
      }
    } else {
      // Vertical signal
      const topY = -hh + (this.from === 'north' ? depth : 0)
      const bottomY = hh - (this.to === 'south' ? depth : 0)

      // Start from top-left, go clockwise
      if (this.from === 'north') {
        pts.push(point(0, -hh)) // top point (incoming)
        pts.push(point(hw, topY)) // right after point
      } else {
        pts.push(point(-hw, -hh)) // top-left
        pts.push(point(hw, -hh)) // top-right
      }

      if (this.to === 'south') {
        pts.push(point(hw, bottomY)) // right before point
        pts.push(point(0, hh)) // bottom point (outgoing)
        pts.push(point(-hw, bottomY)) // left after point
      } else {
        pts.push(point(hw, hh)) // bottom-right
        pts.push(point(-hw, hh)) // bottom-left
      }

      if (this.from === 'north') {
        pts.push(point(-hw, topY)) // left before point
      }
    }

    return pts.map(p => p.add(this.center))
  }

  moveTo(center: PointLike): Signal {
    return new Signal({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      from: this.from,
      to: this.to,
      pointerAngle: this.pointerAngle,
    })
  }

  resize(width: number, height: number): Signal {
    return new Signal({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      from: this.from,
      to: this.to,
      pointerAngle: this.pointerAngle,
    })
  }

  toString(): string {
    return `Signal(${this.center}, ${this.width}x${this.height}, from=${this.from}, to=${this.to})`
  }
}

/**
 * Create a signal shape
 */
export function signal(options?: SignalOptions): Signal {
  return new Signal(options)
}
