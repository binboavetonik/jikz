import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad } from '../utils/math'
import {
  endpointToCenter,
  arcLength,
  arcPointAt,
  arcExtremes,
  type ArcCenterParams,
} from './arcMath'

/**
 * Path segment types
 */
export type PathSegmentType = 'M' | 'L' | 'C' | 'Q' | 'A' | 'Z'

/**
 * A segment in a path
 */
export interface PathSegment {
  type: PathSegmentType
  points: Point[]
  // Arc-specific properties
  rx?: number
  ry?: number
  rotation?: number
  largeArc?: boolean
  sweep?: boolean
}

/**
 * Options for creating a path
 */
export interface PathOptions {
  /**
   * Whether the path is closed
   */
  closed?: boolean
}

/**
 * A chainable path builder inspired by TikZ paths
 */
export class Path {
  readonly kind = 'path' as const
  private _segments: PathSegment[] = []
  private _currentPoint: Point = point(0, 0)

  constructor(segments: PathSegment[] = []) {
    this._segments = segments
    // Set current point to the last point in the path
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1]!
      if (lastSeg.points.length > 0) {
        this._currentPoint = lastSeg.points[lastSeg.points.length - 1]!
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all segments
   */
  get segments(): readonly PathSegment[] {
    return this._segments
  }

  /**
   * Get the current point (end of path)
   */
  get currentPoint(): Point {
    return this._currentPoint
  }

  /**
   * Check if path is empty
   */
  get isEmpty(): boolean {
    return this._segments.length === 0
  }

  /**
   * Check if path is closed
   */
  get isClosed(): boolean {
    const last = this._segments[this._segments.length - 1]
    return last?.type === 'Z'
  }

  /**
   * Get the starting point of the path
   */
  get startPoint(): Point | null {
    if (this._segments.length === 0) return null
    const first = this._segments[0]!
    return first.points[0] ?? null
  }

  /**
   * Get the ending point of the path
   */
  get endPoint(): Point | null {
    if (this._segments.length === 0) return null
    for (let i = this._segments.length - 1; i >= 0; i--) {
      const seg = this._segments[i]!
      if (seg.type === 'Z') continue
      if (seg.points.length > 0) {
        return seg.points[seg.points.length - 1]!
      }
    }
    return this.startPoint
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Path Building Methods (chainable)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Move to a point (starts a new subpath)
   */
  moveTo(p: PointLike): Path {
    const pt = point(p.x, p.y)
    const newSegments = [...this._segments, { type: 'M' as const, points: [pt] }]
    const path = new Path(newSegments)
    path._currentPoint = pt
    return path
  }

  /**
   * Draw a line to a point
   */
  lineTo(p: PointLike): Path {
    const pt = point(p.x, p.y)
    const newSegments = [...this._segments, { type: 'L' as const, points: [pt] }]
    const path = new Path(newSegments)
    path._currentPoint = pt
    return path
  }

  /**
   * Draw a horizontal line to x coordinate
   */
  horizontalTo(x: number): Path {
    return this.lineTo(point(x, this._currentPoint.y))
  }

  /**
   * Draw a vertical line to y coordinate
   */
  verticalTo(y: number): Path {
    return this.lineTo(point(this._currentPoint.x, y))
  }

  /**
   * Draw a line by relative offset
   */
  lineBy(dx: number, dy: number): Path {
    return this.lineTo(point(this._currentPoint.x + dx, this._currentPoint.y + dy))
  }

  /**
   * Draw a cubic bezier curve
   */
  curveTo(cp1: PointLike, cp2: PointLike, end: PointLike): Path {
    const pt1 = point(cp1.x, cp1.y)
    const pt2 = point(cp2.x, cp2.y)
    const ptEnd = point(end.x, end.y)
    const newSegments = [...this._segments, { type: 'C' as const, points: [pt1, pt2, ptEnd] }]
    const path = new Path(newSegments)
    path._currentPoint = ptEnd
    return path
  }

  /**
   * Draw a smooth cubic bezier (auto-calculate first control point)
   */
  smoothCurveTo(cp2: PointLike, end: PointLike): Path {
    // Calculate cp1 as reflection of previous control point
    let cp1: Point
    const lastSeg = this._segments[this._segments.length - 1]
    if (lastSeg?.type === 'C' && lastSeg.points.length >= 2) {
      const prevCp2 = lastSeg.points[1]!
      cp1 = this._currentPoint.add(
        this._currentPoint.x - prevCp2.x,
        this._currentPoint.y - prevCp2.y
      )
    } else {
      cp1 = this._currentPoint
    }
    return this.curveTo(cp1, cp2, end)
  }

  /**
   * Draw a quadratic bezier curve
   */
  quadraticTo(cp: PointLike, end: PointLike): Path {
    const ptCp = point(cp.x, cp.y)
    const ptEnd = point(end.x, end.y)
    const newSegments = [...this._segments, { type: 'Q' as const, points: [ptCp, ptEnd] }]
    const path = new Path(newSegments)
    path._currentPoint = ptEnd
    return path
  }

  /**
   * Draw an arc to a point
   */
  arcTo(
    rx: number,
    ry: number,
    rotation: number,
    largeArc: boolean,
    sweep: boolean,
    end: PointLike
  ): Path {
    const ptEnd = point(end.x, end.y)
    const newSegments = [
      ...this._segments,
      {
        type: 'A' as const,
        points: [ptEnd],
        rx,
        ry,
        rotation,
        largeArc,
        sweep,
      },
    ]
    const path = new Path(newSegments)
    path._currentPoint = ptEnd
    return path
  }

  /**
   * Draw a circular arc to a point
   */
  circularArcTo(radius: number, largeArc: boolean, sweep: boolean, end: PointLike): Path {
    return this.arcTo(radius, radius, 0, largeArc, sweep, end)
  }

  /**
   * Close the path
   */
  close(): Path {
    const newSegments = [...this._segments, { type: 'Z' as const, points: [] }]
    const path = new Path(newSegments)
    // After close, current point returns to start
    if (this.startPoint) {
      path._currentPoint = this.startPoint
    }
    return path
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TikZ-style Path Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * TikZ -- operator: line to point
   */
  to(p: PointLike): Path {
    return this.lineTo(p)
  }

  /**
   * TikZ -| operator: horizontal then vertical
   */
  hvTo(p: PointLike): Path {
    return this.horizontalTo(p.x).verticalTo(p.y)
  }

  /**
   * TikZ |- operator: vertical then horizontal
   */
  vhTo(p: PointLike): Path {
    return this.verticalTo(p.y).horizontalTo(p.x)
  }

  /**
   * Draw a smooth curve through a point (TikZ .. operator)
   */
  through(p: PointLike, end: PointLike): Path {
    // Create a smooth curve through the intermediate point
    const mid = point(p.x, p.y)
    const endPt = point(end.x, end.y)

    // Calculate control points for a curve through the midpoint
    const cp1 = this._currentPoint.toward(mid, 0.5).add(
      (mid.x - this._currentPoint.x) * 0.2,
      (mid.y - this._currentPoint.y) * 0.2
    )
    const cp2 = mid.toward(endPt, 0.5).add(
      (mid.x - endPt.x) * 0.2,
      (mid.y - endPt.y) * 0.2
    )

    return this.curveTo(cp1, cp2, endPt)
  }

  /**
   * Draw a bent curve (TikZ bend left/right)
   */
  bendTo(end: PointLike, angle: number): Path {
    const endPt = point(end.x, end.y)
    const dist = this._currentPoint.distanceTo(endPt)
    const baseAngle = this._currentPoint.angleTo(endPt)
    const controlDist = dist * 0.4

    const outAngle = baseAngle + angle
    const inAngle = baseAngle + 180 - angle

    const cp1 = point(
      this._currentPoint.x + controlDist * Math.cos(degToRad(outAngle)),
      this._currentPoint.y + controlDist * Math.sin(degToRad(outAngle))
    )
    const cp2 = point(
      endPt.x + controlDist * Math.cos(degToRad(inAngle)),
      endPt.y + controlDist * Math.sin(degToRad(inAngle))
    )

    return this.curveTo(cp1, cp2, endPt)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Path Analysis
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all points in the path
   */
  get allPoints(): Point[] {
    const points: Point[] = []
    for (const seg of this._segments) {
      points.push(...seg.points)
    }
    return points
  }

  /**
   * Get approximate length of the path
   */
  get length(): number {
    let len = 0
    let current = this.startPoint

    for (const seg of this._segments) {
      if (!current) {
        if (seg.type === 'M' && seg.points[0]) {
          current = seg.points[0]
        }
        continue
      }

      switch (seg.type) {
        case 'M':
          current = seg.points[0] ?? current
          break
        case 'L':
          if (seg.points[0]) {
            len += current.distanceTo(seg.points[0])
            current = seg.points[0]
          }
          break
        case 'C':
          // Approximate cubic bezier length
          if (seg.points.length >= 3) {
            len += this.approximateCubicLength(
              current,
              seg.points[0]!,
              seg.points[1]!,
              seg.points[2]!
            )
            current = seg.points[2]!
          }
          break
        case 'Q':
          // Approximate quadratic bezier length
          if (seg.points.length >= 2) {
            len += this.approximateQuadraticLength(current, seg.points[0]!, seg.points[1]!)
            current = seg.points[1]!
          }
          break
        case 'A':
          // SVG §F.6.5 endpoint → center conversion; degenerate arcs
          // (zero radius, from == end) measure as their chord / zero.
          if (seg.points[0]) {
            const params = endpointToCenter(current, seg)
            len += params ? arcLength(params) : current.distanceTo(seg.points[0])
            current = seg.points[0]
          }
          break
        case 'Z':
          if (this.startPoint) {
            len += current.distanceTo(this.startPoint)
            current = this.startPoint
          }
          break
      }
    }

    return len
  }

  private approximateCubicLength(p0: Point, p1: Point, p2: Point, p3: Point): number {
    // Use chord length + control polygon as approximation
    const chord = p0.distanceTo(p3)
    const control = p0.distanceTo(p1) + p1.distanceTo(p2) + p2.distanceTo(p3)
    return (chord + control) / 2
  }

  private approximateQuadraticLength(p0: Point, p1: Point, p2: Point): number {
    const chord = p0.distanceTo(p2)
    const control = p0.distanceTo(p1) + p1.distanceTo(p2)
    return (chord + control) / 2
  }

  /**
   * Get point at parameter t (0-1) along the path
   */
  pointAt(t: number): Point {
    if (this.isEmpty || !this.startPoint) return point(0, 0)

    const totalLength = this.length
    const targetLength = t * totalLength

    let current = this.startPoint
    let accumulated = 0

    for (const seg of this._segments) {
      if (seg.type === 'M') {
        current = seg.points[0] ?? current
        continue
      }

      let segLength = 0
      let segEnd = current
      let arcParams: ArcCenterParams | null = null

      switch (seg.type) {
        case 'L':
          if (seg.points[0]) {
            segLength = current.distanceTo(seg.points[0])
            segEnd = seg.points[0]
          }
          break
        case 'C':
          if (seg.points.length >= 3) {
            segLength = this.approximateCubicLength(
              current,
              seg.points[0]!,
              seg.points[1]!,
              seg.points[2]!
            )
            segEnd = seg.points[2]!
          }
          break
        case 'Q':
          if (seg.points.length >= 2) {
            segLength = this.approximateQuadraticLength(current, seg.points[0]!, seg.points[1]!)
            segEnd = seg.points[1]!
          }
          break
        case 'A':
          if (seg.points[0]) {
            arcParams = endpointToCenter(current, seg)
            segLength = arcParams
              ? arcLength(arcParams)
              : current.distanceTo(seg.points[0])
            segEnd = seg.points[0]
          }
          break
        case 'Z':
          if (this.startPoint) {
            segLength = current.distanceTo(this.startPoint)
            segEnd = this.startPoint
          }
          break
      }

      if (accumulated + segLength >= targetLength && segLength > 0) {
        const segT = (targetLength - accumulated) / segLength

        switch (seg.type) {
          case 'L':
          case 'Z':
            return current.toward(segEnd, segT)
          case 'C':
            return this.cubicBezierPoint(
              current,
              seg.points[0]!,
              seg.points[1]!,
              seg.points[2]!,
              segT
            )
          case 'Q':
            return this.quadraticBezierPoint(current, seg.points[0]!, seg.points[1]!, segT)
          case 'A':
            return arcParams
              ? arcPointAt(arcParams, segT)
              : current.toward(segEnd, segT) // degenerate: line-like
        }
      }

      accumulated += segLength
      current = segEnd
    }

    return this.endPoint ?? point(0, 0)
  }

  private cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t

    return point(
      mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    )
  }

  private quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
    const mt = 1 - t
    const mt2 = mt * mt
    const t2 = t * t

    return point(
      mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
      mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y
    )
  }

  /**
   * Get bounding box of the path
   */
  get bounds(): [number, number, number, number] {
    const points = this.allPoints
    // Arc bulges aren't in allPoints (endpoints only) — add each A
    // segment's in-sweep axis-aligned extremes (exact, §F.6.5-based).
    let current = this.startPoint
    for (const seg of this._segments) {
      if (seg.type === 'M') {
        current = seg.points[0] ?? current
        continue
      }
      if (seg.type === 'Z') {
        current = this.startPoint ?? current
        continue
      }
      if (seg.type === 'A' && current) {
        const params = endpointToCenter(current, seg)
        if (params) points.push(...arcExtremes(params))
      }
      if (seg.points.length > 0) {
        current = seg.points[seg.points.length - 1]!
      }
    }

    if (points.length === 0) return [0, 0, 0, 0]

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    return [minX, minY, maxX, maxY]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transformations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Translate the path
   */
  translate(dx: number, dy: number): Path {
    const newSegments = this._segments.map((seg) => ({
      ...seg,
      points: seg.points.map((p) => p.add(dx, dy)),
    }))
    return new Path(newSegments)
  }

  /**
   * Scale the path around a center point
   */
  scale(sx: number, sy: number = sx, center: PointLike = { x: 0, y: 0 }): Path {
    const newSegments = this._segments.map((seg) => ({
      ...seg,
      points: seg.points.map((p) =>
        point(center.x + (p.x - center.x) * sx, center.y + (p.y - center.y) * sy)
      ),
      rx: seg.rx !== undefined ? seg.rx * sx : undefined,
      ry: seg.ry !== undefined ? seg.ry * sy : undefined,
    }))
    return new Path(newSegments)
  }

  /**
   * Rotate the path around a center point
   */
  rotate(angle: number, center: PointLike = { x: 0, y: 0 }): Path {
    const centerPt = point(center.x, center.y)
    const newSegments = this._segments.map((seg) => ({
      ...seg,
      points: seg.points.map((p) => p.rotateAround(centerPt, angle)),
      rotation: seg.rotation !== undefined ? seg.rotation + angle : undefined,
    }))
    return new Path(newSegments)
  }

  /**
   * Reverse the path direction
   */
  reverse(): Path {
    if (this._segments.length === 0) return new Path()

    const reversed: PathSegment[] = []
    const wasClosed = this.isClosed

    // Work backwards through segments
    for (let i = this._segments.length - 1; i >= 0; i--) {
      const seg = this._segments[i]!

      if (seg.type === 'Z') continue
      if (seg.type === 'M' && i === 0) continue

      if (seg.type === 'M') {
        // Convert M to L when reversing (except first)
        reversed.push({ type: 'L', points: [...seg.points] })
      } else if (seg.type === 'L') {
        // Get the previous segment's end point as the target
        const prevSeg = this._segments[i - 1]
        if (prevSeg && prevSeg.points.length > 0) {
          const target = prevSeg.points[prevSeg.points.length - 1]!
          reversed.push({ type: 'L', points: [target] })
        }
      } else if (seg.type === 'C') {
        // Reverse cubic: swap control points
        const prevSeg = this._segments[i - 1]
        if (prevSeg && prevSeg.points.length > 0) {
          const target = prevSeg.points[prevSeg.points.length - 1]!
          reversed.push({
            type: 'C',
            points: [seg.points[1]!, seg.points[0]!, target],
          })
        }
      }
    }

    // Add starting M
    if (this.endPoint) {
      reversed.unshift({ type: 'M', points: [this.endPoint] })
    }

    // Re-close if was closed
    if (wasClosed) {
      reversed.push({ type: 'Z', points: [] })
    }

    return new Path(reversed)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG Output
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convert to SVG path data string
   */
  toSVGPath(): string {
    const parts: string[] = []

    for (const seg of this._segments) {
      switch (seg.type) {
        case 'M':
          if (seg.points[0]) {
            parts.push(`M ${seg.points[0].x} ${seg.points[0].y}`)
          }
          break
        case 'L':
          if (seg.points[0]) {
            parts.push(`L ${seg.points[0].x} ${seg.points[0].y}`)
          }
          break
        case 'C':
          if (seg.points.length >= 3) {
            parts.push(
              `C ${seg.points[0]!.x} ${seg.points[0]!.y}, ${seg.points[1]!.x} ${seg.points[1]!.y}, ${seg.points[2]!.x} ${seg.points[2]!.y}`
            )
          }
          break
        case 'Q':
          if (seg.points.length >= 2) {
            parts.push(
              `Q ${seg.points[0]!.x} ${seg.points[0]!.y}, ${seg.points[1]!.x} ${seg.points[1]!.y}`
            )
          }
          break
        case 'A':
          if (seg.points[0] && seg.rx !== undefined && seg.ry !== undefined) {
            parts.push(
              `A ${seg.rx} ${seg.ry} ${seg.rotation ?? 0} ${seg.largeArc ? 1 : 0} ${seg.sweep ? 1 : 0} ${seg.points[0].x} ${seg.points[0].y}`
            )
          }
          break
        case 'Z':
          parts.push('Z')
          break
      }
    }

    return parts.join(' ')
  }

  toString(): string {
    return `Path(${this._segments.length} segments)`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an empty path
 */
export function path(): Path {
  return new Path()
}

/**
 * Create a path starting at a point
 */
export function pathFrom(start: PointLike): Path {
  return new Path().moveTo(start)
}

/**
 * Create a rectangular path
 */
export function rectPath(x: number, y: number, width: number, height: number): Path {
  return path()
    .moveTo(point(x, y))
    .lineTo(point(x + width, y))
    .lineTo(point(x + width, y + height))
    .lineTo(point(x, y + height))
    .close()
}

/**
 * Create a circular path
 */
export function circlePath(center: PointLike, radius: number): Path {
  const cx = center.x
  const cy = center.y
  return path()
    .moveTo(point(cx + radius, cy))
    .arcTo(radius, radius, 0, false, true, point(cx - radius, cy))
    .arcTo(radius, radius, 0, false, true, point(cx + radius, cy))
    .close()
}

/**
 * Create an elliptical path
 */
export function ellipsePath(center: PointLike, rx: number, ry: number): Path {
  const cx = center.x
  const cy = center.y
  return path()
    .moveTo(point(cx + rx, cy))
    .arcTo(rx, ry, 0, false, true, point(cx - rx, cy))
    .arcTo(rx, ry, 0, false, true, point(cx + rx, cy))
    .close()
}

/**
 * Create a polygon path from vertices
 */
export function polygonPath(vertices: PointLike[]): Path {
  if (vertices.length < 3) {
    return path()
  }

  let p = path().moveTo(vertices[0]!)
  for (let i = 1; i < vertices.length; i++) {
    p = p.lineTo(vertices[i]!)
  }
  return p.close()
}

/**
 * Create a polyline path (not closed)
 */
export function polylinePath(points: PointLike[]): Path {
  if (points.length === 0) {
    return path()
  }

  let p = path().moveTo(points[0]!)
  for (let i = 1; i < points.length; i++) {
    p = p.lineTo(points[i]!)
  }
  return p
}
