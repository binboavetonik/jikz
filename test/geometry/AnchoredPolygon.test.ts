/**
 * Tests for the AnchoredPolygon DIY base class: a user-defined shape
 * should get anchors, boundary points, hit-testing, bounds, and SVG
 * outline for free by declaring only `vertices` + copy operations.
 */
import { describe, it, expect } from 'vitest'
import { Point, point } from '../../src/core/Point'
import type { PointLike } from '../../src/core/types'
import { AnchoredPolygon } from '../../src/geometry/AnchoredPolygon'
import { DEFAULT_SHAPE_OPTIONS, type ShapeOptions } from '../../src/geometry/Shape'

/**
 * Example custom shape: a "house" pentagon (square + roof apex).
 * This is the documented DIY path — vertices are the only geometry.
 */
interface HouseShapeOptions extends ShapeOptions {
  roofRatio?: number
}

class House extends AnchoredPolygon {
  readonly type = 'house'
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly roofRatio: number

  constructor(options: HouseShapeOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.roofRatio = options.roofRatio ?? 0.5
  }

  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    const eaveY = this.center.y + hh - this.height * this.roofRatio
    return [
      point(this.center.x - hw, this.center.y + hh), // bottom left
      point(this.center.x - hw, eaveY),              // wall left
      point(this.center.x, this.center.y - hh),      // roof apex
      point(this.center.x + hw, eaveY),              // wall right
      point(this.center.x + hw, this.center.y + hh), // bottom right
    ]
  }

  protected customAnchor(normalized: string): Point | null {
    if (normalized === 'roof') return this.vertices[2]!
    return null
  }

  moveTo(center: PointLike): House {
    return new House({ ...this.options(), center })
  }

  resize(width: number, height: number): House {
    return new House({ ...this.options(), width, height })
  }

  private options(): HouseShapeOptions {
    return {
      center: this.center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      roofRatio: this.roofRatio,
    }
  }
}

function house(): House {
  return new House({ center: { x: 100, y: 100 }, width: 80, height: 60, outerSep: 0 })
}

describe('AnchoredPolygon (DIY custom shape)', () => {
  it('derives compass anchors from vertices (screen convention)', () => {
    const h = house()
    // North = ray up from center → hits the roof apex region
    expect(h.anchor('north').y).toBeLessThan(h.center.y)
    expect(h.anchor('south').y).toBeCloseTo(130) // bottom edge
    expect(h.anchor('east').x).toBeCloseTo(140) // right wall
    expect(h.anchor('west').x).toBeCloseTo(60) // left wall
  })

  it('serves shape-specific anchors through customAnchor', () => {
    const h = house()
    expect(h.anchor('roof').x).toBeCloseTo(100)
    expect(h.anchor('roof').y).toBeCloseTo(70) // apex = top of box
  })

  it('numeric anchors ray-cast the outline', () => {
    const h = house()
    const p = h.anchor(270) // straight up
    expect(p.x).toBeCloseTo(100)
    expect(p.y).toBeCloseTo(70) // exits through the apex
  })

  it('contains uses even-odd over vertices', () => {
    const h = house()
    expect(h.contains({ x: 100, y: 120 })).toBe(true) // inside walls
    expect(h.contains({ x: 100, y: 75 })).toBe(true) // inside roof
    expect(h.contains({ x: 65, y: 75 })).toBe(false) // beside the roof
    expect(h.contains({ x: 100, y: 200 })).toBe(false)
  })

  it('bounds come from vertex min/max', () => {
    expect(house().bounds).toEqual([60, 70, 140, 130])
  })

  it('toSVGPath emits a closed polyline', () => {
    expect(house().toSVGPath()).toBe('M 60 130 L 60 100 L 100 70 L 140 100 L 140 130 Z')
  })

  it('moveTo/resize preserve shape-specific options', () => {
    const h = house().moveTo({ x: 0, y: 0 })
    expect(h.center.x).toBe(0)
    expect(h.roofRatio).toBe(0.5)
    const r = house().resize(40, 40)
    expect(r.width).toBe(40)
    expect(r.bounds).toEqual([80, 80, 120, 120])
  })

  it('outerSep offsets compass anchors outward', () => {
    const h = new House({ center: { x: 100, y: 100 }, width: 80, height: 60, outerSep: 4 })
    expect(h.anchor('south').y).toBeCloseTo(134) // 130 + 4
    expect(h.anchor('east').x).toBeCloseTo(144) // 140 + 4
  })
})
