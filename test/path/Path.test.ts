import { describe, it, expect } from 'vitest'
import {
  Path,
  path,
  pathFrom,
  rectPath,
  circlePath,
  ellipsePath,
  polygonPath,
  polylinePath,
} from '../../src/path/Path'
import { bezierControlPoints } from '../../src/path/bezier'
import { point } from '../../src/core/Point'

describe('Path', () => {
  describe('constructor and factories', () => {
    it('creates an empty path', () => {
      const p = path()
      expect(p.isEmpty).toBe(true)
      expect(p.segments).toHaveLength(0)
    })

    it('pathFrom creates path starting at point', () => {
      const p = pathFrom(point(10, 20))
      expect(p.isEmpty).toBe(false)
      expect(p.startPoint?.x).toBe(10)
      expect(p.startPoint?.y).toBe(20)
    })

    it('rectPath creates rectangle', () => {
      const p = rectPath(10, 20, 100, 50)
      expect(p.isClosed).toBe(true)
      expect(p.segments).toHaveLength(5) // M, L, L, L, Z
    })

    it('circlePath creates circle', () => {
      const p = circlePath(point(50, 50), 30)
      expect(p.isClosed).toBe(true)
      expect(p.toSVGPath()).toContain('A')
    })

    it('ellipsePath creates ellipse', () => {
      const p = ellipsePath(point(50, 50), 40, 20)
      expect(p.isClosed).toBe(true)
      expect(p.toSVGPath()).toContain('A')
    })

    it('polygonPath creates closed polygon', () => {
      const vertices = [point(0, 0), point(100, 0), point(50, 80)]
      const p = polygonPath(vertices)
      expect(p.isClosed).toBe(true)
      expect(p.segments).toHaveLength(4) // M, L, L, Z
    })

    it('polylinePath creates open polyline', () => {
      const points = [point(0, 0), point(50, 50), point(100, 0)]
      const p = polylinePath(points)
      expect(p.isClosed).toBe(false)
      expect(p.segments).toHaveLength(3) // M, L, L
    })
  })

  describe('chainable methods', () => {
    it('moveTo sets start point', () => {
      const p = path().moveTo(point(10, 20))
      expect(p.currentPoint.x).toBe(10)
      expect(p.currentPoint.y).toBe(20)
    })

    it('lineTo adds line segment', () => {
      const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
      expect(p.segments).toHaveLength(2)
      expect(p.segments[1]?.type).toBe('L')
    })

    it('horizontalTo draws horizontal line', () => {
      const p = path().moveTo(point(0, 50)).horizontalTo(100)
      expect(p.currentPoint.x).toBe(100)
      expect(p.currentPoint.y).toBe(50)
    })

    it('verticalTo draws vertical line', () => {
      const p = path().moveTo(point(50, 0)).verticalTo(100)
      expect(p.currentPoint.x).toBe(50)
      expect(p.currentPoint.y).toBe(100)
    })

    it('lineBy draws relative line', () => {
      const p = path().moveTo(point(10, 10)).lineBy(20, 30)
      expect(p.currentPoint.x).toBe(30)
      expect(p.currentPoint.y).toBe(40)
    })

    it('curveTo adds cubic bezier', () => {
      const p = path()
        .moveTo(point(0, 0))
        .curveTo(point(25, 50), point(75, 50), point(100, 0))
      expect(p.segments).toHaveLength(2)
      expect(p.segments[1]?.type).toBe('C')
      expect(p.segments[1]?.points).toHaveLength(3)
    })

    it('quadraticTo adds quadratic bezier', () => {
      const p = path()
        .moveTo(point(0, 0))
        .quadraticTo(point(50, 50), point(100, 0))
      expect(p.segments[1]?.type).toBe('Q')
      expect(p.segments[1]?.points).toHaveLength(2)
    })

    it('arcTo adds arc segment', () => {
      const p = path()
        .moveTo(point(0, 0))
        .arcTo(50, 50, 0, false, true, point(100, 0))
      expect(p.segments[1]?.type).toBe('A')
      expect(p.segments[1]?.rx).toBe(50)
    })

    it('close closes the path', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .lineTo(point(50, 80))
        .close()
      expect(p.isClosed).toBe(true)
      expect(p.segments[p.segments.length - 1]?.type).toBe('Z')
    })
  })

  describe('TikZ-style operations', () => {
    it('to is alias for lineTo', () => {
      const p = path().moveTo(point(0, 0)).to(point(100, 100))
      expect(p.segments[1]?.type).toBe('L')
    })

    it('hvTo draws horizontal then vertical', () => {
      const p = path().moveTo(point(0, 0)).hvTo(point(100, 50))
      expect(p.segments).toHaveLength(3) // M, L, L
      expect(p.currentPoint.x).toBe(100)
      expect(p.currentPoint.y).toBe(50)
    })

    it('vhTo draws vertical then horizontal', () => {
      const p = path().moveTo(point(0, 0)).vhTo(point(100, 50))
      expect(p.segments).toHaveLength(3) // M, L, L
      expect(p.currentPoint.x).toBe(100)
      expect(p.currentPoint.y).toBe(50)
    })

    it('bendTo creates curved path', () => {
      const p = path().moveTo(point(0, 0)).bendTo(point(100, 0), 30)
      expect(p.segments[1]?.type).toBe('C')
    })

    it('to() with routing options is a cubic on the shared Bézier model', () => {
      const from = point(0, 0)
      const to = point(100, 0)
      const p = path().moveTo(from).to(to, { out: 30, in: 150, looseness: 1.5 })
      expect(p.segments[1]?.type).toBe('C')
      const [c1, c2] = bezierControlPoints(from, to, { out: 30, in: 150, looseness: 1.5 })
      expect(p.segments[1]!.points[0]!.equals(c1)).toBe(true)
      expect(p.segments[1]!.points[1]!.equals(c2)).toBe(true)
      expect(p.currentPoint.equals(to)).toBe(true)
    })

    it('bendTo bends left for a positive angle, like an edge', () => {
      // Heading east on screen, "left of travel" is up (negative y).
      const p = path().moveTo(point(0, 0)).bendTo(point(100, 0), 30)
      const [c1, c2] = p.segments[1]!.points
      expect(c1!.y).toBeLessThan(0)
      expect(c2!.y).toBeLessThan(0)
      const [e1, e2] = bezierControlPoints(point(0, 0), point(100, 0), { bend: 30 })
      expect(c1!.equals(e1)).toBe(true)
      expect(c2!.equals(e2)).toBe(true)
    })

    it('through() passes through its point with a continuous tangent', () => {
      const mid = point(50, -20)
      const p = path().moveTo(point(0, 0)).through(mid, point(100, 0))
      expect(p.segments.map((s) => s.type)).toEqual(['M', 'C', 'C'])
      expect(p.segments[1]!.points[2]!.equals(mid)).toBe(true)
      // The incoming and outgoing control points mirror across `mid`.
      const cIn = p.segments[1]!.points[1]!
      const cOut = p.segments[2]!.points[0]!
      expect(mid.sub(cIn).equals(cOut.sub(mid))).toBe(true)
      expect(p.currentPoint.equals(point(100, 0))).toBe(true)
    })
  })

  describe('properties', () => {
    it('startPoint returns first point', () => {
      const p = path().moveTo(point(10, 20)).lineTo(point(100, 200))
      expect(p.startPoint?.x).toBe(10)
      expect(p.startPoint?.y).toBe(20)
    })

    it('endPoint returns last point', () => {
      const p = path().moveTo(point(10, 20)).lineTo(point(100, 200))
      expect(p.endPoint?.x).toBe(100)
      expect(p.endPoint?.y).toBe(200)
    })

    it('currentPoint tracks end of path', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(50, 0))
        .lineTo(point(100, 0))
      expect(p.currentPoint.x).toBe(100)
    })

    it('length calculates path length', () => {
      const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
      expect(p.length).toBeCloseTo(100)
    })

    it('bounds returns bounding box', () => {
      const p = path()
        .moveTo(point(10, 20))
        .lineTo(point(100, 20))
        .lineTo(point(100, 80))
        .lineTo(point(10, 80))
      const [minX, minY, maxX, maxY] = p.bounds
      expect(minX).toBe(10)
      expect(minY).toBe(20)
      expect(maxX).toBe(100)
      expect(maxY).toBe(80)
    })

    it('allPoints returns all points in path', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .lineTo(point(100, 100))
      expect(p.allPoints).toHaveLength(3)
    })
  })

  describe('pointAt', () => {
    it('returns point at parameter t', () => {
      const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))

      const p0 = p.pointAt(0)
      expect(p0.x).toBeCloseTo(0)

      const pMid = p.pointAt(0.5)
      expect(pMid.x).toBeCloseTo(50)

      const p1 = p.pointAt(1)
      expect(p1.x).toBeCloseTo(100)
    })

    it('works with multiple segments', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .lineTo(point(100, 100))

      const pMid = p.pointAt(0.5)
      expect(pMid.x).toBeCloseTo(100)
      expect(pMid.y).toBeCloseTo(0)
    })
  })

  describe('transformations', () => {
    it('translate moves the path', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .translate(10, 20)

      expect(p.startPoint?.x).toBe(10)
      expect(p.startPoint?.y).toBe(20)
      expect(p.endPoint?.x).toBe(110)
      expect(p.endPoint?.y).toBe(20)
    })

    it('scale scales the path', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .scale(2)

      expect(p.endPoint?.x).toBe(200)
    })

    it('scale with center point', () => {
      const p = path()
        .moveTo(point(50, 0))
        .lineTo(point(100, 0))
        .scale(2, 2, point(50, 0))

      expect(p.startPoint?.x).toBe(50)
      expect(p.endPoint?.x).toBe(150)
    })

    it('rotate rotates the path', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .rotate(90)

      expect(p.endPoint?.x).toBeCloseTo(0)
      expect(p.endPoint?.y).toBeCloseTo(100)
    })

    it('reverse reverses path direction', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .lineTo(point(100, 100))
        .reverse()

      expect(p.startPoint?.x).toBeCloseTo(100)
      expect(p.startPoint?.y).toBeCloseTo(100)
      expect(p.endPoint?.x).toBeCloseTo(0)
      expect(p.endPoint?.y).toBeCloseTo(0)
    })
  })

  describe('toSVGPath', () => {
    it('generates M command for moveTo', () => {
      const p = path().moveTo(point(10, 20))
      expect(p.toSVGPath()).toBe('M 10 20')
    })

    it('generates L command for lineTo', () => {
      const p = path().moveTo(point(0, 0)).lineTo(point(100, 50))
      expect(p.toSVGPath()).toBe('M 0 0 L 100 50')
    })

    it('generates C command for curveTo', () => {
      const p = path()
        .moveTo(point(0, 0))
        .curveTo(point(25, 50), point(75, 50), point(100, 0))
      expect(p.toSVGPath()).toContain('C 25 50, 75 50, 100 0')
    })

    it('generates Q command for quadraticTo', () => {
      const p = path()
        .moveTo(point(0, 0))
        .quadraticTo(point(50, 50), point(100, 0))
      expect(p.toSVGPath()).toContain('Q 50 50, 100 0')
    })

    it('generates A command for arcTo', () => {
      const p = path()
        .moveTo(point(0, 0))
        .arcTo(50, 30, 0, false, true, point(100, 0))
      expect(p.toSVGPath()).toContain('A 50 30 0 0 1 100 0')
    })

    it('generates Z command for close', () => {
      const p = path()
        .moveTo(point(0, 0))
        .lineTo(point(100, 0))
        .lineTo(point(50, 80))
        .close()
      expect(p.toSVGPath()).toContain('Z')
    })
  })

  describe('immutability', () => {
    it('operations return new Path instances', () => {
      const p1 = path().moveTo(point(0, 0))
      const p2 = p1.lineTo(point(100, 0))

      expect(p1).not.toBe(p2)
      expect(p1.segments).toHaveLength(1)
      expect(p2.segments).toHaveLength(2)
    })

    it('transformations return new instances', () => {
      const p1 = path().moveTo(point(0, 0)).lineTo(point(100, 0))
      const p2 = p1.translate(10, 10)

      expect(p1).not.toBe(p2)
      expect(p1.startPoint?.x).toBe(0)
      expect(p2.startPoint?.x).toBe(10)
    })
  })
})
