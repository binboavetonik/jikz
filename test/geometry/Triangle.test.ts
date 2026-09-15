import { describe, it, expect } from 'vitest'
import {
  Triangle,
  triangle,
  rightTriangle,
  isoscelesTriangle,
  equilateral,
} from '../../src/geometry/Triangle'
import { point } from '../../src/core/Point'

describe('Triangle', () => {
  describe('constructor and factories', () => {
    it('creates a triangle from three points', () => {
      const t = new Triangle({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 })
      expect(t.vertexCount).toBe(3)
    })

    it('triangle() factory creates a Triangle', () => {
      const t = triangle(point(0, 0), point(10, 0), point(5, 10))
      expect(t).toBeInstanceOf(Triangle)
    })

    it('rightTriangle() creates right triangle', () => {
      const t = rightTriangle(point(0, 0), 10, 10)
      expect(t.A.x).toBe(0)
      expect(t.B.x).toBe(10)
      expect(t.C.y).toBe(10)
      expect(t.isRight).toBe(true)
    })

    it('isoscelesTriangle() creates isosceles triangle', () => {
      const t = isoscelesTriangle(point(50, 100), 60, 40)
      expect(t.isIsosceles).toBe(true)
    })

    it('equilateral() creates equilateral triangle', () => {
      const t = equilateral(point(0, 0), 10)
      expect(t.isEquilateral).toBe(true)
    })
  })

  describe('vertices and sides', () => {
    const t = triangle(point(0, 0), point(10, 0), point(5, 10))

    it('A, B, C return vertices', () => {
      expect(t.A.x).toBe(0)
      expect(t.B.x).toBe(10)
      expect(t.C.y).toBe(10)
    })

    it('sideA is opposite to vertex A', () => {
      expect(t.sideA.start).toEqual(t.B)
      expect(t.sideA.end).toEqual(t.C)
    })

    it('a, b, c return side lengths', () => {
      expect(t.a).toBeCloseTo(t.sideA.length)
      expect(t.b).toBeCloseTo(t.sideB.length)
      expect(t.c).toBeCloseTo(t.sideC.length)
    })
  })

  describe('triangle centers', () => {
    // Right triangle for predictable centers
    const t = rightTriangle(point(0, 0), 6, 8)

    it('centroid is average of vertices', () => {
      expect(t.centroid.x).toBeCloseTo(2)
      expect(t.centroid.y).toBeCloseTo(8 / 3)
    })

    it('circumcenter is equidistant from all vertices', () => {
      const cc = t.circumcenter
      const d1 = cc.distanceTo(t.A)
      const d2 = cc.distanceTo(t.B)
      const d3 = cc.distanceTo(t.C)
      expect(d1).toBeCloseTo(d2)
      expect(d2).toBeCloseTo(d3)
    })

    it('incenter is equidistant from all sides', () => {
      const ic = t.incenter
      const d1 = t.sideA.distanceToPoint(ic)
      const d2 = t.sideB.distanceToPoint(ic)
      const d3 = t.sideC.distanceToPoint(ic)
      expect(d1).toBeCloseTo(d2)
      expect(d2).toBeCloseTo(d3)
    })

    it('orthocenter is intersection of altitudes', () => {
      // For a right triangle, orthocenter is at the right angle vertex
      const oc = t.orthocenter
      expect(oc.x).toBeCloseTo(0)
      expect(oc.y).toBeCloseTo(0)
    })

    // Regression: the right triangle above passed even while the
    // general case was wrong — the hand-derived altitude intersection
    // returned a point nowhere near the altitudes for a scalene
    // triangle, and the euler-line example drew H off the line.
    it('orthocenter lies on both altitudes of a scalene triangle', () => {
      const s = triangle(point(60, 190), point(320, 180), point(150, 40))
      const h = s.orthocenter
      // (H − A) ⟂ BC and (H − B) ⟂ AC
      expect(
        (h.x - s.A.x) * (s.C.x - s.B.x) + (h.y - s.A.y) * (s.C.y - s.B.y)
      ).toBeCloseTo(0)
      expect(
        (h.x - s.B.x) * (s.C.x - s.A.x) + (h.y - s.B.y) * (s.C.y - s.A.y)
      ).toBeCloseTo(0)
    })

    it('puts centroid, circumcenter and orthocenter on one Euler line', () => {
      const s = triangle(point(40, 200), point(300, 170), point(170, 30))
      const g = s.centroid, o = s.circumcenter, h = s.orthocenter
      const cross = (g.x - o.x) * (h.y - o.y) - (g.y - o.y) * (h.x - o.x)
      expect(cross).toBeCloseTo(0)
      // and OG : GH = 1 : 2
      expect(o.distanceTo(h)).toBeCloseTo(3 * o.distanceTo(g))
    })
  })

  describe('medians', () => {
    const t = triangle(point(0, 0), point(10, 0), point(5, 10))

    it('medianA connects A to midpoint of BC', () => {
      const median = t.medianA
      expect(median.start).toEqual(t.A)
      expect(median.end.x).toBeCloseTo(7.5)
      expect(median.end.y).toBeCloseTo(5)
    })

    it('medians returns all three medians', () => {
      expect(t.medians).toHaveLength(3)
    })

    it('all medians pass through centroid', () => {
      const centroid = t.centroid
      for (const median of t.medians) {
        expect(median.containsPoint(centroid)).toBe(true)
      }
    })
  })

  describe('altitudes', () => {
    const t = triangle(point(0, 0), point(10, 0), point(5, 10))

    it('altitudeA is perpendicular to sideA', () => {
      const alt = t.altitudeA
      expect(alt.start).toEqual(t.A)
      expect(t.sideA.isPerpendicularTo(alt)).toBe(true)
    })

    it('altitudes returns all three altitudes', () => {
      expect(t.altitudes).toHaveLength(3)
    })
  })

  describe('perpendicular bisectors', () => {
    const t = triangle(point(0, 0), point(10, 0), point(5, 10))

    it('perpBisectorA bisects and is perpendicular to sideA', () => {
      const pb = t.perpBisectorA
      expect(t.sideA.isPerpendicularTo(pb)).toBe(true)
      expect(pb.containsPoint(t.sideA.midpoint)).toBe(true)
    })

    it('perpendicularBisectors returns all three', () => {
      expect(t.perpendicularBisectors).toHaveLength(3)
    })

    it('all perpendicular bisectors pass through circumcenter', () => {
      const cc = t.circumcenter
      for (const pb of t.perpendicularBisectors) {
        expect(pb.containsPoint(cc)).toBe(true)
      }
    })
  })

  describe('circles', () => {
    const t = triangle(point(0, 0), point(10, 0), point(5, 10))

    it('circumcircle passes through all vertices', () => {
      const cc = t.circumcircle
      expect(cc.containsPoint(t.A)).toBe(true)
      expect(cc.containsPoint(t.B)).toBe(true)
      expect(cc.containsPoint(t.C)).toBe(true)
    })

    it('circumradius equals circumcircle radius', () => {
      expect(t.circumradius).toBe(t.circumcircle.radius)
    })

    it('incircle is tangent to all sides', () => {
      const ic = t.incircle
      // Distance from incenter to each side equals inradius
      const d1 = t.sideA.distanceToPoint(ic.center)
      expect(d1).toBeCloseTo(ic.radius)
    })

    it('inradius equals incircle radius', () => {
      expect(t.inradius).toBeCloseTo(t.incircle.radius)
    })
  })

  describe('angles', () => {
    const t = rightTriangle(point(0, 0), 3, 4)

    it('angleA, angleB, angleC return angles in radians', () => {
      // Right angle at A
      expect(t.angleA).toBeCloseTo(Math.PI / 2)
      expect(t.angleA + t.angleB + t.angleC).toBeCloseTo(Math.PI)
    })

    it('angles returns all three angles', () => {
      const angles = t.angles
      expect(angles).toHaveLength(3)
      expect(angles[0]! + angles[1]! + angles[2]!).toBeCloseTo(Math.PI)
    })
  })

  describe('classification', () => {
    it('isEquilateral detects equilateral triangles', () => {
      const eq = equilateral(point(0, 0), 10)
      expect(eq.isEquilateral).toBe(true)
      expect(eq.isIsosceles).toBe(true)
      expect(eq.isScalene).toBe(false)
    })

    it('isIsosceles detects isosceles triangles', () => {
      const iso = isoscelesTriangle(point(0, 0), 10, 15)
      expect(iso.isIsosceles).toBe(true)
      expect(iso.isEquilateral).toBe(false)
    })

    it('isScalene detects scalene triangles', () => {
      const scalene = triangle(point(0, 0), point(5, 0), point(2, 3))
      expect(scalene.isScalene).toBe(true)
    })

    it('isRight detects right triangles', () => {
      const rt = rightTriangle(point(0, 0), 3, 4)
      expect(rt.isRight).toBe(true)
      expect(rt.isAcute).toBe(false)
      expect(rt.isObtuse).toBe(false)
    })

    it('isAcute detects acute triangles', () => {
      const acute = equilateral(point(0, 0), 10)
      expect(acute.isAcute).toBe(true)
      expect(acute.isObtuse).toBe(false)
    })

    it('isObtuse detects obtuse triangles', () => {
      const obtuse = triangle(point(0, 0), point(10, 0), point(2, 1))
      expect(obtuse.isObtuse).toBe(true)
      expect(obtuse.isAcute).toBe(false)
    })
  })

  describe('transformations', () => {
    const t = triangle(point(0, 0), point(10, 0), point(5, 10))

    it('translate() returns Triangle', () => {
      const moved = t.translate(5, 5)
      expect(moved).toBeInstanceOf(Triangle)
      expect(moved.A.x).toBe(5)
    })

    it('scale() returns Triangle', () => {
      const scaled = t.scale(2)
      expect(scaled).toBeInstanceOf(Triangle)
      expect(scaled.area).toBeCloseTo(t.area * 4)
    })

    it('rotate() returns Triangle', () => {
      const rotated = t.rotate(90)
      expect(rotated).toBeInstanceOf(Triangle)
      expect(rotated.area).toBeCloseTo(t.area)
    })

    it('reverse() returns Triangle', () => {
      const reversed = t.reverse()
      expect(reversed).toBeInstanceOf(Triangle)
      expect(reversed.A).toEqual(t.C)
    })
  })

  describe('special cases', () => {
    it('3-4-5 right triangle has correct properties', () => {
      const t = rightTriangle(point(0, 0), 3, 4)
      // A=(0,0), B=(3,0), C=(0,4)
      // side a (BC) = hypotenuse = 5
      // side b (AC) = 4
      // side c (AB) = 3
      expect(t.c).toBeCloseTo(3)
      expect(t.b).toBeCloseTo(4)
      expect(t.a).toBeCloseTo(5)
      expect(t.area).toBeCloseTo(6)
    })

    it('equilateral triangle has all equal angles', () => {
      const eq = equilateral(point(0, 0), 10)
      const [a, b, c] = eq.angles
      expect(a).toBeCloseTo(Math.PI / 3)
      expect(b).toBeCloseTo(Math.PI / 3)
      expect(c).toBeCloseTo(Math.PI / 3)
    })
  })
})
