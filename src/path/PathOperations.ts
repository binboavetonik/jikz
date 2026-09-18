import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad } from '../utils/math'
import { Path, path, type PathSegment } from './Path'

// ─────────────────────────────────────────────────────────────────────────────
// Path Decorations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decoration types
 */
export type DecorationType = 'arrow' | 'stealth' | 'latex' | 'tick' | 'bar' | 'circle' | 'square'

/**
 * Decoration position
 */
export type DecorationPosition = 'start' | 'end' | 'mid' | number

/**
 * Options for path decorations
 */
export interface DecorationOptions {
  /**
   * Position along the path (0-1, or 'start', 'end', 'mid')
   */
  position?: DecorationPosition

  /**
   * Size of the decoration
   */
  size?: number

  /**
   * Rotation offset in degrees
   */
  rotation?: number

  /**
   * Whether to flip the decoration
   */
  flip?: boolean
}

const DEFAULT_DECORATION_OPTIONS: Required<DecorationOptions> = {
  position: 'end',
  size: 10,
  rotation: 0,
  flip: false,
}

/**
 * Get a point and tangent angle along a path
 */
function getPointAndTangent(
  p: Path,
  position: DecorationPosition
): { point: Point; angle: number } {
  let t: number
  if (position === 'start') t = 0
  else if (position === 'end') t = 1
  else if (position === 'mid') t = 0.5
  else t = position

  const pt = p.pointAt(t)

  // Calculate tangent by sampling nearby points
  const delta = 0.001
  const p1 = p.pointAt(Math.max(0, t - delta))
  const p2 = p.pointAt(Math.min(1, t + delta))
  const angle = p1.angleTo(p2)

  return { point: pt, angle }
}

/**
 * Create an arrow decoration path
 */
export function arrowDecoration(
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const { point: pt, angle } = getPointAndTangent(basePath, opts.position)

  const size = opts.size
  const rad = degToRad(angle + opts.rotation + (opts.flip ? 180 : 0))

  // Arrow points
  const tip = pt
  const left = point(
    tip.x - size * Math.cos(rad - 0.4),
    tip.y - size * Math.sin(rad - 0.4)
  )
  const right = point(
    tip.x - size * Math.cos(rad + 0.4),
    tip.y - size * Math.sin(rad + 0.4)
  )

  return path()
    .moveTo(left)
    .lineTo(tip)
    .lineTo(right)
}

/**
 * Create a stealth arrow decoration path (filled)
 */
export function stealthDecoration(
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const { point: pt, angle } = getPointAndTangent(basePath, opts.position)

  const size = opts.size
  const rad = degToRad(angle + opts.rotation + (opts.flip ? 180 : 0))

  // Stealth arrow points
  const tip = pt
  const left = point(
    tip.x - size * Math.cos(rad - 0.35),
    tip.y - size * Math.sin(rad - 0.35)
  )
  const right = point(
    tip.x - size * Math.cos(rad + 0.35),
    tip.y - size * Math.sin(rad + 0.35)
  )
  const back = point(
    tip.x - size * 0.6 * Math.cos(rad),
    tip.y - size * 0.6 * Math.sin(rad)
  )

  return path()
    .moveTo(tip)
    .lineTo(left)
    .lineTo(back)
    .lineTo(right)
    .close()
}

/**
 * Create a tick decoration path
 */
export function tickDecoration(
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const { point: pt, angle } = getPointAndTangent(basePath, opts.position)

  const size = opts.size / 2
  const rad = degToRad(angle + opts.rotation + 90) // Perpendicular

  const p1 = point(pt.x + size * Math.cos(rad), pt.y + size * Math.sin(rad))
  const p2 = point(pt.x - size * Math.cos(rad), pt.y - size * Math.sin(rad))

  return path().moveTo(p1).lineTo(p2)
}

/**
 * Create a bar (stop) decoration path
 */
export function barDecoration(
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  return tickDecoration(basePath, { ...options, size: (options.size ?? 10) * 1.5 })
}

/**
 * Create a circle decoration path
 */
