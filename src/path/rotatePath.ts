import type { PointLike } from '../core/types'
import { pathFromSVG } from './svgPath'

/**
 * Rotate SVG path data around a center point.
 *
 * Parses the `d` attribute (via {@link pathFromSVG} — the full SVG
 * grammar, normalized), rotates the resulting path, and re-emits it.
 * The output uses absolute commands and 3-decimal rounding; `H`/`V`
 * become `L`, `S`/`T` become `C`/`Q`, and arc x-axis-rotation shifts by
 * `angle` (radii and the sweep flag are invariant under rotation).
 *
 * Angle convention matches the rest of the library: degrees, clockwise
 * positive in y-down screen space (same as SVG's `rotate()`).
 */
export function rotatePathData(d: string, angle: number, center: PointLike): string {
  return pathFromSVG(d).rotate(angle, center).toSVGPath(3)
}
