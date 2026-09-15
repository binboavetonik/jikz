/**
 * Export-identity guard.
 *
 * `src/geometry/index.ts` re-exports two layers that share five names:
 * the vertex-layer Polygon/Triangle factories (`star`, `regularPolygon`,
 * `pentagon`, `hexagon`, `isoscelesTriangle` — center + radius, return a
 * drawable Polygon) and complex/'s shape-KIND factories of the same
 * names (a single options object, return a Shape for a node).
 *
 * While the complex barrel came in through `export *`, the name was
 * ambiguous and the two toolchains disagreed: TypeScript resolved it to
 * the explicit Polygon export, bundlers to the `export *` one. So
 * `star(point(120, 110), 80, 34, 5)` type-checked and then drew a
 * default 10px star at the ORIGIN — which is exactly what shipped in
 * the clipping and honeycomb examples. Reported 2026-09-14.
 *
 * The public lowercase factory is the vertex-layer one; the shape kinds
 * are reached through their classes or by name from `allShapes`.
 */
import { describe, it, expect } from 'vitest'
import {
  star,
  hexagon,
  pentagon,
  regularPolygon,
  isoscelesTriangle,
  allShapes,
  Polygon,
  Triangle,
  isShapeKind,
} from '../../src/index'
import { point } from '../../src/core/Point'

describe('vertex-layer factories are not shadowed by the shape kinds', () => {
  it('star() takes center + radii and lands where it is told', () => {
    const s = star(point(120, 110), 80, 34, 5)
    expect(s).toBeInstanceOf(Polygon)
    expect(s.vertices).toHaveLength(10)
    expect(s.vertices[0]!.x).toBeCloseTo(120)
    expect(s.vertices[0]!.y).toBeCloseTo(30) // first vertex at -90°, R = 80
  })

  it('hexagon()/pentagon()/regularPolygon() are centered polygons', () => {
    for (const [poly, sides] of [
      [hexagon(point(50, 60), 20), 6],
      [pentagon(point(50, 60), 20), 5],
      [regularPolygon(point(50, 60), 20, 7), 7],
    ] as const) {
      expect(poly).toBeInstanceOf(Polygon)
      expect(poly.vertices).toHaveLength(sides)
      expect(poly.center.x).toBeCloseTo(50)
      expect(poly.center.y).toBeCloseTo(60)
    }
  })

  it('isoscelesTriangle() is the base+width+height Triangle factory', () => {
    const t = isoscelesTriangle(point(50, 100), 100, 60)
    expect(t).toBeInstanceOf(Triangle)
    expect(t.A.x).toBeCloseTo(0)   // base midpoint minus half the width
    expect(t.C.y).toBeCloseTo(40)  // apex, `height` above the base
  })

  it('still reaches the shape kinds by name', () => {
    for (const name of ['star', 'regular polygon', 'isosceles triangle'] as const) {
      expect(isShapeKind(allShapes[name])).toBe(true)
    }
  })
})
