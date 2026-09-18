/**
 * Angle marks — jikz's analogue of TikZ's `angles` library.
 *
 * TikZ draws `pic {angle = A--B--C}` as two paints: a background
 * wedge that takes the pic's `fill`, and a foreground arc that takes
 * its `draw`, with the label `"…"` at `angle eccentricity` times the
 * radius along the bisector. That is a split-paint object, which is
 * what a {@link Paintable} is for — so an {@link AngleMark} is one
 * value you hand to a draw verb, and the verb's mode is TikZ's `pic
 * actions`:
 *
 * ```ts
 * import { angle, rightAngle } from '@ozan.e/jikz/angles'
 *
 * pic.filldraw(angle(A, B, C, { label: '$\\alpha$' }), { style: { stroke: '#2563eb', fill: '#dbeafe' } })
 * pic.draw(angle(B, O, A, { radius: 30 }))       // arc only, like [draw]
 * pic.fill(rightAngle(A, B, C))                    // wedge only, like [fill]
 * ```
 *
 * The angle is swept from `B→A` to `B→C` counter-clockwise as seen on
 * the page, exactly as TikZ orders the corners; swap `A` and `C` for
 * the other one. Radius and eccentricity default to TikZ's `angle
 * radius=5mm` and `angle eccentricity=.6`.
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { mm } from '../../core/units'
import { Path, path } from '../../path/Path'
import type { Bounds, PaintContext, Paintable } from '../../render/Renderer'
import type { TextStyle } from '../../text/Label'
import type { Frame } from '../../picture/Frame'

/** TikZ `angle radius`, initially 5mm. */
export const ANGLE_RADIUS = mm(5)

/** TikZ `angle eccentricity`, initially .6. */
export const ANGLE_ECCENTRICITY = 0.6

export interface AngleOptions {
  /** Arc radius, px (TikZ `angle radius`). */
  radius?: number
  /** Label distance from the vertex as a multiple of the radius (TikZ `angle eccentricity`). */
  eccentricity?: number
  /** The label (TikZ's `"…"`); `$…$` renders as math. */
  label?: string
  /** Style of the label text. */
  labelStyle?: TextStyle
}

/**
 * An angle mark: a wedge, an arc, and a label. Renderable through any
 * draw verb (it paints itself) and mappable into a math-frame picture.
 */
export class AngleMark implements Paintable {
  readonly kind = 'angle' as const
  readonly A: Point
  readonly B: Point
  readonly C: Point
  readonly radius: number
  readonly eccentricity: number
  readonly label?: string
  readonly labelStyle?: TextStyle
  /** Whether this is the right-angle (square) marker. */
  readonly right: boolean

  constructor(A: PointLike, B: PointLike, C: PointLike, options: AngleOptions = {}, right = false) {
    this.A = point(A.x, A.y)
    this.B = point(B.x, B.y)
    this.C = point(C.x, C.y)
    this.radius = options.radius ?? ANGLE_RADIUS
    this.eccentricity = options.eccentricity ?? ANGLE_ECCENTRICITY
    this.label = options.label
    this.labelStyle = options.labelStyle
    this.right = right
  }

  /** Screen angle of the ray B→A (where the sweep starts). */
  get startAngle(): number {
    return this.B.angleTo(this.A)
  }

  /**
   * Screen angle of the ray B→C, brought into `(start − 360, start]` so
   * the sweep from start to end is counter-clockwise on the page.
   */
  get endAngle(): number {
    const s = this.startAngle
    let e = this.B.angleTo(this.C)
    while (e > s) e -= 360
    return e
  }

  /** The angle's measure in degrees, counter-clockwise from B→A to B→C. */
  get degrees(): number {
    return this.startAngle - this.endAngle
  }

  /** The bisector's screen angle. */
  get bisector(): number {
    return (this.startAngle + this.endAngle) / 2
  }

