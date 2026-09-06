import { describe, it, expect } from 'vitest'
import { Transform, transform, fromMatrix } from '../../src/core/Transform'
import { point } from '../../src/core/Point'

describe('Transform', () => {
  describe('constructor and factory', () => {
    it('creates identity transform by default', () => {
      const t = new Transform()
      expect(t.matrix).toEqual([1, 0, 0, 1, 0, 0])
    })

    it('creates transform from matrix', () => {
      const t = new Transform([2, 0, 0, 2, 10, 20])
      expect(t.a).toBe(2)
      expect(t.d).toBe(2)
      expect(t.e).toBe(10)
      expect(t.f).toBe(20)
    })

    it('transform() factory creates identity', () => {
      const t = transform()
      expect(t.isIdentity()).toBe(true)
    })

    it('fromMatrix() creates from array', () => {
      const t = fromMatrix([1, 0, 0, 1, 5, 5])
      expect(t.e).toBe(5)
      expect(t.f).toBe(5)
    })
  })

  describe('matrix components', () => {
    it('exposes all matrix components', () => {
      const t = new Transform([1, 2, 3, 4, 5, 6])
      expect(t.a).toBe(1)
      expect(t.b).toBe(2)
      expect(t.c).toBe(3)
      expect(t.d).toBe(4)
      expect(t.e).toBe(5)
      expect(t.f).toBe(6)
    })
  })

  describe('static factory methods', () => {
    it('identity() creates identity transform', () => {
      const t = Transform.identity()
      expect(t.isIdentity()).toBe(true)
    })

    it('translation() creates translation', () => {
      const t = Transform.translation(10, 20)
      expect(t.e).toBe(10)
      expect(t.f).toBe(20)
      expect(t.a).toBe(1)
      expect(t.d).toBe(1)
    })

    it('rotation() creates rotation', () => {
      const t = Transform.rotation(90)
      const p = t.apply(point(1, 0))
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(1)
    })

    it('scaling() creates uniform scale', () => {
      const t = Transform.scaling(2)
      expect(t.a).toBe(2)
      expect(t.d).toBe(2)
    })

    it('scaling() creates non-uniform scale', () => {
      const t = Transform.scaling(2, 3)
      expect(t.a).toBe(2)
      expect(t.d).toBe(3)
    })

    it('shearing() creates shear transform', () => {
      const t = Transform.shearing(0.5, 0)
      const p = t.apply(point(0, 1))
      expect(p.x).toBeCloseTo(0.5)
      expect(p.y).toBeCloseTo(1)
    })

    it('reflectX() reflects across X axis', () => {
      const t = Transform.reflectX()
      const p = t.apply(point(1, 1))
      expect(p.x).toBeCloseTo(1)
      expect(p.y).toBeCloseTo(-1)
    })

    it('reflectY() reflects across Y axis', () => {
      const t = Transform.reflectY()
      const p = t.apply(point(1, 1))
      expect(p.x).toBeCloseTo(-1)
      expect(p.y).toBeCloseTo(1)
    })

    it('reflectAcrossLine() reflects across arbitrary line', () => {
      const t = Transform.reflectAcrossLine(45)
      const p = t.apply(point(1, 0))
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(1)
    })

    it('rotationAround() rotates around a point', () => {
      const t = Transform.rotationAround(1, 0, 90)
      const p = t.apply(point(2, 0))
      expect(p.x).toBeCloseTo(1)
      expect(p.y).toBeCloseTo(1)
    })
  })

  describe('transform operations', () => {
    it('translate() adds translation', () => {
      const t = transform().translate(10, 20)
      const p = t.apply(point(0, 0))
      expect(p.x).toBe(10)
      expect(p.y).toBe(20)
    })

    it('rotate() adds rotation', () => {
      const t = transform().rotate(90)
      const p = t.apply(point(1, 0))
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(1)
    })

    it('rotateAround() rotates around a center', () => {
      const t = transform().rotateAround(1, 0, 90)
      const p = t.apply(point(2, 0))
      expect(p.x).toBeCloseTo(1)
      expect(p.y).toBeCloseTo(1)
    })

    it('scale() adds scaling', () => {
      const t = transform().scale(2)
      const p = t.apply(point(3, 4))
      expect(p.x).toBe(6)
      expect(p.y).toBe(8)
    })

    it('scale() with non-uniform factors', () => {
      const t = transform().scale(2, 3)
      const p = t.apply(point(1, 1))
      expect(p.x).toBe(2)
      expect(p.y).toBe(3)
    })

    it('scaleAround() scales around a center', () => {
      const t = transform().scaleAround(5, 5, 2)
      const p = t.apply(point(5, 5))
      expect(p.x).toBeCloseTo(5)
      expect(p.y).toBeCloseTo(5)

      const p2 = t.apply(point(10, 5))
      expect(p2.x).toBeCloseTo(15)
      expect(p2.y).toBeCloseTo(5)
    })

    it('shear() adds shearing', () => {
      const t = transform().shear(1, 0)
      const p = t.apply(point(0, 1))
      expect(p.x).toBeCloseTo(1)
      expect(p.y).toBeCloseTo(1)
    })
  })

  describe('compose', () => {
    it('composes two transforms', () => {
      const t1 = Transform.translation(10, 0)
      const t2 = Transform.scaling(2)
      const composed = t1.compose(t2)

      const p = composed.apply(point(5, 0))
      // First scale: 5 * 2 = 10, then translate: 10 + 10 = 20
      expect(p.x).toBeCloseTo(20)
    })

    it('compose order matters', () => {
      const translate = Transform.translation(10, 0)
      const scale = Transform.scaling(2)

      const scaleFirst = translate.compose(scale)
      const translateFirst = scale.compose(translate)

      const p1 = scaleFirst.apply(point(1, 0))
      const p2 = translateFirst.apply(point(1, 0))

      // scale(1) = 2, translate(2) = 12
      expect(p1.x).toBeCloseTo(12)
      // translate(1) = 11, scale(11) = 22
      expect(p2.x).toBeCloseTo(22)
    })
  })

  describe('inverse', () => {
    it('inverse() returns inverse transform', () => {
      const t = Transform.translation(10, 20)
      const inv = t.inverse()

      const p = inv.apply(t.apply(point(5, 5)))
      expect(p.x).toBeCloseTo(5)
      expect(p.y).toBeCloseTo(5)
    })

    it('inverse() works for rotation', () => {
      const t = Transform.rotation(45)
      const inv = t.inverse()

      const p = inv.apply(t.apply(point(1, 0)))
      expect(p.x).toBeCloseTo(1)
      expect(p.y).toBeCloseTo(0)
    })

    it('inverse() works for scale', () => {
      const t = Transform.scaling(2, 3)
      const inv = t.inverse()

      const p = inv.apply(t.apply(point(5, 7)))
      expect(p.x).toBeCloseTo(5)
      expect(p.y).toBeCloseTo(7)
    })

    it('inverse() throws for non-invertible matrix', () => {
      const t = new Transform([0, 0, 0, 0, 0, 0])
      expect(() => t.inverse()).toThrow('not invertible')
    })
  })

  describe('determinant', () => {
    it('identity has determinant 1', () => {
      expect(Transform.identity().determinant).toBe(1)
    })

    it('scale(2) has determinant 4', () => {
      expect(Transform.scaling(2).determinant).toBe(4)
    })

    it('rotation preserves determinant', () => {
      expect(Transform.rotation(45).determinant).toBeCloseTo(1)
    })
  })

  describe('utilities', () => {
    it('isIdentity() detects identity', () => {
      expect(Transform.identity().isIdentity()).toBe(true)
      expect(Transform.translation(1, 0).isIdentity()).toBe(false)
    })

    it('toCSSMatrix() returns CSS format', () => {
      const t = new Transform([1, 2, 3, 4, 5, 6])
      expect(t.toCSSMatrix()).toBe('matrix(1, 2, 3, 4, 5, 6)')
    })

    it('toSVGMatrix() returns SVG format', () => {
      const t = new Transform([1, 2, 3, 4, 5, 6])
      expect(t.toSVGMatrix()).toBe('matrix(1 2 3 4 5 6)')
    })

    it('clone() creates a copy', () => {
      const t = Transform.translation(10, 20)
      const clone = t.clone()
      expect(clone.matrix).toEqual(t.matrix)
      expect(clone).not.toBe(t)
    })

    it('toString() returns formatted string', () => {
      const t = new Transform([1, 0, 0, 1, 0, 0])
      expect(t.toString()).toBe('Transform(1, 0, 0, 1, 0, 0)')
    })
  })

  describe('chainability', () => {
    it('operations can be chained', () => {
      const t = transform()
        .translate(10, 0)
        .rotate(90)
        .scale(2)

      const p = t.apply(point(1, 0))
      // Starting with (1, 0)
      // scale(2): (2, 0)
      // rotate(90): (0, 2)
      // translate(10, 0): (10, 2)
      expect(p.x).toBeCloseTo(10)
      expect(p.y).toBeCloseTo(2)
    })
  })

  describe('apply', () => {
    it('applies transform to a point', () => {
      const t = transform().translate(5, 5).scale(2)
      const p = t.apply(point(1, 1))
      // scale(2): (2, 2)
      // translate(5, 5): (7, 7)
      expect(p.x).toBe(7)
      expect(p.y).toBe(7)
    })
  })
})
