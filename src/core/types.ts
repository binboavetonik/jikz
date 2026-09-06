/**
 * Interface for objects that can be treated as a 2D point
 */
export interface PointLike {
  readonly x: number
  readonly y: number
}

/**
 * Interface for objects that can have styles applied
 */
export interface Styleable {
  stroke?: string
  strokeWidth?: number
  fill?: string
  opacity?: number
  dashArray?: number[]
}

/**
 * 2x3 affine transformation matrix represented as [a, b, c, d, e, f]
 * where the full 3x3 matrix is:
 * | a  c  e |
 * | b  d  f |
 * | 0  0  1 |
 */
export type Matrix = readonly [number, number, number, number, number, number]

/**
 * Angle can be specified in degrees (default) or radians
 */
export interface AngleOptions {
  unit?: 'deg' | 'rad'
}
