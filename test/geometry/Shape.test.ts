import { describe, it, expect } from 'vitest'
import type { Shape } from '../../src/geometry/Shape'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { rect } from '../../src/geometry/Rectangle'
import { ellipse } from '../../src/geometry/Ellipse'
import { polygon } from '../../src/geometry/Polygon'
import { triangle } from '../../src/geometry/Triangle'

/**
 * Stage 1 verification: every geometry primitive implements Shape.
 *
 * This is a contract test — for each primitive we exercise the same set of
 * Shape-interface members. If any method is missing or misbehaves, the
 * type check fails at compile time or the assertion fails at runtime.
 */

type Candidate = { name: string; shape: Shape; cx: number; cy: number }

const candidates: Candidate[] = [
  { name: 'Circle', shape: circle(point(50, 60), 20), cx: 50, cy: 60 },
  { name: 'Rectangle', shape: rect(10, 20, 80, 40), cx: 50, cy: 40 },
  { name: 'Ellipse', shape: ellipse(point(100, 100), 30, 20), cx: 100, cy: 100 },
  {
    name: 'Polygon',
    shape: polygon([point(0, 0), point(100, 0), point(100, 80), point(0, 80)]),
    cx: 50,
    cy: 40,
  },
  {
    name: 'Triangle',
    shape: triangle(point(0, 0), point(100, 0), point(50, 80)),
    cx: 50,
    cy: 80 / 3,
  },
]

describe('Shape contract', () => {
  for (const { name, shape, cx, cy } of candidates) {
    describe(name, () => {
      it('exposes a non-empty type tag', () => {
        expect(typeof shape.type).toBe('string')
        expect(shape.type.length).toBeGreaterThan(0)
      })

      it('has a center near the expected point', () => {
        expect(shape.center.x).toBeCloseTo(cx, 5)
        expect(shape.center.y).toBeCloseTo(cy, 5)
      })

      it('reports positive width and height', () => {
        expect(shape.width).toBeGreaterThan(0)
        expect(shape.height).toBeGreaterThan(0)
      })

      it('reports a well-formed bounds tuple', () => {
        const [minX, minY, maxX, maxY] = shape.bounds
        expect(maxX).toBeGreaterThanOrEqual(minX)
        expect(maxY).toBeGreaterThanOrEqual(minY)
        expect(maxX - minX).toBeCloseTo(shape.width, 5)
        expect(maxY - minY).toBeCloseTo(shape.height, 5)
      })

      it('contains() is true for the center and false for a far-away point', () => {
        expect(shape.contains(shape.center)).toBe(true)
        expect(shape.contains({ x: 10_000, y: 10_000 })).toBe(false)
      })

      it('anchor("center") returns the center', () => {
        const c = shape.anchor('center')
        expect(c.x).toBeCloseTo(shape.center.x, 5)
        expect(c.y).toBeCloseTo(shape.center.y, 5)
      })

      it('anchor(angle) and boundaryPoint(angle) agree', () => {
        // Sample a handful of angles; values should match exactly since
        // anchor() delegates to boundaryPoint() for numeric specs.
        for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
          const a = shape.anchor(angle)
          const b = shape.boundaryPoint(angle)
          expect(a.x).toBeCloseTo(b.x, 5)
          expect(a.y).toBeCloseTo(b.y, 5)
        }
      })

      it('boundaryPoint falls within the shape bounding box', () => {
        // A weaker but universal check: the returned point should lie
        // within the shape's bounding box (with small slack for rounding).
        // We don't assert `contains()` here — Polygon uses ray-casting
        // that is strict-exclusive at edges, so a boundary point can
        // report as "not contained" without being a bug.
        const [minX, minY, maxX, maxY] = shape.bounds
        const slack = 1e-6
        for (const angle of [0, 90, 180, 270, 45]) {
          const p = shape.boundaryPoint(angle)
          expect(p.x).toBeGreaterThanOrEqual(minX - slack)
          expect(p.x).toBeLessThanOrEqual(maxX + slack)
          expect(p.y).toBeGreaterThanOrEqual(minY - slack)
          expect(p.y).toBeLessThanOrEqual(maxY + slack)
        }
      })

      it('toSVGPath() returns a non-empty string starting with a move command', () => {
        const d = shape.toSVGPath()
        expect(typeof d).toBe('string')
        expect(d.length).toBeGreaterThan(0)
        expect(d.trim().startsWith('M')).toBe(true)
      })

      it('moveTo(newCenter) produces a shape centered at newCenter', () => {
        const target = { x: 500, y: 500 }
        const moved = shape.moveTo(target)
        expect(moved.center.x).toBeCloseTo(target.x, 5)
        expect(moved.center.y).toBeCloseTo(target.y, 5)
        // Dimensions preserved.
        expect(moved.width).toBeCloseTo(shape.width, 5)
        expect(moved.height).toBeCloseTo(shape.height, 5)
      })

      it('resize(w, h) produces a shape whose bounding box is at least w × h', () => {
        // Shapes are allowed to preserve aspect where it would otherwise
        // distort their identity (Circle stays circular — height follows
        // max(w, h)). The universal guarantee is that the resulting
        // bounding box is *at least* the requested size along each axis.
        const resized = shape.resize(200, 100)
        expect(resized.width).toBeGreaterThanOrEqual(200 - 1e-6)
        expect(resized.height).toBeGreaterThanOrEqual(100 - 1e-6)
      })
    })
  }

  it('accepts geometry primitives in Shape-typed collections', () => {
    // Compile-time assurance: any of these values is assignable to Shape[].
    const shapes: Shape[] = [
      circle(point(0, 0), 10),
      rect(0, 0, 10, 10),
      ellipse(point(0, 0), 10, 5),
      polygon([point(0, 0), point(10, 0), point(5, 10)]),
      triangle(point(0, 0), point(10, 0), point(5, 10)),
    ]
    // Do something with the list so the compiler doesn't optimize it away
    // in stricter build settings and so we check runtime iteration works.
    for (const s of shapes) {
      expect(typeof s.toSVGPath()).toBe('string')
    }
  })
})
