/**
 * Small value for floating point comparisons.
 *
 * Suits quantities that are already the same order as the geometry itself:
 * lengths, distances, radii, angles, and normalized equations such as the
 * `x^2/a^2 + y^2/b^2 = 1` form used by the conics.
 */
export const EPSILON = 1e-10

/**
 * Tolerance for screen-space predicates built on *products* of coordinates:
 * cross products, dot products, collinearity determinants and discriminants.
 *
 * Those grow quadratically (or worse) with coordinate magnitude, so the error
 * floor does too. Coordinates here are SVG pixels, which routinely reach the
 * thousands, and at that scale a genuinely parallel pair of lines produces a
 * cross product around 5e-10 - larger than {@link EPSILON}, so the comparison
 * stops meaning anything. This is the same 1e-6 that d3-path uses for screen
 * geometry, and it is still far tighter than anything visible: at direction
 * length 2000 it only conflates lines within 1e-11 degrees of parallel.
 */
export const PIXEL_EPSILON = 1e-6

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Normalize an angle to the range [0, 360)
 */
export function normalizeAngle(degrees: number): number {
  const mod = degrees % 360
  return mod < 0 ? mod + 360 : mod
}

/**
 * Check if two numbers are approximately equal
 */
export function approxEqual(a: number, b: number, epsilon = EPSILON): boolean {
  return Math.abs(a - b) < epsilon
}

/**
 * Clamp a value to a range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Circumcenter of the triangle ABC, or `null` when the points are collinear.
 *
 * Works in coordinates relative to A rather than absolute ones. The textbook
 * absolute form builds its determinant out of terms the size of `|coord|^2`,
 * so for SVG pixel coordinates the determinant of a collinear triple lands
 * around 1e-9 instead of 0 and the degeneracy test misfires. Relative
 * coordinates make every term scale with the triangle instead, which both
 * conditions the division and lets the collinearity tolerance be meaningful.
 *
 * Collinearity is judged against `|AB| * |AC|`, so the test reads as "the
 * angle at A is under ~1e-6 radians" at any position or scale.
 */
export function circumcenterOf(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): { x: number; y: number } | null {
  const bax = bx - ax, bay = by - ay
  const cax = cx - ax, cay = cy - ay

  const cross = bax * cay - bay * cax
  const lab = Math.sqrt(bax * bax + bay * bay)
  const lac = Math.sqrt(cax * cax + cay * cay)

  if (Math.abs(cross) <= PIXEL_EPSILON * lab * lac) return null

  const bSq = bax * bax + bay * bay
  const cSq = cax * cax + cay * cay
  const d = 2 * cross

  return {
    x: ax + (cay * bSq - bay * cSq) / d,
    y: ay + (bax * cSq - cax * bSq) / d,
  }
}
