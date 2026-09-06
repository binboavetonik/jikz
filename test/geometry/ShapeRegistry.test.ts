/**
 * Shape registry tests: built-ins are registered, user shapes can be
 * added by name, and registered names work through Node and Picture.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { Node, SHAPE_TYPES } from '../../src/node/Node'
import { picture } from '../../src/picture/Picture'
import {
  registerShape,
  createShape,
  hasShape,
  registeredShapeNames,
} from '../../src/geometry/registry'
import { AnchoredPolygon } from '../../src/geometry/AnchoredPolygon'
import { Point } from '../../src/core/Point'
import type { PointLike } from '../../src/core/types'
import { DEFAULT_SHAPE_OPTIONS, type ShapeOptions } from '../../src/geometry/Shape'

/** Minimal user shape for registration tests. */
class TriangleUpShape extends AnchoredPolygon {
  readonly type = 'triangle up'
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number

  constructor(options: ShapeOptions = {}) {
    super()
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
  }

  get vertices(): Point[] {
    const hw = this.width / 2
    const hh = this.height / 2
    return [
      point(this.center.x, this.center.y - hh),
      point(this.center.x + hw, this.center.y + hh),
      point(this.center.x - hw, this.center.y + hh),
    ]
  }

  moveTo(center: PointLike): TriangleUpShape {
    return new TriangleUpShape({ center, width: this.width, height: this.height })
  }

  resize(width: number, height: number): TriangleUpShape {
    return new TriangleUpShape({ center: this.center, width, height })
  }
}

registerShape('triangle up', (o) => new TriangleUpShape(o))

/**
 * Compile-time half of the registration above — the pattern
 * registerShape()'s docs prescribe: augmenting ShapeRegistry makes
 * `'triangle up'` a valid, autocomplete-able `node({ shape })` name.
 */
declare module '../../src/node/Node' {
  interface ShapeRegistry {
    'triangle up': {}
  }
}

describe('shape registry', () => {
  it('every SHAPE_TYPES entry is registered', () => {
    for (const name of SHAPE_TYPES) {
      expect(hasShape(name), `missing registration for "${name}"`).toBe(true)
    }
  })

  it('registeredShapeNames includes built-ins and user shapes', () => {
    const names = registeredShapeNames()
    expect(names).toContain('rectangle')
    expect(names).toContain('star')
    expect(names).toContain('triangle up')
  })

  it('createShape builds by name with ShapeOptions', () => {
    const s = createShape('rectangle', { center: { x: 50, y: 50 }, width: 40, height: 20 })
    expect(s.bounds).toEqual([30, 40, 70, 60])
  })

  it('createShape throws with known names for unknown types', () => {
    expect(() => createShape('nope')).toThrow(/Unknown shape type: "nope" \(known: /)
  })

  it('user shapes work through node({ shape: name })', () => {
    const n = new Node({ shape: 'triangle up', at: point(100, 100), width: 60, height: 60 })
    expect(n.shape.type).toBe('triangle up')
    expect(n.anchor('north').y).toBeLessThan(n.center.y)
  })

  it('shapeOptions forward shape-specific options to the factory', () => {
    const n = new Node({
      shape: 'star',
      at: point(100, 100),
      width: 60,
      height: 60,
      shapeOptions: { points: 8 },
    })
    expect((n.shape as { points: number }).points).toBe(8)
    // 8-point star → 16 vertices
    expect((n.shape as { vertices: unknown[] }).vertices.length).toBe(16)
  })

  it('user shapes work through Picture by name and render', () => {
    const svg = picture()
      .node('T', { shape: 'triangle up', at: point(60, 60), width: 60, height: 60, text: 'T' })
      .node('R', { shape: 'rectangle', at: point(180, 60), width: 60, height: 40, text: 'R' })
      .edge('T', 'R', { arrowEnd: 'to' })
      .toSVG({ width: 240, height: 120 })
    expect(svg).toContain('<path')
    expect(svg).toContain('M 60 30 L 90 90 L 30 90 Z')
  })

  it('re-registration replaces the previous factory', () => {
    registerShape('triangle up', (o) => new TriangleUpShape({ ...o, width: 30, height: 30 }))
    const s = createShape('triangle up', { center: { x: 0, y: 0 }, width: 99, height: 99 })
    expect(s.width).toBe(30)
    // restore the straightforward factory for other tests
    registerShape('triangle up', (o) => new TriangleUpShape(o))
  })
})
