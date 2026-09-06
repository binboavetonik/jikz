import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { AnchoredPolygon } from '../AnchoredPolygon'

/**
 * Options specific to starburst shape
 */
export interface StarburstOptions extends ShapeOptions {
  /**
   * Number of points/spikes (default: 10)
   */
  points?: number

  /**
   * Inner radius ratio (0-1, default: 0.5)
   * 0 = inner points at center, 1 = no inner points (regular polygon)
   */
  innerRadiusRatio?: number

  /**
   * Randomness factor for irregular starburst (0-1, default: 0)
   * 0 = regular star, 1 = maximum irregularity
   */
  randomness?: number

  /**
   * Seed for reproducible randomness (default: undefined for random)
   */
  seed?: number
}

/**
 * A simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

/**
 * A starburst/explosion shape with alternating inner and outer points
 *
 * Visual:
 * ```
 *      *
 *    / | \
 *   *--+--*
 *    \ | /
 *      *
 * ```
 *
 * Anchors: standard compass anchors plus `"point N"` (1-indexed outer
 * point) via {@link customAnchor}.
 */
export class Starburst extends AnchoredPolygon {
  readonly type = 'starburst' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly points: number
  readonly innerRadiusRatio: number
  readonly randomness: number
  readonly seed: number | undefined

  private cachedVertices: Point[] | null = null

  constructor(options: StarburstOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.points = Math.max(3, options.points ?? 10)
    this.innerRadiusRatio = Math.max(0, Math.min(1, options.innerRadiusRatio ?? 0.5))
    this.randomness = Math.max(0, Math.min(1, options.randomness ?? 0))
    this.seed = options.seed

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the outer and inner radii
   */
  private get radii(): { outerRx: number; outerRy: number; innerRx: number; innerRy: number } {
    const outerRx = this.width / 2
    const outerRy = this.height / 2
    return {
      outerRx,
      outerRy,
      innerRx: outerRx * this.innerRadiusRatio,
      innerRy: outerRy * this.innerRadiusRatio,
    }
  }

  /**
   * Get the vertices of the starburst shape
   */
  get vertices(): Point[] {
    if (this.cachedVertices) {
      return this.cachedVertices
    }

    const { outerRx, outerRy, innerRx, innerRy } = this.radii
    const pts: Point[] = []
    const angleStep = Math.PI / this.points // Half step for alternating inner/outer

    // Create random generator if needed
    const random = this.randomness > 0
      ? (this.seed !== undefined ? seededRandom(this.seed) : Math.random)
      : null

    for (let i = 0; i < this.points * 2; i++) {
      const angle = angleStep * i - Math.PI / 2 // Start from top
      const isOuter = i % 2 === 0

      let rx = isOuter ? outerRx : innerRx
      let ry = isOuter ? outerRy : innerRy

      // Apply randomness
      if (random && this.randomness > 0) {
        const randomFactor = 1 + (random() - 0.5) * 2 * this.randomness * 0.3
        rx *= randomFactor
        ry *= randomFactor
      }

      pts.push(point(
        this.center.x + rx * Math.cos(angle),
        this.center.y + ry * Math.sin(angle)
      ))
    }

    this.cachedVertices = pts
    return pts
  }

  protected customAnchor(normalized: string): Point | null {
    // Point anchors like "point 1", "point 2" (1-indexed vertices)
    if (normalized.startsWith('point ')) {
      const idx = parseInt(normalized.slice(6), 10) - 1
      const verts = this.vertices
      if (idx >= 0 && idx < verts.length) {
        return verts[idx]!
      }
    }
    return null
  }

  moveTo(center: PointLike): Starburst {
    return new Starburst({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      points: this.points,
      innerRadiusRatio: this.innerRadiusRatio,
      randomness: this.randomness,
      seed: this.seed,
    })
  }

  resize(width: number, height: number): Starburst {
    return new Starburst({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      points: this.points,
      innerRadiusRatio: this.innerRadiusRatio,
      randomness: this.randomness,
      seed: this.seed,
    })
  }

  toString(): string {
    return `Starburst(${this.center}, ${this.width}x${this.height}, points=${this.points})`
  }
}

/**
 * Create a starburst shape
 */
export function starburst(options?: StarburstOptions): Starburst {
  return new Starburst(options)
}
