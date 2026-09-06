import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'

/**
 * Options specific to dart shape
 */
export interface DartOptions extends ShapeOptions {
  /**
   * Depth of the indentation at the tail (default: 0.3)
   * 0 = no indent (triangle), 1 = indent reaches the tip
   */
  tailIndent?: number
}

/**
 * A dart/arrowhead shape (concave kite)
 *
 * Visual:
 * ```
 *       *
 *      /|\
 *     / | \
 *    /  |  \
 *   *   |   *
 *    \  |  /
 *     \ * /
 * ```
 *
 * Anchors: `north`/`tip` is the tip vertex, `south`/`tail` the tail
 * indent, `south east`/`south west` the tail vertices, plus
 * `'left tail'`/`'right tail'`/`'tail indent'` via
 * {@link customAnchor}. Other compass anchors ray-cast the outline.
 */
export class Dart extends AnchoredPolygon {
  readonly type = 'dart' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly tailIndent: number

  constructor(options: DartOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.tailIndent = Math.max(0, Math.min(1, options.tailIndent ?? 0.3))

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the four vertices of the dart
   */
  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    const indentY = hh - this.tailIndent * this.height

    return [
      point(this.center.x, this.center.y - hh),      // tip (top)
      point(this.center.x + hw, this.center.y + hh), // right tail
      point(this.center.x, this.center.y + indentY), // tail indent
      point(this.center.x - hw, this.center.y + hh), // left tail
    ]
  }

  protected customAnchor(normalized: string): Point | null {
    const sep = this.outerSep
    const verts = this.vertices

    switch (normalized) {
      case 'north':
      case 'n':
      case 'tip':
        return verts[0]!.add(0, -sep)
      case 'south':
      case 's':
      case 'tail':
        return verts[2]!.add(0, sep)
      case 'south east':
      case 'se':
        return verts[1]!.add(sep * 0.7, sep * 0.7)
      case 'south west':
      case 'sw':
        return verts[3]!.add(-sep * 0.7, sep * 0.7)
      case 'left tail':
        return verts[3]!
      case 'right tail':
        return verts[1]!
      case 'tail indent':
        return verts[2]!
    }
    return null
  }

  moveTo(center: PointLike): Dart {
    return new Dart({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      tailIndent: this.tailIndent,
    })
  }

  resize(width: number, height: number): Dart {
    return new Dart({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      tailIndent: this.tailIndent,
    })
  }

  toString(): string {
    return `Dart(${this.center}, ${this.width}x${this.height})`
  }
}

/**
 * Create a dart shape
 */
export function dart(options?: DartOptions): Dart {
  return new Dart(options)
}
