import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'

/**
 * Options specific to kite shape
 */
export interface KiteOptions extends ShapeOptions {
  /**
   * Position of the vertex along the vertical axis (0-1, default: 0.35)
   * 0 = at top, 1 = at bottom
   */
  vertexPosition?: number
}

/**
 * A kite shape (quadrilateral with two pairs of adjacent equal sides)
 *
 * Visual:
 * ```
 *       *
 *      /|\
 *     / | \
 *    *  |  *
 *     \ | /
 *      \|/
 *       *
 * ```
 *
 * Anchors: compass anchors resolve to the exact vertices (TikZ-style:
 * `east` is the right vertex, not the edge midpoint), plus named
 * vertex anchors (`'upper vertex'`/`'top'`, …) via {@link customAnchor}.
 */
export class Kite extends AnchoredPolygon {
  readonly type = 'kite' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly vertexPosition: number

  constructor(options: KiteOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.vertexPosition = Math.max(0, Math.min(1, options.vertexPosition ?? 0.35))

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the four vertices of the kite
   */
  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    const vertY = -hh + this.height * this.vertexPosition

    return [
      point(this.center.x, this.center.y - hh),          // top
      point(this.center.x + hw, this.center.y + vertY),  // right
      point(this.center.x, this.center.y + hh),          // bottom
      point(this.center.x - hw, this.center.y + vertY),  // left
    ]
  }

  protected customAnchor(normalized: string): Point | null {
    const sep = this.outerSep
    const verts = this.vertices

    switch (normalized) {
      // Compass anchors land on the exact vertices (TikZ-style)
      case 'north':
      case 'n':
        return verts[0]!.add(0, -sep)
      case 'south':
      case 's':
        return verts[2]!.add(0, sep)
      case 'east':
      case 'e':
        return verts[1]!.add(sep, 0)
      case 'west':
      case 'w':
        return verts[3]!.add(-sep, 0)
      // Named vertex anchors
      case 'upper vertex':
      case 'top':
        return verts[0]!
      case 'lower vertex':
      case 'bottom':
        return verts[2]!
      case 'left vertex':
      case 'left':
        return verts[3]!
      case 'right vertex':
      case 'right':
        return verts[1]!
    }
    return null
  }

  moveTo(center: PointLike): Kite {
    return new Kite({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      vertexPosition: this.vertexPosition,
    })
  }

  resize(width: number, height: number): Kite {
    return new Kite({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      vertexPosition: this.vertexPosition,
    })
  }

  toString(): string {
    return `Kite(${this.center}, ${this.width}x${this.height})`
  }
}

/**
 * Create a kite shape
 */
export function kite(options?: KiteOptions): Kite {
  return new Kite(options)
}
