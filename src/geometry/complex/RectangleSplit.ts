import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Split direction
 */
export type SplitDirection = 'horizontal' | 'vertical'

/**
 * Options specific to rectangle split shape
 */
export interface RectangleSplitOptions extends ShapeOptions {
  /**
   * Number of parts to split into (default: 2)
   */
  parts?: number

  /**
   * Direction of split (default: 'horizontal')
   */
  direction?: SplitDirection

  /**
   * Labels for each part
   */
  labels?: string[]
}

/**
 * A rectangle split into multiple parts (like UML class diagram)
 *
 * Visual (3 horizontal parts):
 * ```
 *  +--------+
 *  | part 1 |
 *  +--------+
 *  | part 2 |
 *  +--------+
 *  | part 3 |
 *  +--------+
 * ```
 */
export class RectangleSplit implements Shape {
  readonly type = 'rectangle split' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly parts: number
  readonly direction: SplitDirection
  readonly labels: string[]

  constructor(options: RectangleSplitOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.parts = Math.max(2, options.parts ?? 2)
    this.direction = options.direction ?? 'horizontal'
    this.labels = options.labels ?? []

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the center of a specific part (0-indexed)
   */
  partCenter(index: number): Point {
    const hw = this.width / 2
    const hh = this.height / 2

    if (this.direction === 'horizontal') {
      const partHeight = this.height / this.parts
      const topY = this.center.y - hh
      const partCenterY = topY + partHeight * (index + 0.5)
      return point(this.center.x, partCenterY)
    } else {
      const partWidth = this.width / this.parts
      const leftX = this.center.x - hw
      const partCenterX = leftX + partWidth * (index + 0.5)
      return point(partCenterX, this.center.y)
    }
  }

  /**
   * Get the bounds of a specific part (0-indexed)
   */
  partBounds(index: number): [number, number, number, number] {
    const hw = this.width / 2
    const hh = this.height / 2

    if (this.direction === 'horizontal') {
      const partHeight = this.height / this.parts
      const topY = this.center.y - hh + partHeight * index
      return [
        this.center.x - hw,
        topY,
        this.center.x + hw,
        topY + partHeight,
      ]
    } else {
      const partWidth = this.width / this.parts
      const leftX = this.center.x - hw + partWidth * index
      return [
        leftX,
        this.center.y - hh,
        leftX + partWidth,
        this.center.y + hh,
      ]
    }
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const hw = this.width / 2
      const hh = this.height / 2

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'north':
        case 'n':
          return point(this.center.x, this.center.y - hh - sep)
        case 'south':
        case 's':
          return point(this.center.x, this.center.y + hh + sep)
        case 'east':
        case 'e':
          return point(this.center.x + hw + sep, this.center.y)
        case 'west':
        case 'w':
          return point(this.center.x - hw - sep, this.center.y)
        case 'north east':
        case 'ne':
          return point(this.center.x + hw + sep * 0.7, this.center.y - hh - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(this.center.x - hw - sep * 0.7, this.center.y - hh - sep * 0.7)
        case 'south east':
        case 'se':
          return point(this.center.x + hw + sep * 0.7, this.center.y + hh + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(this.center.x - hw - sep * 0.7, this.center.y + hh + sep * 0.7)
      }

      // Part anchors like "part 1", "part 2" or "one", "two", "three"
      if (normalized.startsWith('part ')) {
        const idx = parseInt(normalized.slice(5), 10) - 1
        if (idx >= 0 && idx < this.parts) {
          return this.partCenter(idx)
        }
      }

      // Named parts: one, two, three, etc.
      const partNames = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
      const partIdx = partNames.indexOf(normalized)
      if (partIdx >= 0 && partIdx < this.parts) {
        return this.partCenter(partIdx)
      }

      // Text anchors for parts: "text one", "text two"
      if (normalized.startsWith('text ')) {
        const rest = normalized.slice(5)
        const idx = partNames.indexOf(rest)
        if (idx >= 0 && idx < this.parts) {
          return this.partCenter(idx)
        }
        const numIdx = parseInt(rest, 10) - 1
        if (numIdx >= 0 && numIdx < this.parts) {
          return this.partCenter(numIdx)
        }
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle)
    const hw = this.width / 2
    const hh = this.height / 2

    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    let t = Infinity

    if (Math.abs(cos) > 1e-10) {
      const tx = (cos > 0 ? hw : -hw) / cos
      if (tx > 0) t = Math.min(t, tx)
    }
    if (Math.abs(sin) > 1e-10) {
      const ty = (sin > 0 ? hh : -hh) / sin
      if (ty > 0) t = Math.min(t, ty)
    }

    return point(this.center.x + t * cos, this.center.y + t * sin)
  }

  get north(): Point { return this.anchor('north') }
  get south(): Point { return this.anchor('south') }
  get east(): Point { return this.anchor('east') }
  get west(): Point { return this.anchor('west') }
  get northEast(): Point { return this.anchor('north east') }
  get northWest(): Point { return this.anchor('north west') }
  get southEast(): Point { return this.anchor('south east') }
  get southWest(): Point { return this.anchor('south west') }

  contains(p: PointLike): boolean {
    const hw = this.width / 2
    const hh = this.height / 2
    const dx = Math.abs(p.x - this.center.x)
    const dy = Math.abs(p.y - this.center.y)
    return dx <= hw && dy <= hh
  }

  get bounds(): [number, number, number, number] {
    const hw = this.width / 2
    const hh = this.height / 2
    return [
      this.center.x - hw,
      this.center.y - hh,
      this.center.x + hw,
      this.center.y + hh,
    ]
  }

  moveTo(center: PointLike): RectangleSplit {
    return new RectangleSplit({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      parts: this.parts,
      direction: this.direction,
      labels: this.labels,
    })
  }

  resize(width: number, height: number): RectangleSplit {
    return new RectangleSplit({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      parts: this.parts,
      direction: this.direction,
      labels: this.labels,
    })
  }

  toSVGPath(): string {
    const hw = this.width / 2
    const hh = this.height / 2
    const cx = this.center.x
    const cy = this.center.y

    // Outer rectangle
    let path = `M ${cx - hw} ${cy - hh} ` +
               `L ${cx + hw} ${cy - hh} ` +
               `L ${cx + hw} ${cy + hh} ` +
               `L ${cx - hw} ${cy + hh} Z`

    // Divider lines
    if (this.direction === 'horizontal') {
      const partHeight = this.height / this.parts
      for (let i = 1; i < this.parts; i++) {
        const y = cy - hh + partHeight * i
        path += ` M ${cx - hw} ${y} L ${cx + hw} ${y}`
      }
    } else {
      const partWidth = this.width / this.parts
      for (let i = 1; i < this.parts; i++) {
        const x = cx - hw + partWidth * i
        path += ` M ${x} ${cy - hh} L ${x} ${cy + hh}`
      }
    }

    return path
  }

  toString(): string {
    return `RectangleSplit(${this.center}, ${this.width}x${this.height}, parts=${this.parts})`
  }
}

/**
 * Create a rectangle split shape
 */
export function rectangleSplit(options?: RectangleSplitOptions): RectangleSplit {
  return new RectangleSplit(options)
}
