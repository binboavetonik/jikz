/**
 * SVG 1.1 §F.6.5 arc math for Path `A` segments: endpoint → center
 * parameterization, length, point/tangent at length-fraction t, and
 * exact bounds extremes.
 *
 * Conventions: jikz screen space IS SVG space — y down, angles
 * clockwise-positive with 0° = east — so the spec formulas port
 * without sign flips: `sweep = true` means travel with INCREASING
 * angle (visually clockwise on screen).
 *
 * Angles in {@link ArcCenterParams} live in the ellipse's LOCAL
 * (unrotated) frame; apply {@link arcAnglePoint} to map back.
 *
 * Analysis only: these helpers never alter what `toSVGPath` emits.
 */
import { Point, point } from '../core/Point'
import type { PathSegment } from './Path'
import { degToRad, radToDeg, normalizeAngle, EPSILON, approxEqual } from '../utils/math'

/**
 * Center parameterization of an SVG arc segment: the ellipse center,
 * (possibly corrected) radii, rotation, and the sweep expressed as
 * start angle + signed delta in the ellipse's local frame.
 */
export interface ArcCenterParams {
  center: Point
  /** Radii after F.6.6 correction — always > 0. */
  rx: number
  ry: number
  /** X-axis rotation, degrees. */
  rotation: number
  /** Start angle θ₁, degrees, ellipse-local frame. */
  startAngle: number
  /** Signed sweep Δθ, degrees — positive when `sweep = true`. */
  sweepAngle: number
}

/**
 * Convert an endpoint-parameterized `A` segment (plus the pen's
 * current point) to center parameterization, per F.6.5.1 with the
 * F.6.6 radius correction (undersized radii scale up by √Λ).
 *
 * Returns null for the degenerate cases the spec reduces to a line or
 * nothing: `rx`/`ry` zero, or `from == end`.
 */
export function endpointToCenter(from: Point, seg: PathSegment): ArcCenterParams | null {
  const end = seg.points[0]
  if (!end || seg.rx === undefined || seg.ry === undefined) return null
  let rx = Math.abs(seg.rx)
  let ry = Math.abs(seg.ry)
  if (rx < EPSILON || ry < EPSILON) return null
  if (approxEqual(from.x, end.x, EPSILON) && approxEqual(from.y, end.y, EPSILON)) {
    return null
  }

  const phi = degToRad(seg.rotation ?? 0)
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  // Step 1: chord midpoint in the ellipse's local frame
  const dx = (from.x - end.x) / 2
  const dy = (from.y - end.y) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy

  // Step 2 (F.6.6): radii too small for the chord → scale up
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }

  // Step 3: center in the local frame — sign picks the solution pair
  const rx2 = rx * rx
  const ry2 = ry * ry
  const x1p2 = x1p * x1p
  const y1p2 = y1p * y1p
  const num = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2
  const den = rx2 * y1p2 + ry2 * x1p2
  const sign = Boolean(seg.largeArc) !== Boolean(seg.sweep) ? 1 : -1
  const factor = sign * Math.sqrt(Math.max(0, num / den))
  const cxp = (factor * rx * y1p) / ry
  const cyp = (-factor * ry * x1p) / rx

  // Step 4: center back in user space
  const cx = cosPhi * cxp - sinPhi * cyp + (from.x + end.x) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (from.y + end.y) / 2

  // Step 5: start angle and signed sweep (F.6.5.5/.6)
  const ux = (x1p - cxp) / rx
  const uy = (y1p - cyp) / ry
  // the END point's local frame coords are (−x1', −y1')
  const vx = (-x1p - cxp) / rx
  const vy = (-y1p - cyp) / ry
  const startAngle = radToDeg(Math.atan2(uy, ux))
  let sweepAngle = vectorAngle(ux, uy, vx, vy)
  if (!seg.sweep && sweepAngle > 0) sweepAngle -= 360
  if (seg.sweep && sweepAngle < 0) sweepAngle += 360

  return {
    center: point(cx, cy),
    rx,
    ry,
    rotation: seg.rotation ?? 0,
    startAngle,
    sweepAngle,
  }
}

/** Signed angle from u to v, degrees in (−180, 180] (screen frame). */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  return radToDeg(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy))
}

/** Point on the ellipse at local-frame angle θ (degrees). */
export function arcAnglePoint(p: ArcCenterParams, theta: number): Point {
  const rad = degToRad(theta)
  const phi = degToRad(p.rotation)
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const ex = p.rx * Math.cos(rad)
  const ey = p.ry * Math.sin(rad)
  return point(
    cosPhi * ex - sinPhi * ey + p.center.x,
    sinPhi * ex + cosPhi * ey + p.center.y
  )
}