export function circleDecoration(
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const { point: pt } = getPointAndTangent(basePath, opts.position)

  const r = opts.size / 3
  return path()
    .moveTo(point(pt.x + r, pt.y))
    .arcTo(r, r, 0, false, true, point(pt.x - r, pt.y))
    .arcTo(r, r, 0, false, true, point(pt.x + r, pt.y))
    .close()
}

/**
 * Create a square decoration path
 */
export function squareDecoration(
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const { point: pt, angle } = getPointAndTangent(basePath, opts.position)

  const size = opts.size / 3
  const rad = degToRad(angle + opts.rotation)

  // Rotated square corners
  const corners = [
    point(-size, -size),
    point(size, -size),
    point(size, size),
    point(-size, size),
  ].map((p) => {
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return point(
      pt.x + p.x * cos - p.y * sin,
      pt.y + p.x * sin + p.y * cos
    )
  })

  return path()
    .moveTo(corners[0]!)
    .lineTo(corners[1]!)
    .lineTo(corners[2]!)
    .lineTo(corners[3]!)
    .close()
}

/**
 * Create a decoration of the specified type
 */
export function decoration(
  type: DecorationType,
  basePath: Path,
  options: DecorationOptions = {}
): Path {
  switch (type) {
    case 'arrow':
      return arrowDecoration(basePath, options)
    case 'stealth':
      return stealthDecoration(basePath, options)
    case 'latex':
      return arrowDecoration(basePath, options)
    case 'tick':
      return tickDecoration(basePath, options)
    case 'bar':
      return barDecoration(basePath, options)
    case 'circle':
      return circleDecoration(basePath, options)
    case 'square':
      return squareDecoration(basePath, options)
    default:
      return path()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dash pattern specification
 */
export interface DashPattern {
  /**
   * Array of dash and gap lengths. Readonly so the `as const` entries of
   * `DASH_PATTERNS` (and any frozen user table) are accepted as-is.
   */
  pattern: readonly number[]

  /**
   * Offset to start the pattern
   */
  offset?: number
}

/**
 * Common dash patterns
 *
 * @deprecated Legacy decoration-era values that do NOT match TikZ.
 * Use the `dash` style field with TikZ's names (`'dashed'`,
 * `'densely dotted'`, …) — resolved TikZ-exact and width-aware via
 * `dashArrayFor` in the render layer.
 */
export const DASH_PATTERNS = {
  solid: { pattern: [] },
  dashed: { pattern: [8, 4] },
  dotted: { pattern: [2, 4] },
  dashDot: { pattern: [8, 4, 2, 4] },
  dashDotDot: { pattern: [8, 4, 2, 4, 2, 4] },
  looseDashed: { pattern: [12, 8] },
  denseDashed: { pattern: [4, 2] },
} as const

/**
 * Convert dash pattern to SVG stroke-dasharray
 */
export function dashPatternToSVG(pattern: DashPattern): string {
  if (pattern.pattern.length === 0) return ''
  return pattern.pattern.join(' ')
}

/**
 * Create an offset path (parallel to the original)
 */
export function offsetPath(p: Path, distance: number): Path {
  if (p.isEmpty) return path()

  // Simple offset: sample points along path and offset perpendicular
  const samples = 20
  const offsetPoints: Point[] = []

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const pt = p.pointAt(t)

    // Calculate tangent and normal
    const delta = 0.01
    const p1 = p.pointAt(Math.max(0, t - delta))
    const p2 = p.pointAt(Math.min(1, t + delta))
    const tangentAngle = p1.angleTo(p2)
    const normalAngle = tangentAngle + 90

    const rad = degToRad(normalAngle)
    const offsetPt = point(
      pt.x + distance * Math.cos(rad),
      pt.y + distance * Math.sin(rad)
    )
    offsetPoints.push(offsetPt)
  }

  // Build path from offset points
  if (offsetPoints.length === 0) return path()

  let result = path().moveTo(offsetPoints[0]!)
  for (let i = 1; i < offsetPoints.length; i++) {
    result = result.lineTo(offsetPoints[i]!)
  }

  return result
}

/**
 * Create a double line path (two parallel lines)
 */
export function doublePath(p: Path, separation: number): [Path, Path] {
  return [offsetPath(p, separation / 2), offsetPath(p, -separation / 2)]
}

/**
 * Subdivide a path into smaller segments
 */
export function subdividePath(p: Path, segments: number): Path {
  if (p.isEmpty || segments < 2) return p

  const points: Point[] = []
  for (let i = 0; i <= segments; i++) {
    points.push(p.pointAt(i / segments))
  }

  let result = path().moveTo(points[0]!)
  for (let i = 1; i < points.length; i++) {
    result = result.lineTo(points[i]!)
  }

  if (p.isClosed) {
    result = result.close()
  }

  return result
}

/**
 * Smooth a path by converting line segments to curves
 */
export function smoothPath(p: Path, tension: number = 0.5): Path {
  const points = p.allPoints
  if (points.length < 3) return p

  let result = path().moveTo(points[0]!)

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const next = points[i + 1]!

    // Calculate control point using Catmull-Rom to Bezier conversion
    const cp1 = point(
      curr.x - (next.x - prev.x) * tension / 6,
      curr.y - (next.y - prev.y) * tension / 6
    )

    result = result.curveTo(
      prev.toward(curr, 0.5 + tension * 0.5),
      cp1,
      curr
    )
  }

  // Final segment
  const last = points[points.length - 1]!
  result = result.lineTo(last)

  if (p.isClosed) {
    result = result.close()
  }

  return result
}

