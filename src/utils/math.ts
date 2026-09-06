/**
 * Small value for floating point comparisons
 */
export const EPSILON = 1e-10

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