  /** The wedge TikZ fills (`pic actions` fill). */
  sectorPath(): Path {
    const { B } = this
    if (this.right) {
      const s = this.ray(this.startAngle).sub(B)
      const e = this.ray(this.endAngle).sub(B)
      return path().moveTo(B).lineTo(B.add(s)).lineTo(B.add(s).add(e)).lineTo(B.add(e)).close()
    }
    return this.arcInto(path().moveTo(B).lineTo(this.ray(this.startAngle))).close()
  }

  /** The arc TikZ strokes (`pic actions` draw). */
  arcPath(): Path {
    const { B } = this
    if (this.right) {
      const s = this.ray(this.startAngle).sub(B)
      const e = this.ray(this.endAngle).sub(B)
      return path().moveTo(B.add(s)).lineTo(B.add(s).add(e)).lineTo(B.add(e))
    }
    return this.arcInto(path().moveTo(this.ray(this.startAngle)))
  }

  /** Append the arc from the start ray to the end ray (counter-clockwise on screen: sweep 0). */
  private arcInto(p: Path): Path {
    return p.circularArcTo(this.radius, this.degrees > 180, false, this.ray(this.endAngle))
  }

  /** The point `radius` from B along a screen angle, snapped (cos 90° is 6e-17, not 0). */
  private ray(angle: number): Point {
    const q = this.B.add(polar(angle, this.radius))
    return point(Math.round(q.x * 1e9) / 1e9, Math.round(q.y * 1e9) / 1e9)
  }

  /** Where the label sits: `eccentricity × radius` along the bisector (×√2 for a right angle). */
  labelPoint(): Point {
    const d = this.eccentricity * this.radius * (this.right ? Math.SQRT2 : 1)
    return this.B.add(polar(this.bisector, d))
  }

  get bounds(): Bounds {
    const b = this.sectorPath().bounds
    if (!this.label) return b
    const l = this.labelPoint()
    return [Math.min(b[0], l.x - 6), Math.min(b[1], l.y - 6), Math.max(b[2], l.x + 6), Math.max(b[3], l.y + 6)]
  }

  toSVGPath(): string {
    return this.sectorPath().toSVGPath()
  }

  paint({ target, style, attrs, options, renderer }: PaintContext): void {
    if (style.fill && style.fill !== 'none') {
      target.path(this.sectorPath().toSVGPath()).attr({ ...attrs, stroke: 'none' })
    }
    if (style.stroke && style.stroke !== 'none') {
      target.path(this.arcPath().toSVGPath()).attr({ ...attrs, fill: 'none' })
    }
    if (this.label) {
      const text = { ...options?.textStyle, ...this.labelStyle }
      renderer.renderText(this.label, this.labelPoint(), {
        textAnchor: 'middle',
        dominantBaseline: 'middle',
        fontSize: text.fontSize,
        fontFamily: text.fontFamily,
        fontWeight: text.fontWeight,
        style: { fill: text.fill ?? style.stroke ?? '#000' },
      })
    }
  }

  /** The same mark with its corners written in `frame` — see {@link Frame}. */
  mapFrame(frame: Frame): AngleMark {
    return new AngleMark(
      frame.point(this.A),
      frame.point(this.B),
      frame.point(this.C),
      { radius: this.radius, eccentricity: this.eccentricity, label: this.label, labelStyle: this.labelStyle },
      this.right
    )
  }
}

/** TikZ `pic {angle = A--B--C}`: the angle at `B`, swept from `A` to `C`. */
export function angle(A: PointLike, B: PointLike, C: PointLike, options: AngleOptions = {}): AngleMark {
  return new AngleMark(A, B, C, options)
}

/** TikZ `pic {right angle = A--B--C}`: the square marker at `B`. */
export function rightAngle(A: PointLike, B: PointLike, C: PointLike, options: AngleOptions = {}): AngleMark {
  return new AngleMark(A, B, C, options, true)
}