/**
 * Round the corners of a path — TikZ `rounded corners=<inset>`.
 *
 * Every corner where two straight segments meet (including the closing
 * corner of a closed subpath) is replaced by a circular arc tangent to
 * both: `inset` is cut from each segment at the vertex and the arc
 * spans the gap, so on a right angle the inset is the radius, as in
 * TikZ. The inset is capped at half of either adjacent segment, which
 * keeps short segments from turning inside out. Corners next to a
 * curve or an arc, and collinear "corners", are left alone.
 */
export function roundCorners(p: Path, inset: number): Path {
  if (inset <= 0 || p.isEmpty) return p
  // Split into subpaths on M, keeping each subpath's closing flag.
  const subpaths: { start: Point; points: Point[]; closed: boolean; straight: boolean }[] = []
  let current: (typeof subpaths)[number] | null = null
  for (const seg of p.segments) {
    if (seg.type === 'M') {
      current = { start: seg.points[0]!, points: [], closed: false, straight: true }
      subpaths.push(current)
    } else if (!current) {
      continue
    } else if (seg.type === 'L') {
      current.points.push(seg.points[0]!)
    } else if (seg.type === 'Z') {
      current.closed = true
    } else {
      current.straight = false
      current.points.push(...seg.points)
    }
  }
  if (!subpaths.some((s) => s.straight)) return p

  const out: PathSegment[] = []
  for (const sp of subpaths) {
    if (!sp.straight) {
      // Reproduce untouched (we cannot re-derive curve segments from
      // points alone, so copy the originals).
      out.push(...segmentsOfSubpath(p, sp.start))
      continue
    }
    const pts = [sp.start, ...sp.points]
    // A closed polygon whose last point repeats the first: drop it.
    if (sp.closed && pts.length > 1 && pts[pts.length - 1]!.equals(pts[0]!)) pts.pop()
    const n = pts.length
    if (n < 3 || (!sp.closed && n < 3)) {
      out.push({ type: 'M', points: [pts[0]!] })
      for (const q of pts.slice(1)) out.push({ type: 'L', points: [q] })
      if (sp.closed) out.push({ type: 'Z', points: [] })
      continue
    }
    const corner = (i: number) => {
      const prev = pts[(i - 1 + n) % n]!
      const v = pts[i]!
      const next = pts[(i + 1) % n]!
      const inLen = prev.distanceTo(v)
      const outLen = v.distanceTo(next)
      if (inLen < 1e-9 || outLen < 1e-9) return null
      const dIn = v.sub(prev).scale(1 / inLen)
      const dOut = next.sub(v).scale(1 / outLen)
      const cross = dIn.x * dOut.y - dIn.y * dOut.x
      const dot = dIn.x * dOut.x + dIn.y * dOut.y
      if (Math.abs(cross) < 1e-9) return null // collinear or a spike
      const t = Math.min(inset, inLen / 2, outLen / 2)
      // Interior angle φ between the two edges; fillet radius for a
      // tangent length t is t·tan(φ/2), with φ = π − turning angle.
      const turn = Math.atan2(Math.abs(cross), dot)
      const radius = Math.round(t * Math.tan((Math.PI - turn) / 2) * 1e9) / 1e9
      return {
        a: v.sub(dIn.scale(t)),
        b: v.add(dOut.scale(t)),
        radius,
        sweep: cross > 0,
      }
    }
    const first = sp.closed ? 0 : 1
    const last = sp.closed ? n - 1 : n - 2
    const corners = pts.map((_, i) => (i >= first && i <= last ? corner(i) : null))
    // Start point: on an open path the first vertex; on a closed one,
    // the end of the first corner's arc (so the path starts on an edge).
    const c0 = corners[0]
    out.push({ type: 'M', points: [sp.closed && c0 ? c0.b : pts[0]!] })
    const emitCorner = (c: NonNullable<ReturnType<typeof corner>>) => {
      out.push({ type: 'L', points: [c.a] })
      out.push({
        type: 'A',
        points: [c.b],
        rx: c.radius,
        ry: c.radius,
        rotation: 0,
        largeArc: false,
        sweep: c.sweep,
      })
    }
    for (let i = 1; i < n; i++) {
      const c = corners[i]
      if (c) emitCorner(c)
      else out.push({ type: 'L', points: [pts[i]!] })
    }
    if (sp.closed) {
      if (c0) emitCorner(c0)
      else out.push({ type: 'L', points: [pts[0]!] })
      out.push({ type: 'Z', points: [] })
    }
  }
  return new Path(out)
}

