import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Arrow box arrow configuration
 */
export interface ArrowBoxArrow {
  /**
   * Position: 'north', 'south', 'east', 'west'
   */
  position: 'north' | 'south' | 'east' | 'west'

  /**
   * Length of the arrow (default: 15)
   */
  length?: number

  /**
   * Width of the arrow base (default: 10)
   */
  width?: number
}

/**
 * Options specific to arrow box shape
 */
export interface ArrowBoxOptions extends ShapeOptions {
  /**
   * Arrows to add to the box (default: none)
   */
  arrows?: ArrowBoxArrow[]
}

/**
 * A rectangle with arrow pointers on any sides
 *
 * Visual (arrows on north and south):
 * ```
 *       /\
 *      /  \
 *  +--+----+--+
 *  |          |
 *  |          |
 *  +--+----+--+
 *      \  /
 *       \/
 * ```
 */
export class ArrowBox implements Shape {
  readonly type = 'arrow box' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly arrows: ArrowBoxArrow[]

  constructor(options: ArrowBoxOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.arrows = options.arrows ?? []

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get arrow info for a position
   */
  private getArrow(position: string): ArrowBoxArrow | undefined {
    return this.arrows.find(a => a.position === position)
  }

  /**
   * Get the tip point for an arrow position
   */
  private getArrowTip(position: 'north' | 'south' | 'east' | 'west'): Point | null {
    const arrow = this.getArrow(position)
    if (!arrow) return null

    const hw = this.width / 2
    const hh = this.height / 2
    const len = arrow.length ?? 15

    switch (position) {
      case 'north':
        return point(this.center.x, this.center.y - hh - len)
      case 'south':
        return point(this.center.x, this.center.y + hh + len)
      case 'east':
        return point(this.center.x + hw + len, this.center.y)
      case 'west':
        return point(this.center.x - hw - len, this.center.y)
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
        case 'n': {
          const tip = this.getArrowTip('north')
          if (tip) return tip.add(0, -sep)
          return point(this.center.x, this.center.y - hh - sep)
        }
        case 'south':
        case 's': {
          const tip = this.getArrowTip('south')
          if (tip) return tip.add(0, sep)
          return point(this.center.x, this.center.y + hh + sep)
        }
        case 'east':
        case 'e': {
          const tip = this.getArrowTip('east')
          if (tip) return tip.add(sep, 0)
          return point(this.center.x + hw + sep, this.center.y)
        }
        case 'west':
        case 'w': {
          const tip = this.getArrowTip('west')
          if (tip) return tip.add(-sep, 0)
          return point(this.center.x - hw - sep, this.center.y)
        }
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
        case 'north arrow':
          return this.getArrowTip('north') ?? this.anchor('north')
        case 'south arrow':
          return this.getArrowTip('south') ?? this.anchor('south')
        case 'east arrow':
          return this.getArrowTip('east') ?? this.anchor('east')
        case 'west arrow':
          return this.getArrowTip('west') ?? this.anchor('west')
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

    // Simple rectangle boundary (arrows not considered for simplicity)
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

    // Check main rectangle
    if (dx <= hw && dy <= hh) return true

    // Check arrow triangles
    for (const arrow of this.arrows) {
      const tip = this.getArrowTip(arrow.position)
      if (!tip) continue

      const aw = (arrow.width ?? 10) / 2
      let base1: Point, base2: Point

      switch (arrow.position) {
        case 'north':
          base1 = point(this.center.x - aw, this.center.y - hh)
          base2 = point(this.center.x + aw, this.center.y - hh)
          break
        case 'south':
          base1 = point(this.center.x - aw, this.center.y + hh)
          base2 = point(this.center.x + aw, this.center.y + hh)
          break
        case 'east':
          base1 = point(this.center.x + hw, this.center.y - aw)
          base2 = point(this.center.x + hw, this.center.y + aw)
          break
        case 'west':
          base1 = point(this.center.x - hw, this.center.y - aw)
          base2 = point(this.center.x - hw, this.center.y + aw)
          break
      }

      if (this.pointInTriangle(p, base1, base2, tip)) return true
    }

    return false
  }

  private pointInTriangle(p: PointLike, a: Point, b: Point, c: Point): boolean {
    const sign = (p1: PointLike, p2: Point, p3: Point) =>
      (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)

    const d1 = sign(p, a, b)
    const d2 = sign(p, b, c)
    const d3 = sign(p, c, a)

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)

    return !(hasNeg && hasPos)
  }

  get bounds(): [number, number, number, number] {
    let minX = this.center.x - this.width / 2
    let minY = this.center.y - this.height / 2
    let maxX = this.center.x + this.width / 2
    let maxY = this.center.y + this.height / 2

    for (const arrow of this.arrows) {
      const tip = this.getArrowTip(arrow.position)
      if (tip) {
        minX = Math.min(minX, tip.x)
        minY = Math.min(minY, tip.y)
        maxX = Math.max(maxX, tip.x)
        maxY = Math.max(maxY, tip.y)
      }
    }

    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): ArrowBox {
    return new ArrowBox({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      arrows: this.arrows,
    })
  }

  resize(width: number, height: number): ArrowBox {
    return new ArrowBox({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      arrows: this.arrows,
    })
  }

  toSVGPath(): string {
    const hw = this.width / 2
    const hh = this.height / 2
    const cx = this.center.x
    const cy = this.center.y

    // Build path starting from top-left, going clockwise
    // Insert arrows where they appear

    let path = ''
    const northArrow = this.getArrow('north')
    const southArrow = this.getArrow('south')
    const eastArrow = this.getArrow('east')
    const westArrow = this.getArrow('west')

    // Top edge
    path += `M ${cx - hw} ${cy - hh} `
    if (northArrow) {
      const aw = (northArrow.width ?? 10) / 2
      const tip = this.getArrowTip('north')!
      path += `L ${cx - aw} ${cy - hh} L ${tip.x} ${tip.y} L ${cx + aw} ${cy - hh} `
    }
    path += `L ${cx + hw} ${cy - hh} `

    // Right edge
    if (eastArrow) {
      const aw = (eastArrow.width ?? 10) / 2
      const tip = this.getArrowTip('east')!
      path += `L ${cx + hw} ${cy - aw} L ${tip.x} ${tip.y} L ${cx + hw} ${cy + aw} `
    }
    path += `L ${cx + hw} ${cy + hh} `

    // Bottom edge
    if (southArrow) {
      const aw = (southArrow.width ?? 10) / 2
      const tip = this.getArrowTip('south')!
      path += `L ${cx + aw} ${cy + hh} L ${tip.x} ${tip.y} L ${cx - aw} ${cy + hh} `
    }
    path += `L ${cx - hw} ${cy + hh} `

    // Left edge
    if (westArrow) {
      const aw = (westArrow.width ?? 10) / 2
      const tip = this.getArrowTip('west')!
      path += `L ${cx - hw} ${cy + aw} L ${tip.x} ${tip.y} L ${cx - hw} ${cy - aw} `
    }

    path += 'Z'

    return path
  }

  toString(): string {
    return `ArrowBox(${this.center}, ${this.width}x${this.height}, arrows=${this.arrows.length})`
  }
}

/**
 * Create an arrow box shape
 */
export function arrowBox(options?: ArrowBoxOptions): ArrowBox {
  return new ArrowBox(options)
}