/**
 * Arc length. Exact for circular arcs (r·|Δθ|); elliptical arcs use a
 * chord-sum table (also the basis for {@link arcPointAt}'s inversion).
 */
export function arcLength(p: ArcCenterParams): number {
  if (approxEqual(p.rx, p.ry)) {
    return p.rx * Math.abs(degToRad(p.sweepAngle))
  }
  const table = chordTable(p)
  return table[table.length - 1]!
}

/**
 * Point at length-fraction t ∈ [0,1] along the arc. Circular arcs are
 * linear in θ; elliptical arcs invert the chord-sum table by binary
 * search with linear interpolation.
 */
export function arcPointAt(p: ArcCenterParams, t: number): Point {
  if (t <= 0) return arcAnglePoint(p, p.startAngle)
  if (t >= 1) return arcAnglePoint(p, p.startAngle + p.sweepAngle)
  if (approxEqual(p.rx, p.ry)) {
    return arcAnglePoint(p, p.startAngle + t * p.sweepAngle)
  }
  const table = chordTable(p)
  const total = table[table.length - 1]!
  const target = t * total
  let lo = 0
  let hi = table.length - 1
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    if (table[mid]! <= target) lo = mid
    else hi = mid
  }
  const segLen = table[hi]! - table[lo]!
  const local = segLen > EPSILON ? (target - table[lo]!) / segLen : 0
  const steps = table.length - 1
  const theta =
    p.startAngle + ((lo + local) / steps) * p.sweepAngle
  return arcAnglePoint(p, theta)
}

/**
 * Tangent direction (screen degrees) at length-fraction t, in the
 * direction of travel. `d/dθ = (−rx·sinθ, ry·cosθ)` in the local
 * frame, rotated by φ; travel reverses when the sweep is negative.
 */
export function arcTangentAt(p: ArcCenterParams, t: number): number {
  const theta = p.startAngle + t * p.sweepAngle
  const rad = degToRad(theta)
  const phi = degToRad(p.rotation)
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const ex = -p.rx * Math.sin(rad)
  const ey = p.ry * Math.cos(rad)
  let tx = cosPhi * ex - sinPhi * ey
  let ty = sinPhi * ex + cosPhi * ey
  if (p.sweepAngle < 0) {
    tx = -tx
    ty = -ty
  }
  return radToDeg(Math.atan2(ty, tx))
}

/**
 * The arc's axis-aligned extreme points: where the rotated ellipse's
 * tangent is vertical (x-extremes) or horizontal (y-extremes), kept
 * only when they lie inside the sweep. Endpoints are NOT included —
 * callers already have them.
 */
export function arcExtremes(p: ArcCenterParams): Point[] {
  const phi = degToRad(p.rotation)
  // x-extremes: tanθ = −ry·sinφ / (rx·cosφ); y-extremes: tanθ = ry·cosφ / (rx·sinφ)
  const candidates = [
    radToDeg(Math.atan2(-p.ry * Math.sin(phi), p.rx * Math.cos(phi))),
    radToDeg(Math.atan2(p.ry * Math.cos(phi), p.rx * Math.sin(phi))),
  ]
  const out: Point[] = []
  for (const base of candidates) {
    for (const theta of [base, base + 180]) {
      if (angleInSweep(theta, p.startAngle, p.sweepAngle)) {
        out.push(arcAnglePoint(p, theta))
      }
    }
  }
  return out
}

/** Is θ (degrees, local frame) inside [start, start+sweep]? */
function angleInSweep(theta: number, start: number, sweep: number): boolean {
  const rel = normalizeAngle(theta - start) // [0, 360)
  if (sweep >= 0) return rel <= sweep + 1e-9
  return rel >= 360 + sweep - 1e-9
}

/** Cumulative chord lengths over SAMPLES steps across the sweep. */
const SAMPLES = 48

function chordTable(p: ArcCenterParams): number[] {
  const table: number[] = [0]
  let prev = arcAnglePoint(p, p.startAngle)
  for (let i = 1; i <= SAMPLES; i++) {
    const next = arcAnglePoint(p, p.startAngle + (i / SAMPLES) * p.sweepAngle)
    table.push(table[i - 1]! + prev.distanceTo(next))
    prev = next
  }
  return table
}