/** The original segments of the subpath that starts at `start` (M through the next M). */
function segmentsOfSubpath(p: Path, start: Point): PathSegment[] {
  const segs = p.segments
  let i = segs.findIndex((s) => s.type === 'M' && s.points[0] === start)
  if (i < 0) return []
  const out: PathSegment[] = [segs[i]!]
  for (i = i + 1; i < segs.length && segs[i]!.type !== 'M'; i++) out.push(segs[i]!)
  return out
}

/**
 * Trim a path at its ends — TikZ `shorten <`/`shorten >`. The first
 * point moves `start` px into the first segment and the last point
 * `end` px back along the last one (along the final control leg for
 * a curve). Closed paths are returned as they are.
 */
export function shortenPath(p: Path, start: number, end: number): Path {
  if (p.isEmpty || p.isClosed || (start <= 0 && end <= 0)) return p
  const segs = p.segments.map((s) => ({ ...s, points: [...s.points] }))
  const first = segs.findIndex((s) => s.type !== 'M')
  if (first < 1) return p
  if (start > 0) {
    const m = segs[first - 1]!
    const from = m.points[0]!
    const towards = segs[first]!.points[0]!
    m.points[0] = from.towardByDistance(towards, Math.min(start, from.distanceTo(towards)))
  }
  if (end > 0) {
    const last = segs[segs.length - 1]!
    const endPt = last.points[last.points.length - 1]!
    const prev =
      last.points.length > 1
        ? last.points[last.points.length - 2]!
        : (segs[segs.length - 2]?.points.slice(-1)[0] ?? endPt)
    last.points[last.points.length - 1] = endPt.towardByDistance(prev, Math.min(end, endPt.distanceTo(prev)))
  }
  return new Path(segs)
}

/**
 * Extract a portion of a path
 */
export function subPath(p: Path, startT: number, endT: number): Path {
  if (p.isEmpty) return path()

  const samples = Math.max(10, Math.ceil((endT - startT) * 50))
  const points: Point[] = []

  for (let i = 0; i <= samples; i++) {
    const t = startT + (endT - startT) * (i / samples)
    points.push(p.pointAt(t))
  }

  let result = path().moveTo(points[0]!)
  for (let i = 1; i < points.length; i++) {
    result = result.lineTo(points[i]!)
  }

  return result
}

