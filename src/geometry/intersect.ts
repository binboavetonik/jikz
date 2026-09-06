import { Point, point } from '../core/Point'
import { EPSILON, approxEqual } from '../utils/math'
import { Line } from './Line'
import { Circle } from './Circle'
import { Arc } from './Arc'
import { Rectangle } from './Rectangle'

/**
 * Result of an intersection calculation
 */
export interface IntersectionResult {
  /** Intersection points */
  points: Point[]
  /** Whether the shapes are coincident (infinite intersections) */
  coincident: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Line-Line Intersection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find intersection of two infinite lines
 */
export function intersectLineLine(
  line1: Line,
  line2: Line,
  epsilon = EPSILON
): IntersectionResult {
  const d1 = line1.direction
  const d2 = line2.direction

  const cross = d1.x * d2.y - d1.y * d2.x

  if (approxEqual(cross, 0, epsilon)) {
    // Lines are parallel - check if coincident
    const toLine2 = point(line2.start.x - line1.start.x, line2.start.y - line1.start.y)
    const crossToLine2 = d1.x * toLine2.y - d1.y * toLine2.x

    if (approxEqual(crossToLine2, 0, epsilon)) {
      return { points: [], coincident: true }
    }
    return { points: [], coincident: false }
  }

  // Lines intersect at a single point
  const t =
    ((line2.start.x - line1.start.x) * d2.y - (line2.start.y - line1.start.y) * d2.x) / cross

  const intersection = line1.at(t)
  return { points: [intersection], coincident: false }
}

/**
 * Find intersection of two line segments
 */
export function intersectSegmentSegment(
  seg1: Line,
  seg2: Line,
  epsilon = EPSILON
): IntersectionResult {
  const result = intersectLineLine(seg1, seg2, epsilon)

  if (result.coincident) {
    // Segments are on the same line - find overlap
    const t1Start = seg2.parameterOf(seg1.start, epsilon)
    const t1End = seg2.parameterOf(seg1.end, epsilon)
    const t2Start = seg1.parameterOf(seg2.start, epsilon)
    const t2End = seg1.parameterOf(seg2.end, epsilon)

    const points: Point[] = []

    // Check if endpoints of seg1 are on seg2
    if (t1Start !== null && t1Start >= 0 && t1Start <= 1) {
      points.push(seg1.start)
    }
    if (t1End !== null && t1End >= 0 && t1End <= 1) {
      if (!points.some((p) => p.equals(seg1.end, epsilon))) {
        points.push(seg1.end)
      }
    }

    // Check if endpoints of seg2 are on seg1
    if (t2Start !== null && t2Start >= 0 && t2Start <= 1) {
      if (!points.some((p) => p.equals(seg2.start, epsilon))) {
        points.push(seg2.start)
      }
    }
    if (t2End !== null && t2End >= 0 && t2End <= 1) {
      if (!points.some((p) => p.equals(seg2.end, epsilon))) {
        points.push(seg2.end)
      }
    }

    return { points, coincident: points.length > 0 }
  }

  if (result.points.length === 0) {
    return result
  }

  // Check if intersection is within both segments
  const intersection = result.points[0]!
  const t1 = seg1.parameterOf(intersection, epsilon)
  const t2 = seg2.parameterOf(intersection, epsilon)

  if (t1 !== null && t2 !== null && t1 >= -epsilon && t1 <= 1 + epsilon && t2 >= -epsilon && t2 <= 1 + epsilon) {
    return { points: [intersection], coincident: false }
  }

  return { points: [], coincident: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Line-Circle Intersection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find intersection of an infinite line and a circle
 */
export function intersectLineCircle(
  line: Line,
  circle: Circle,
  epsilon = EPSILON
): IntersectionResult {
  const d = line.direction
  const f = point(line.start.x - circle.center.x, line.start.y - circle.center.y)

  const a = d.x * d.x + d.y * d.y
  const b = 2 * (f.x * d.x + f.y * d.y)
  const c = f.x * f.x + f.y * f.y - circle.radius * circle.radius

  const discriminant = b * b - 4 * a * c

  if (discriminant < -epsilon) {
    return { points: [], coincident: false }
  }

  if (approxEqual(discriminant, 0, epsilon)) {
    // Tangent - single intersection
    const t = -b / (2 * a)
    return { points: [line.at(t)], coincident: false }
  }

  // Two intersections
  const sqrtDisc = Math.sqrt(discriminant)
  const t1 = (-b - sqrtDisc) / (2 * a)
  const t2 = (-b + sqrtDisc) / (2 * a)

  return { points: [line.at(t1), line.at(t2)], coincident: false }
}

/**
 * Find intersection of a line segment and a circle
 */
export function intersectSegmentCircle(
  segment: Line,
  circle: Circle,
  epsilon = EPSILON
): IntersectionResult {
  const result = intersectLineCircle(segment, circle, epsilon)

  const validPoints = result.points.filter((p) => {
    const t = segment.parameterOf(p, epsilon)
    return t !== null && t >= -epsilon && t <= 1 + epsilon
  })

  return { points: validPoints, coincident: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle-Circle Intersection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find intersection of two circles
 */
export function intersectCircleCircle(
  circle1: Circle,
  circle2: Circle,
  epsilon = EPSILON
): IntersectionResult {
  const dx = circle2.center.x - circle1.center.x
  const dy = circle2.center.y - circle1.center.y
  const d = Math.sqrt(dx * dx + dy * dy)

  // Check for coincident circles
  if (approxEqual(d, 0, epsilon) && approxEqual(circle1.radius, circle2.radius, epsilon)) {
    return { points: [], coincident: true }
  }

  // Check for no intersection (too far apart or one inside the other)
  if (d > circle1.radius + circle2.radius + epsilon) {
    return { points: [], coincident: false }
  }

  if (d + epsilon < Math.abs(circle1.radius - circle2.radius)) {
    return { points: [], coincident: false }
  }

  // Check for tangent (single intersection)
  if (approxEqual(d, circle1.radius + circle2.radius, epsilon) ||
      approxEqual(d, Math.abs(circle1.radius - circle2.radius), epsilon)) {
    const t = circle1.radius / d
    const intersection = point(
      circle1.center.x + dx * t,
      circle1.center.y + dy * t
    )
    return { points: [intersection], coincident: false }
  }

  // Two intersections
  const r1 = circle1.radius
  const r2 = circle2.radius

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(r1 * r1 - a * a)

  const px = circle1.center.x + (a * dx) / d
  const py = circle1.center.y + (a * dy) / d

  const intersection1 = point(px + (h * dy) / d, py - (h * dx) / d)
  const intersection2 = point(px - (h * dy) / d, py + (h * dx) / d)

  return { points: [intersection1, intersection2], coincident: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Arc Intersections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find intersection of a line and an arc
 */
export function intersectLineArc(
  line: Line,
  arc: Arc,
  epsilon = EPSILON
): IntersectionResult {
  const circleResult = intersectLineCircle(line, arc.circle, epsilon)

  const validPoints = circleResult.points.filter((p) => arc.containsPoint(p, epsilon))

  return { points: validPoints, coincident: false }
}

/**
 * Find intersection of a line segment and an arc
 */
export function intersectSegmentArc(
  segment: Line,
  arc: Arc,
  epsilon = EPSILON
): IntersectionResult {
  const result = intersectLineArc(segment, arc, epsilon)

  const validPoints = result.points.filter((p) => {
    const t = segment.parameterOf(p, epsilon)
    return t !== null && t >= -epsilon && t <= 1 + epsilon
  })

  return { points: validPoints, coincident: false }
}

/**
 * Find intersection of two arcs
 */
export function intersectArcArc(arc1: Arc, arc2: Arc, epsilon = EPSILON): IntersectionResult {
  const circleResult = intersectCircleCircle(arc1.circle, arc2.circle, epsilon)

  if (circleResult.coincident) {
    // Arcs lie on the same circle. Intersect their angular ranges.
    const ranges1 = arcAngleRanges(arc1)
    const ranges2 = arcAngleRanges(arc2)
    const overlaps: Array<[number, number]> = []
    for (const r1 of ranges1) {
      for (const r2 of ranges2) {
        const lo = Math.max(r1[0], r2[0])
        const hi = Math.min(r1[1], r2[1])
        if (hi >= lo - epsilon) overlaps.push([lo, hi])
      }
    }

    // Continuous overlap (sweep > epsilon) means infinite intersection points.
    const hasContinuousOverlap = overlaps.some(([lo, hi]) => hi - lo > epsilon)

    // Collect distinct boundary angles as intersection points.
    const angles: number[] = []
    for (const [lo, hi] of overlaps) {
      for (const a of [lo, hi]) {
        const norm = ((a % 360) + 360) % 360
        if (!angles.some((existing) => approxEqual(existing, norm, epsilon))) {
          angles.push(norm)
        }
      }
    }
    const points = angles.map((a) => arc1.circle.pointAt(a))
    return { points, coincident: hasContinuousOverlap }
  }

  const validPoints = circleResult.points.filter(
    (p) => arc1.containsPoint(p, epsilon) && arc2.containsPoint(p, epsilon)
  )

  return { points: validPoints, coincident: false }
}

/**
 * Convert an arc to one or two [lo, hi] angle ranges in degrees,
 * each within [0, 360] (no wrap). A single range is returned when the
 * arc doesn't cross the 0/360 boundary; two ranges otherwise.
 */
function arcAngleRanges(arc: Arc): Array<[number, number]> {
  const start = arc.startAngle
  const sweep = arc.sweep
  if (sweep >= 360 - EPSILON) {
    return [[0, 360]]
  }
  let lo: number
  let hi: number
  if (arc.clockwise) {
    hi = start
    lo = start - sweep
  } else {
    lo = start
    hi = start + sweep
  }
  if (lo >= 0 && hi <= 360) return [[lo, hi]]
  if (lo < 0) return [[0, hi], [lo + 360, 360]]
  return [[0, hi - 360], [lo, 360]]
}

// ─────────────────────────────────────────────────────────────────────────────
// Rectangle Intersections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find intersection of a line and a rectangle boundary
 */
export function intersectLineRect(
  line: Line,
  rect: Rectangle,
  epsilon = EPSILON
): IntersectionResult {
  const points: Point[] = []

  for (const edge of rect.edges) {
    const result = intersectSegmentSegment(line, edge, epsilon)
    for (const p of result.points) {
      if (!points.some((existing) => existing.equals(p, epsilon))) {
        points.push(p)
      }
    }
  }

  return { points, coincident: false }
}

/**
 * Find intersection of a line segment and a rectangle boundary
 */
export function intersectSegmentRect(
  segment: Line,
  rect: Rectangle,
  epsilon = EPSILON
): IntersectionResult {
  const points: Point[] = []

  for (const edge of rect.edges) {
    const result = intersectSegmentSegment(segment, edge, epsilon)
    for (const p of result.points) {
      if (!points.some((existing) => existing.equals(p, epsilon))) {
        points.push(p)
      }
    }
  }

  return { points, coincident: false }
}

/**
 * Find intersection of a circle and a rectangle boundary
 */
export function intersectCircleRect(
  circle: Circle,
  rect: Rectangle,
  epsilon = EPSILON
): IntersectionResult {
  const points: Point[] = []

  for (const edge of rect.edges) {
    const result = intersectSegmentCircle(edge, circle, epsilon)
    for (const p of result.points) {
      if (!points.some((existing) => existing.equals(p, epsilon))) {
        points.push(p)
      }
    }
  }

  return { points, coincident: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Intersection Helper
// ─────────────────────────────────────────────────────────────────────────────

export type IntersectableShape = Line | Circle | Arc | Rectangle

/**
 * Find intersection between any two supported shapes
 */
export function intersect(
  shape1: IntersectableShape,
  shape2: IntersectableShape,
  options: { segmentMode?: boolean; epsilon?: number } = {}
): IntersectionResult {
  const { segmentMode = false, epsilon = EPSILON } = options

  if (shape1 instanceof Line && shape2 instanceof Line) {
    return segmentMode
      ? intersectSegmentSegment(shape1, shape2, epsilon)
      : intersectLineLine(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Line && shape2 instanceof Circle) {
    return segmentMode
      ? intersectSegmentCircle(shape1, shape2, epsilon)
      : intersectLineCircle(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Circle && shape2 instanceof Line) {
    return segmentMode
      ? intersectSegmentCircle(shape2, shape1, epsilon)
      : intersectLineCircle(shape2, shape1, epsilon)
  }

  if (shape1 instanceof Circle && shape2 instanceof Circle) {
    return intersectCircleCircle(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Line && shape2 instanceof Arc) {
    return segmentMode
      ? intersectSegmentArc(shape1, shape2, epsilon)
      : intersectLineArc(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Arc && shape2 instanceof Line) {
    return segmentMode
      ? intersectSegmentArc(shape2, shape1, epsilon)
      : intersectLineArc(shape2, shape1, epsilon)
  }

  if (shape1 instanceof Arc && shape2 instanceof Arc) {
    return intersectArcArc(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Circle && shape2 instanceof Arc) {
    return intersectArcArc(
      new Arc(shape1.center, shape1.radius, 0, 360, false),
      shape2,
      epsilon
    )
  }

  if (shape1 instanceof Arc && shape2 instanceof Circle) {
    return intersectArcArc(
      shape1,
      new Arc(shape2.center, shape2.radius, 0, 360, false),
      epsilon
    )
  }

  if (shape1 instanceof Line && shape2 instanceof Rectangle) {
    return segmentMode
      ? intersectSegmentRect(shape1, shape2, epsilon)
      : intersectLineRect(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Rectangle && shape2 instanceof Line) {
    return segmentMode
      ? intersectSegmentRect(shape2, shape1, epsilon)
      : intersectLineRect(shape2, shape1, epsilon)
  }

  if (shape1 instanceof Circle && shape2 instanceof Rectangle) {
    return intersectCircleRect(shape1, shape2, epsilon)
  }

  if (shape1 instanceof Rectangle && shape2 instanceof Circle) {
    return intersectCircleRect(shape2, shape1, epsilon)
  }

  // Rectangle-Rectangle handled differently (not boundary intersection)
  if (shape1 instanceof Rectangle && shape2 instanceof Rectangle) {
    // Return corners of intersection rectangle
    const intersection = shape1.intersection(shape2)
    if (intersection) {
      return { points: [...intersection.corners], coincident: false }
    }
    return { points: [], coincident: false }
  }

  return { points: [], coincident: false }
}
