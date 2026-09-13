import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad } from '../utils/math'
import { Path, path } from './Path'

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
 * Create a curly brace path between two points
 */
export function bracePath(
  from: PointLike,
  to: PointLike,
  amplitude: number = 10,
  position: 'left' | 'right' = 'left'
): Path {
  const start = point(from.x, from.y)
  const end = point(to.x, to.y)
  const mid = start.toward(end, 0.5)

  const angle = start.angleTo(end)
  const normalAngle = angle + (position === 'left' ? 90 : -90)
  const rad = degToRad(normalAngle)

  // Brace tip
  const tip = point(
    mid.x + amplitude * Math.cos(rad),
    mid.y + amplitude * Math.sin(rad)
  )

  // Control points for the curved brace
  const q1 = start.toward(mid, 0.25)
  const q3 = mid.toward(end, 0.75)

  const cp1 = point(
    q1.x + amplitude * 0.5 * Math.cos(rad),
    q1.y + amplitude * 0.5 * Math.sin(rad)
  )
  const cp2 = point(
    tip.x - (mid.x - q1.x) * 0.3,
    tip.y - (mid.y - q1.y) * 0.3
  )
  const cp3 = point(
    tip.x + (q3.x - mid.x) * 0.3,
    tip.y + (q3.y - mid.y) * 0.3
  )
  const cp4 = point(
    q3.x + amplitude * 0.5 * Math.cos(rad),
    q3.y + amplitude * 0.5 * Math.sin(rad)
  )

  return path()
    .moveTo(start)
    .curveTo(cp1, cp2, tip)
    .curveTo(cp3, cp4, end)
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
