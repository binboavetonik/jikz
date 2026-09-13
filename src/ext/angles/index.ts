/**
 * Angle marks — jikz's analogue of TikZ's `angles` library, which
 * defines the `angle` and `right angle` pics.
 *
 * TikZ draws an angle in two pieces that straddle the path they are
 * attached to: a filled *sector* behind it (the pic's `background
 * code`, drawn `draw=none`) and a stroked *arc* in front (the
 * `foreground code`, drawn `fill=none`). jikz has no host path to
 * straddle, so the two pieces come back as plain values and paint
 * order is whatever order you draw them in:
 *
 * ```ts
 * const a = angleMark(A, B, C, { radius: 46 })
 * pic.fill(a.wedge, { style: { fill: '#dbeafe' } })   // behind
 * pic.pen().moveTo(B).lineTo(A).moveTo(B).lineTo(C)   // the rays
 * pic.draw(a.outline, { style: { stroke: '#2563eb' } })  // in front
 * pic.text(a.labelAt, '$\\alpha$')
 * ```
 *
 * **The middle argument is the vertex**, matching TikZ's
 * `{angle = A--B--C}`. Argument order is significant, not symmetric:
 * `angleMark(A, B, C)` and `angleMark(C, B, A)` mark the two
 * *different* angles at B, exactly as the TikZ pic does.
 *
 * Two places this departs from TikZ, both deliberately:
 *
 *   - TikZ requires A, B and C to be **names** of nodes or coordinates
 *     ("you cannot use direct coordinates like `(1,1)` here") — a TeX
 *     parsing limit. These take any `PointLike`.
 *   - The returned {@link AngleMark} also reports `sweep`, the measure
 *     of the marked angle in degrees, which TikZ computes internally
 *     and throws away. Handy for labelling a diagram with the angle it
 *     actually shows.
 *
 * One TikZ feature does not carry over: the manual's
 * `pic ["$\\alpha$", draw, ->] {angle}` puts an arrow tip on the arc.
 * jikz honors `arrowEnd` on edges only, so `outline` always renders
 * unmarked — closing that means teaching the renderer to mark bare
 * renderables, which is a core change, not an extension one.
 *
 * Angles follow jikz's screen convention (y down, 0° = east, degrees
 * increasing clockwise on screen). TikZ's y axis points up, so a
 * picture ported by flipping y produces the same image under the same
 * arithmetic — the mirrored sweep is the mirrored figure.
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { Arc } from '../../geometry/Arc'
import { Path, pathFrom, polygonPath, polylinePath } from '../../path/Path'

/** TeX points per millimetre (72.27 pt / 25.4 mm). */
const PT_PER_MM = 72.27 / 25.4

/**
 * Default mark radius — TikZ's `angle radius=5mm` in the points jikz
 * counts in (`inner sep=4pt` maps to `innerSep: 4`). ≈ 14.23, which is
 * deliberately small; most diagrams pass an explicit radius.
 */
export const ANGLE_RADIUS_DEFAULT = 5 * PT_PER_MM

/** What TikZ falls back to when `angle radius` is not positive. */
export const ANGLE_RADIUS_FALLBACK = 12

/** TikZ's `angle eccentricity` initial value. */
export const ANGLE_ECCENTRICITY_DEFAULT = 0.6

/**
 * Extra label distance for a right angle: TikZ pushes the text out by
 * a hard-coded `1.4142136` so it clears the corner of the square
 * rather than the midpoint of a chord.
 */
export const RIGHT_ANGLE_LABEL_FACTOR = Math.SQRT2

/** Options for {@link angleMark} and {@link rightAngleMark}. */
export interface AngleMarkOptions {
  /**
   * Length of the wedge's sides — TikZ's `angle radius`. For a right
   * angle this is the side of the square. Non-positive values fall
   * back to {@link ANGLE_RADIUS_FALLBACK}, as in TikZ.
   * Default: {@link ANGLE_RADIUS_DEFAULT}.
   */
  radius?: number
  /**
   * Where {@link AngleMark.labelAt} sits, as a fraction of `radius`
   * along the bisector — TikZ's `angle eccentricity`. `1` puts the
   * label on the arc itself. Default:
   * {@link ANGLE_ECCENTRICITY_DEFAULT}.
   */
  eccentricity?: number
}

/**
 * The pieces of one angle mark. `wedge` and `outline` are TikZ's
 * background and foreground code respectively; draw the wedge with a
 * fill and the outline with a stroke.
 */
