import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { anchorOnCircle, type AnchorSpec } from '../../core/Anchor'
import { Circle } from '../../geometry/Circle'
import type { Shape, ShapeOptions } from '../../geometry/Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../../geometry/Shape'
import { EPSILON } from '../../utils/math'

/**
 * TikZ's `double distance` — the gap left between the two strokes.
 * `accepting by double` sets `outer sep=.5\pgflinewidth+.3pt`, and the
 * source comments that `.3pt` is *half* the double width distance, so
 * the distance itself is `0.6`.
 */
export const DOUBLE_DISTANCE = 0.6

/**
 * Default centre-to-centre gap between the two rings: TikZ's
 * {@link DOUBLE_DISTANCE} plus the line width it separates. TikZ's
 * `\pgflinewidth` defaults to 0.4pt where jikz strokes at 1, so this is
 * `1 + 0.6` — the value that leaves a real 0.6 gap between the strokes
 * at jikz's default stroke width. Draw thicker and pass `separation`.
 */
export const DOUBLE_SEPARATION_DEFAULT = 1 + DOUBLE_DISTANCE

/** Options for {@link DoubleCircle}. */
export interface DoubleCircleOptions extends ShapeOptions {
  /**
   * Centre-to-centre distance between the two rings.
   * Default: {@link DOUBLE_SEPARATION_DEFAULT}.
   */
  separation?: number
}

/**
 * Two concentric rings — TikZ's `double` border, as worn by an
 * `accepting` state.
 *
 * TikZ does not draw a second circle: it strokes the node's own path
 * once at `2·linewidth + double distance` and again at `double
 * distance` in the background colour, so the doubled border *straddles*
 * the boundary. This reproduces that as two real rings at
 * `radius ± separation/2`, which keeps one path and one paint (SVG's
 * nonzero rule fills the disc solid, so a label still sits on the
 * node's fill rather than a hole).
 *
 * The nominal `radius` is therefore the same circle a plain `state`
 * would have. Anchors and bounds report the **outer** ring, which is
 * what TikZ's `outer sep=.5\pgflinewidth+.3pt` achieves — transitions
 * stop at the outside of the doubling rather than between the rings.
 */
export class DoubleCircle implements Shape {
  readonly type = 'double circle' as const
  readonly center: Point
  /** The doubled path itself — a plain state's circle. */
  readonly radius: number
  readonly separation: number

  constructor(options: DoubleCircleOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.separation = Math.abs(options.separation ?? DOUBLE_SEPARATION_DEFAULT)
    const size = Math.max(opts.width, opts.height, opts.minWidth, opts.minHeight)
    this.radius = size / 2
  }

  /** Outer ring — the one anchors and bounds follow. */
  get outerRadius(): number {
    return this.radius + this.separation / 2
  }

  /** Inner ring. Collapses to zero rather than inverting on a tiny node. */
  get innerRadius(): number {
    return Math.max(0, this.radius - this.separation / 2)
  }

  get width(): number {
    return this.outerRadius * 2
  }

  get height(): number {
    return this.outerRadius * 2
  }

  get bounds(): [number, number, number, number] {
    const r = this.outerRadius
    return [this.center.x - r, this.center.y - r, this.center.x + r, this.center.y + r]
  }

  anchor(spec: AnchorSpec): Point {
    return anchorOnCircle(this.center, this.outerRadius, spec)
  }

  boundaryPoint(angle: number): Point {
    return anchorOnCircle(this.center, this.outerRadius, angle)
  }

  contains(p: PointLike): boolean {
    return this.center.distanceTo(p) <= this.outerRadius + EPSILON
  }

  /** Both rings, wound the same way so the disc fills solid. */
  toSVGPath(): string {
    const outer = new Circle(this.center, this.outerRadius).toSVGPath()
    const inner = new Circle(this.center, this.innerRadius).toSVGPath()
    return `${outer} ${inner}`
  }

  moveTo(newCenter: PointLike): DoubleCircle {
    return new DoubleCircle({
      center: newCenter,
      width: this.radius * 2,
      height: this.radius * 2,
      separation: this.separation,
    })
  }

  /** Scales so the **outer** ring matches the requested box. */
  resize(width: number, height: number): DoubleCircle {
    const nominal = Math.max(0, Math.max(width, height) / 2 - this.separation / 2)
    return new DoubleCircle({
      center: this.center,
      width: nominal * 2,
      height: nominal * 2,
      separation: this.separation,
    })
  }

  toString(): string {
    return `DoubleCircle(${this.center}, r=${this.radius}, sep=${this.separation})`
  }
}
