import { Point, point } from '../core/Point'
import { degToRad, EPSILON } from '../utils/math'

/**
 * Routing options for a single Bézier segment — the TikZ
 * `to[out=…, in=…, looseness=…]` keys, shared by {@link Edge} routing
 * and the pen's `to()` verb.
 *
 * Angle convention is the library's screen convention: 0° = east,
 * 90° = south (down), 270° = north (up); clockwise positive.
 */
export interface BezierRouteOptions {
  /**
   * Angle (degrees) at which the curve leaves the start point. When
   * omitted it defaults to the straight-line direction toward the end.
   */
  out?: number
  /**
   * Angle (degrees) at which the curve arrives at the end point, naming
   * the direction of travel **into** the point — so `in: 0` means
   * "arrive heading east" (from the west side).
   */
  in?: number
  /**
   * Symmetric bend. A positive angle (or `'left'`) bends LEFT of travel
   * (TikZ `bend left`); `'right'`/negative bends right. `'left'` and
   * `'right'` use TikZ's default bend angle of 30°.
   */
  bend?: number | 'left' | 'right'
  /** Scales both control-point distances (TikZ `looseness`, default 1). */
  looseness?: number
  /** Looseness for the outgoing control point only (overrides looseness). */
  outLooseness?: number
  /** Looseness for the incoming control point only (overrides looseness). */
  inLooseness?: number
}

function ctrl(p: Point, dist: number, angle: number): Point {
  return point(
    p.x + dist * Math.cos(degToRad(angle)),
    p.y + dist * Math.sin(degToRad(angle))
  )
}

/**
 * Compute the two cubic-Bézier control points for a curved segment from
 * `from` to `to`, from TikZ-style `out`/`in`/`bend`/`looseness` options.
 *
 * - `out`/`in` give absolute departure/arrival angles.
 * - `bend` gives a symmetric bend; positive bends LEFT of travel (TikZ
 *   `bend left`), which rotates the outgoing direction by −angle in the
 *   clockwise-positive screen convention.
 * - With no routing keys the control points sit on the chord (a straight
 *   cubic), so a plain `to` is exactly `--`.
 *
 * A zero-length chord (a self-loop) uses a nominal length so `looseness`
 * alone drives the loop size — TikZ's loop opens regardless.
 */
export function bezierControlPoints(
  from: Point,
  to: Point,
  options: BezierRouteOptions = {}
): [Point, Point] {
  const { out, in: inAngle, looseness = 1, outLooseness, inLooseness } = options
  const bend = options.bend ?? 0
  const bendAngle = bend === 'left' ? 30 : bend === 'right' ? -30 : bend

  const length = from.distanceTo(to)
  const effectiveLength = length < EPSILON ? 40 : length
  const baseAngle = from.angleTo(to)

  const baseDist = effectiveLength * looseness * 0.4
  const outDist = effectiveLength * (outLooseness ?? looseness) * 0.4
  const inDist = effectiveLength * (inLooseness ?? looseness) * 0.4

  if (out !== undefined || inAngle !== undefined) {
    const outAng = out ?? baseAngle
    const inAng = inAngle !== undefined ? inAngle + 180 : baseAngle + 180
    return [ctrl(from, outDist, outAng), ctrl(to, inDist, inAng)]
  }

  if (bendAngle !== 0) {
    const outAngle = baseAngle - bendAngle
    const inAngle = baseAngle + 180 + bendAngle
    return [ctrl(from, baseDist, outAngle), ctrl(to, baseDist, inAngle)]
  }

  // Straight bezier — control points on the chord.
  return [from.toward(to, 0.33), from.toward(to, 0.67)]
}
