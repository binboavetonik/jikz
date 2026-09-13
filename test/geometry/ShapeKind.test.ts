/**
 * Shape kinds and shape sets: names are keys in a value, not entries in
 * a global table. Covers defining a kind, handing sets to a picture,
 * per-name options, and what happens for a name nothing provides.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { Node } from '../../src/node/Node'
import { picture } from '../../src/picture/Picture'
import { defineShape, isShapeKind } from '../../src/geometry/ShapeKind'
import { allShapes, basicShapes, complexShapes } from '../../src/geometry/shapes'
import { AnchoredPolygon } from '../../src/geometry/AnchoredPolygon'
import { Point } from '../../src/core/Point'
import type { PointLike } from '../../src/core/types'
import { DEFAULT_SHAPE_OPTIONS, type ShapeOptions } from '../../src/geometry/Shape'

const SHAPES = allShapes

/** Minimal user shape, the way an extension would define one. */
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

/** A custom kind — the whole extension recipe, with no registration. */
const triangleUp = defineShape('triangle up', (o: ShapeOptions) => new TriangleUpShape(o))

describe('shape sets', () => {
  it('allShapes is the primitives plus the complex catalogue', () => {
    for (const name of Object.keys(basicShapes)) {
      expect(allShapes).toHaveProperty(name)
    }
    for (const name of Object.keys(complexShapes)) {
      expect(allShapes).toHaveProperty(name)
    }
    expect(Object.keys(allShapes).length).toBe(
      Object.keys(basicShapes).length + Object.keys(complexShapes).length
    )
  })

  it('every entry is a kind that knows its own name', () => {
    for (const [name, kind] of Object.entries(allShapes)) {
      expect(isShapeKind(kind)).toBe(true)
      expect(kind.kindName).toBe(name)
      expect(kind.textAutoSize).toBe(true)
    }
  })

  it('a kind builds its shape when called directly', () => {
    const s = basicShapes.rectangle({ center: { x: 50, y: 50 }, width: 40, height: 20 })
    expect(s.bounds).toEqual([30, 40, 70, 60])
  })
})

describe('shapes through Node', () => {
  it('a user kind works as a node shape', () => {
    const n = new Node({ shape: triangleUp, at: point(100, 100), width: 60, height: 60 })
    expect(n.shape.type).toBe('triangle up')
    expect(n.anchor('north').y).toBeLessThan(n.center.y)
  })

  it('shapeOptions forward shape-specific options to the kind', () => {
    const n = new Node({
      shape: SHAPES['star'],
      at: point(100, 100),
      width: 60,
      height: 60,
      shapeOptions: { points: 8 },
    })
    expect((n.shape as { points: number }).points).toBe(8)
    // 8-point star → 16 vertices
    expect((n.shape as { vertices: unknown[] }).vertices.length).toBe(16)
  })

  it('defaults to a rectangle when no shape is given', () => {
    expect(new Node({ at: point(0, 0), width: 10, height: 10 }).shape.type).toBe('rectangle')
  })
})

describe('shapes through Picture', () => {
  it('resolves names from the set it was given, and renders', () => {
    const svg = picture({ shapes: { ...SHAPES, 'triangle up': triangleUp } })
      .node('T', { shape: 'triangle up', at: point(60, 60), width: 60, height: 60, text: 'T' })
      .node('R', { shape: 'rectangle', at: point(180, 60), width: 60, height: 40, text: 'R' })
      .edge('T', 'R', { arrowEnd: 'to' })
      .toSVG({ width: 240, height: 120 })
    expect(svg).toContain('<path')
    expect(svg).toContain('M 60 30 L 90 90 L 30 90 Z')
  })

  it('a name the set does not provide throws, naming what IS in scope', () => {
    expect(() =>
      picture({ shapes: basicShapes }).node('X', { shape: 'star' as 'circle' })
    ).toThrow(/unknown shape "star" \(shapes in scope: "rectangle", "circle"/)
  })

  it('a picture with no set rejects every name', () => {
    expect(() => picture().node('X', { shape: 'circle' as never })).toThrow(
      /shapes in scope: none/
    )
  })

  it('later entries win when sets are merged — visibly, at one call site', () => {
    const square = defineShape('square', (o: ShapeOptions) => basicShapes.rectangle(o))
    const merged = { ...basicShapes, circle: square }
    expect(merged.circle.kindName).toBe('square')
    const n = new Node({ shape: merged.circle, at: point(10, 10), width: 20, height: 20 })
    expect(n.shape.type).toBe('rectangle')
  })
})
