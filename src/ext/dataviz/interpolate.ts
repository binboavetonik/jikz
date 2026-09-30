/**
 * How consecutive samples join — the path a series builder draws
 * through picture-space points. Pure string building; the frame
 * decides what the points are.
 */
import type { Point } from '../../core/Point'
import { point } from '../../core/Point'
import { Plot } from '../../geometry/Plot'

/**
 * `'linear'` joins samples with straight segments; `'smooth'` is a
 * Catmull-Rom spline through them; the step modes hold each value
 * until the next sample — `'step'` changes half way, `'stepBefore'`
 * at the previous sample, `'stepAfter'` at the next.
 */
export type Interpolation = 'linear' | 'smooth' | 'step' | 'stepBefore' | 'stepAfter'

/** The corner points a step mode inserts between samples. */
export function stepPoints(points: readonly Point[], mode: Interpolation): Point[] {
  if (points.length < 2 || (mode !== 'step' && mode !== 'stepBefore' && mode !== 'stepAfter')) {
    return [...points]
  }
  const out: Point[] = [points[0]!]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    if (mode === 'step') {
      const mid = (a.x + b.x) / 2
      out.push(point(mid, a.y), point(mid, b.y))
    } else if (mode === 'stepBefore') {
      out.push(point(a.x, b.y))
    } else {
      out.push(point(b.x, a.y))
    }
    out.push(b)
  }
  return out
}

/**
 * SVG path data through `points` in the given mode. Empty for fewer
 * than two points; `closed` appends `Z`.
 */
export function interpolatePath(
  points: readonly Point[],
  mode: Interpolation = 'linear',
  closed = false
): string {
  if (points.length < 2) return ''
  if (mode === 'smooth') return new Plot([...points], closed).toSVGPathSmooth()
  const pts = stepPoints(points, mode)
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i]!.x} ${pts[i]!.y}`
  return closed ? `${d} Z` : d
}
