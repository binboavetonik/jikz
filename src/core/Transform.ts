import type { Matrix } from './types'
import { degToRad } from '../utils/math'
import { Point } from './Point'

/**
 * Immutable 2D affine transformation
 *
 * Matrix layout:
 * | a  c  e |
 * | b  d  f |
 * | 0  0  1 |
 */
export class Transform {
  readonly matrix: Matrix

  constructor(matrix: Matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = matrix
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Matrix Components
  // ─────────────────────────────────────────────────────────────────────────────

  get a(): number {
    return this.matrix[0]
  }
  get b(): number {
    return this.matrix[1]
  }
  get c(): number {
    return this.matrix[2]
  }
  get d(): number {
    return this.matrix[3]
  }
  get e(): number {
    return this.matrix[4]
  }
  get f(): number {
    return this.matrix[5]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transform Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Translate by (tx, ty)
   */
  translate(tx: number, ty: number): Transform {
    return this.compose(Transform.translation(tx, ty))
  }

  /**
   * Rotate by angle in degrees around origin
   */
  rotate(angle: number): Transform {
    return this.compose(Transform.rotation(angle))
  }

  /**
   * Rotate around a specific point
   */
  rotateAround(cx: number, cy: number, angle: number): Transform {
    return this.translate(cx, cy).rotate(angle).translate(-cx, -cy)
  }

  /**
   * Scale uniformly or non-uniformly
   */
  scale(sx: number, sy?: number): Transform {
    return this.compose(Transform.scaling(sx, sy ?? sx))
  }

  /**
   * Scale around a specific point
   */
  scaleAround(cx: number, cy: number, sx: number, sy?: number): Transform {
    return this.translate(cx, cy)
      .scale(sx, sy)
      .translate(-cx, -cy)
  }

  /**
   * Shear (skew) transformation
   */
  shear(shx: number, shy: number): Transform {
    return this.compose(Transform.shearing(shx, shy))
  }

  /**
   * Compose with another transform (this * other)
   */
  compose(other: Transform): Transform {
    const [a1, b1, c1, d1, e1, f1] = this.matrix
    const [a2, b2, c2, d2, e2, f2] = other.matrix

    return new Transform([
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1,
    ])
  }

  /**
   * Get the inverse transformation
   */
  inverse(): Transform {
    const [a, b, c, d, e, f] = this.matrix
    const det = a * d - b * c

    if (det === 0) {
      throw new Error('Transform is not invertible (determinant is zero)')
    }

    const invDet = 1 / det
    return new Transform([
      d * invDet,
      -b * invDet,
      -c * invDet,
      a * invDet,
      (c * f - d * e) * invDet,
      (b * e - a * f) * invDet,
    ])
  }

  /**
   * Apply this transform to a point
   */
  apply(p: Point): Point {
    return p.transform(this.matrix)
  }

  /**
   * Check if this is the identity transform
   */
  isIdentity(): boolean {
    const [a, b, c, d, e, f] = this.matrix
    return a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0
  }

  /**
   * Get the determinant of the transformation matrix
   */
  get determinant(): number {
    return this.a * this.d - this.b * this.c
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Static Factory Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Identity transformation
   */
  static identity(): Transform {
    return new Transform([1, 0, 0, 1, 0, 0])
  }

  /**
   * Translation transformation
   */
  static translation(tx: number, ty: number): Transform {
    return new Transform([1, 0, 0, 1, tx, ty])
  }

  /**
   * Rotation transformation (angle in degrees)
   */
  static rotation(angle: number): Transform {
    const rad = degToRad(angle)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return new Transform([cos, sin, -sin, cos, 0, 0])
  }

  /**
   * Rotation around a point (angle in degrees)
   */
  static rotationAround(cx: number, cy: number, angle: number): Transform {
    return Transform.identity().rotateAround(cx, cy, angle)
  }

  /**
   * Scaling transformation
   */
  static scaling(sx: number, sy?: number): Transform {
    return new Transform([sx, 0, 0, sy ?? sx, 0, 0])
  }

  /**
   * Shearing (skew) transformation
   */
  static shearing(shx: number, shy: number): Transform {
    return new Transform([1, shy, shx, 1, 0, 0])
  }

  /**
   * Reflection across the X axis
   */
  static reflectX(): Transform {
    return new Transform([1, 0, 0, -1, 0, 0])
  }

  /**
   * Reflection across the Y axis
   */
  static reflectY(): Transform {
    return new Transform([-1, 0, 0, 1, 0, 0])
  }

  /**
   * Reflection across a line through the origin at the given angle (in degrees)
   */
  static reflectAcrossLine(angle: number): Transform {
    const rad = degToRad(2 * angle)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return new Transform([cos, sin, sin, -cos, 0, 0])
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convert to a CSS transform string
   */
  toCSSMatrix(): string {
    return `matrix(${this.matrix.join(', ')})`
  }

  /**
   * Convert to SVG transform attribute format
   */
  toSVGMatrix(): string {
    return `matrix(${this.matrix.join(' ')})`
  }

  /**
   * Clone this transform
   */
  clone(): Transform {
    const [a, b, c, d, e, f] = this.matrix
    return new Transform([a, b, c, d, e, f])
  }

  toString(): string {
    return `Transform(${this.matrix.join(', ')})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an identity transform
 */
export function transform(): Transform {
  return Transform.identity()
}

/**
 * Create a transform from a matrix
 */
export function fromMatrix(matrix: Matrix): Transform {
  return new Transform(matrix)
}
