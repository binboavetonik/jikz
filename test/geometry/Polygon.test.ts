import { describe, it, expect } from 'vitest'
import {
  Polygon,
  polygon,
  regularPolygon,
  equilateralTriangle,
  regularSquare,
  pentagon,
  hexagon,
  star,
} from '../../src/geometry/Polygon'
import { point } from '../../src/core/Point'

describe('Polygon', () => {
  describe('constructor and factories', () => {
    it('creates a polygon from vertices', () => {
      const p = new Polygon([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ])
      expect(p.vertexCount).toBe(3)
    })

    it('throws for less than 3 vertices', () => {
      expect(() => new Polygon([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow()
    })

    it('polygon() factory creates a Polygon', () => {
      const p = polygon([point(0, 0), point(10, 0), point(10, 10)])
      expect(p).toBeInstanceOf(Polygon)
    })

    it('regularPolygon() creates regular n-gon', () => {
      const hex = regularPolygon(point(0, 0), 10, 6)
      expect(hex.vertexCount).toBe(6)
      // All vertices equidistant from center
      for (const v of hex.vertices) {
        expect(v.distanceTo(point(0, 0))).toBeCloseTo(10)
      }
    })

    it('equilateralTriangle() creates 3-sided regular polygon', () => {
      const tri = equilateralTriangle(point(0, 0), 10)
      expect(tri.vertexCount).toBe(3)
    })

    it('regularSquare() creates 4-sided regular polygon', () => {
      const sq = regularSquare(point(0, 0), 10)
      expect(sq.vertexCount).toBe(4)
    })

    it('pentagon() creates 5-sided regular polygon', () => {
      const pent = pentagon(point(0, 0), 10)
      expect(pent.vertexCount).toBe(5)
    })

    it('hexagon() creates 6-sided regular polygon', () => {
      const hex = hexagon(point(0, 0), 10)
      expect(hex.vertexCount).toBe(6)
    })

    it('star() creates star polygon', () => {
      const s = star(point(0, 0), 20, 10, 5)
      expect(s.vertexCount).toBe(10) // 5 outer + 5 inner
    })
  })

  describe('properties', () => {
    // Square with vertices at (0,0), (10,0), (10,10), (0,10)
    const sq = polygon([
      point(0, 0), point(10, 0), point(10, 10), point(0, 10)
    ])

    it('vertex() returns vertex at index', () => {
      expect(sq.vertex(0).x).toBe(0)
      expect(sq.vertex(1).x).toBe(10)
      expect(sq.vertex(4).x).toBe(0) // wraps
      expect(sq.vertex(-1).x).toBe(0) // wraps negative
    })

    it('edges returns all edges as Lines', () => {
      const edges = sq.edges
      expect(edges).toHaveLength(4)
      expect(edges[0]!.start.x).toBe(0)
      expect(edges[0]!.end.x).toBe(10)
    })

    it('signedArea is positive for CCW', () => {
      expect(sq.signedArea).toBeCloseTo(100)
    })

    it('signedArea is negative for CW', () => {
      const cwSquare = sq.reverse()
      expect(cwSquare.signedArea).toBeCloseTo(-100)
    })

    it('area is always positive', () => {
      expect(sq.area).toBeCloseTo(100)
      expect(sq.reverse().area).toBeCloseTo(100)
    })

    it('perimeter is correct', () => {
      expect(sq.perimeter).toBeCloseTo(40)
    })

    it('centroid is geometric center', () => {
      expect(sq.centroid.x).toBeCloseTo(5)
      expect(sq.centroid.y).toBeCloseTo(5)
    })

    it('isCounterClockwise detects winding', () => {
      expect(sq.isCounterClockwise).toBe(true)
      expect(sq.reverse().isCounterClockwise).toBe(false)
    })

    it('isConvex detects convex polygons', () => {
      expect(sq.isConvex).toBe(true)

      // Concave polygon (arrow shape)
      const concave = polygon([
        point(0, 0), point(10, 5), point(0, 10), point(3, 5)
      ])
      expect(concave.isConvex).toBe(false)
    })
  })

  describe('geometric operations', () => {
    const sq = polygon([
      point(0, 0), point(10, 0), point(10, 10), point(0, 10)
    ])

    it('contains() checks if point is inside', () => {
      expect(sq.contains(point(5, 5))).toBe(true)
      expect(sq.contains(point(0, 0))).toBe(true) // on boundary
      expect(sq.contains(point(15, 5))).toBe(false)
    })

    it('containsOnBoundary() checks boundary', () => {
      expect(sq.containsOnBoundary(point(5, 0))).toBe(true)
      expect(sq.containsOnBoundary(point(5, 5))).toBe(false)
    })

    it('closestPoint() returns nearest point on boundary', () => {
      const closest = sq.closestPoint(point(5, 15))
      expect(closest.x).toBeCloseTo(5)
      expect(closest.y).toBeCloseTo(10)
    })

    it('reverse() reverses vertex order', () => {
      const reversed = sq.reverse()
      expect(reversed.vertex(0).x).toBe(0)
      expect(reversed.vertex(0).y).toBe(10)
    })

    it('translate() moves polygon', () => {
      const moved = sq.translate(5, 5)
      expect(moved.vertex(0).x).toBe(5)
      expect(moved.vertex(0).y).toBe(5)
    })

    it('scale() scales around centroid', () => {
      const scaled = sq.scale(2)
      expect(scaled.centroid.x).toBeCloseTo(5)
      expect(scaled.area).toBeCloseTo(400)
    })

    it('scale() scales around custom point', () => {
      const scaled = sq.scale(2, point(0, 0))
      expect(scaled.vertex(0).x).toBe(0)
      expect(scaled.vertex(1).x).toBe(20)
    })

    it('rotate() rotates around centroid', () => {
      const rotated = sq.rotate(90)
      expect(rotated.centroid.x).toBeCloseTo(5)
      expect(rotated.centroid.y).toBeCloseTo(5)
    })
  })

  describe('bounds', () => {
    it('returns correct bounding box', () => {
      const p = polygon([point(5, 10), point(20, 15), point(15, 30)])
      const [minX, minY, maxX, maxY] = p.bounds
      expect(minX).toBe(5)
      expect(minY).toBe(10)
      expect(maxX).toBe(20)
      expect(maxY).toBe(30)
    })

    it('boundingRect returns Rectangle', () => {
      const p = polygon([point(5, 10), point(20, 15), point(15, 30)])
      const r = p.boundingRect
      expect(r.x).toBe(5)
      expect(r.y).toBe(10)
      expect(r.width).toBe(15)
      expect(r.height).toBe(20)
    })
  })

  describe('toSVGPath', () => {
    it('generates valid SVG path', () => {
      const tri = polygon([point(0, 0), point(10, 0), point(5, 10)])
      const path = tri.toSVGPath()
      expect(path).toContain('M 0 0')
      expect(path).toContain('L 10 0')
      expect(path).toContain('Z')
    })
  })

  describe('regular polygons properties', () => {
    it('regular hexagon has correct properties', () => {
      const hex = hexagon(point(0, 0), 10)
      // All edges should be equal length
      const edgeLengths = hex.edges.map(e => e.length)
      for (const len of edgeLengths) {
        expect(len).toBeCloseTo(10) // for regular hexagon, edge = radius
      }
    })

    it('star has alternating radii', () => {
      const s = star(point(0, 0), 20, 10, 5)
      // Odd vertices should be at inner radius, even at outer
      for (let i = 0; i < 10; i++) {
        const dist = s.vertex(i).distanceTo(point(0, 0))
        if (i % 2 === 0) {
          expect(dist).toBeCloseTo(20)
        } else {
          expect(dist).toBeCloseTo(10)
        }
      }
    })
  })
})