export interface AngleMark {
  /** The vertex — the middle argument. */
  readonly vertex: Point
  /** Radius actually used, after the non-positive fallback. */
  readonly radius: number
  /**
   * Stroked outline: an {@link Arc} for {@link angleMark}, an open
   * two-segment corner for {@link rightAngleMark}. Both are renderable
   * as-is, so `pic.draw(mark.outline)` type-checks.
   */
  readonly outline: Arc | Path
  /** Closed, fillable sector (or square, for a right angle). */
  readonly wedge: Path
  /** Where a label goes — `eccentricity × radius` along the bisector. */
  readonly labelAt: Point
  /** Direction of the ray towards the first argument, in degrees. */
  readonly startAngle: number
  /** Direction of the ray towards the third argument, in degrees. */
  readonly endAngle: number
  /**
   * The marked angle's measure in degrees, in `[0, 360)`. This is the
   * angle swept from `startAngle` to `endAngle`; swapping the first
   * and third arguments gives `360 - sweep`.
   */
  readonly sweep: number
}

/**
 * Ray directions from the vertex, with TikZ's normalization: both
 * measured with `atan2`, then the start pushed back a full turn when
 * it would otherwise sit after the end, so the sweep always runs
 * forwards and lands in `[0, 360)`.
 */
function rays(
  a: PointLike,
  vertex: Point,
  c: PointLike
): { start: number; end: number; sweep: number } {
  const end = vertex.angleTo(c)
  let start = vertex.angleTo(a)
  if (end < start) start -= 360
  return { start, end, sweep: end - start }
}

/** Resolve the two options against TikZ's defaults and fallback. */
function settings(options?: AngleMarkOptions): { radius: number; eccentricity: number } {
  const requested = options?.radius ?? ANGLE_RADIUS_DEFAULT
  return {
    radius: requested > 0 ? requested : ANGLE_RADIUS_FALLBACK,
    eccentricity: options?.eccentricity ?? ANGLE_ECCENTRICITY_DEFAULT,
  }
}

/**
 * Mark the angle at `vertex` between the rays towards `a` and `c` —
 * TikZ's `pic {angle = a--vertex--c}`.
 *
 * ```ts
 * const a = angleMark(A, B, C, { radius: 46 })
 * pic.fill(a.wedge, { style: { fill: '#dbeafe' } })
 * pic.draw(a.outline, { style: { stroke: '#2563eb' }, arrowEnd: 'stealth' })
 * ```
 *
 * Note one representational edge: when `a` and `c` lie in exactly the
 * same direction the marked angle is zero, and `sweep` reports `0`
 * accordingly — but `outline` is an {@link Arc}, which cannot express
 * a zero sweep and renders as the full circle. Guard on `sweep` if
 * your input can be degenerate.
 */
export function angleMark(
  a: PointLike,
  vertex: PointLike,
  c: PointLike,
  options?: AngleMarkOptions
): AngleMark {
  const b = point(vertex.x, vertex.y)
  const { radius, eccentricity } = settings(options)
  const { start, end, sweep } = rays(a, b, c)

  const from = b.add(polar(start, radius))
  const to = b.add(polar(end, radius))

  return {
    vertex: b,
    radius,
    outline: new Arc(b, radius, start, end, false),
    wedge: pathFrom(b)
      .lineTo(from)
      .circularArcTo(radius, sweep > 180, true, to)
      .close(),
    labelAt: b.add(polar((start + end) / 2, eccentricity * radius)),
    startAngle: start,
    endAngle: end,
    sweep,
  }
}

/**
 * Mark the angle at `vertex` with a square rather than an arc —
 * TikZ's `pic {right angle = a--vertex--c}`.
 *
 * As in TikZ the corner is built from the two ray directions and is
 * drawn whatever the actual angle is: it is a square only when the
 * rays really are perpendicular, and a rhombus otherwise. Check
 * `sweep` first if the input is not known to be a right angle.
 */
export function rightAngleMark(
  a: PointLike,
  vertex: PointLike,
  c: PointLike,
  options?: AngleMarkOptions
): AngleMark {
  const b = point(vertex.x, vertex.y)
  const { radius, eccentricity } = settings(options)
  const { start, end, sweep } = rays(a, b, c)

  const from = b.add(polar(start, radius))
  const to = b.add(polar(end, radius))
  const corner = from.add(polar(end, radius))

  return {
    vertex: b,
    radius,
    outline: polylinePath([from, corner, to]),
    wedge: polygonPath([b, from, corner, to]),
    labelAt: b.add(
      polar((start + end) / 2, eccentricity * RIGHT_ANGLE_LABEL_FACTOR * radius)
    ),
    startAngle: start,
    endAngle: end,
    sweep,
  }
}