/**
 * Join multiple paths into one
 */
export function joinPaths(paths: Path[], close: boolean = false): Path {
  if (paths.length === 0) return path()

  let result = paths[0]!
  for (let i = 1; i < paths.length; i++) {
    const p = paths[i]!
    if (p.startPoint) {
      result = result.lineTo(p.startPoint)
    }
    // Add all segments except the first M
    for (const seg of p.segments) {
      if (seg.type === 'M') continue
      if (seg.type === 'L' && seg.points[0]) {
        result = result.lineTo(seg.points[0])
      } else if (seg.type === 'C' && seg.points.length >= 3) {
        result = result.curveTo(seg.points[0]!, seg.points[1]!, seg.points[2]!)
      } else if (seg.type === 'Q' && seg.points.length >= 2) {
        result = result.quadraticTo(seg.points[0]!, seg.points[1]!)
      }
    }
  }

  if (close) {
    result = result.close()
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Brace/Bracket Decorations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a curly brace path between two points — TikZ's
 * `decoration={brace}` shape: a foot that curls off the span at each
 * end, a straight body, and a pointed tip in the middle standing
 * `amplitude` off the span, on `position`'s side of start→end.
 *
 * Built from four quarter-circle cubics (k = 4(√2−1)/3), which is what
 * gives the tip its cusp. The previous implementation drew one smooth
 * S through the midpoint, so it rendered as a shallow valley rather
 * than a brace at any amplitude.
 *
 * The curl radius is `amplitude / 2`, clamped so the two halves cannot
 * overlap on a short span.
 */
export function bracePath(
  from: PointLike,
  to: PointLike,
  amplitude: number = 10,
  position: 'left' | 'right' = 'left'
): Path {
  const start = point(from.x, from.y)
  const end = point(to.x, to.y)
  const span = start.distanceTo(end)
  if (span === 0) return path().moveTo(start)

  const angle = start.angleTo(end)
  const alongRad = degToRad(angle)
  const normalRad = degToRad(angle + (position === 'left' ? 90 : -90))
  const ux = Math.cos(alongRad), uy = Math.sin(alongRad)
  const nx = Math.cos(normalRad), ny = Math.sin(normalRad)
  /** Local (along, out) → world. */
  const at = (u: number, v: number): Point =>
    point(start.x + ux * u + nx * v, start.y + uy * u + ny * v)

  // Curl radius: half the stand-off, but never so large that the two
  // halves would meet before the shoulders.
  const r = Math.min(amplitude / 2, span / 4)
  const k = 0.5522847498307936 // circle → cubic control-point factor
  const mid = span / 2

  return path()
    .moveTo(at(0, 0))
    // foot: off the span, turning to run along it
    .curveTo(at(0, r * k), at(r - r * k, r), at(r, r))
    .lineTo(at(mid - r, r))
    // shoulder: up to the tip, arriving perpendicular (the cusp)
    .curveTo(at(mid - r + r * k, r), at(mid, 2 * r - r * k), at(mid, 2 * r))
    // mirror image back down to the far foot
    .curveTo(at(mid, 2 * r - r * k), at(mid + r - r * k, r), at(mid + r, r))
    .lineTo(at(span - r, r))
    .curveTo(at(span - r + r * k, r), at(span, r * k), at(span, 0))
}

/**
 * Create a square bracket path
 */
export function bracketPath(
  from: PointLike,
  to: PointLike,
  size: number = 10,
  position: 'left' | 'right' = 'left'
): Path {
  const start = point(from.x, from.y)
  const end = point(to.x, to.y)

  const angle = start.angleTo(end)
  const normalAngle = angle + (position === 'left' ? 90 : -90)
  const rad = degToRad(normalAngle)

  const offset = point(size * Math.cos(rad), size * Math.sin(rad))

  return path()
    .moveTo(start.add(offset.x, offset.y))
    .lineTo(start)
    .lineTo(end)
    .lineTo(end.add(offset.x, offset.y))
}
