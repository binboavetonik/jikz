import { describe, it, expect } from 'vitest'
import {
  isPoint,
  isPath,
  isLine,
  isCircle,
  isArc,
  isRectangle,
  isPolygon,
  isNode,
  isEdge,
} from '../../src/render/Renderer'
import { point } from '../../src/core/Point'
import { path } from '../../src/path/Path'
import { line } from '../../src/geometry/Line'
import { circle } from '../../src/geometry/Circle'
import { arc } from '../../src/geometry/Arc'
import { rect } from '../../src/geometry/Rectangle'
import { polygon } from '../../src/geometry/Polygon'
import { rectNode } from '../../src/node/Node'
import { edge } from '../../src/node/Edge'

describe('Renderer type guards', () => {
  const testPoint = point(10, 20)
  const testPath = path().moveTo(point(0, 0)).lineTo(point(100, 100))
  const testLine = line(point(0, 0), point(100, 100))
  const testCircle = circle(point(50, 50), 30)
  const testArc = arc(point(50, 50), 30, 0, 90)
  const testRect = rect(0, 0, 100, 50)
  const testPolygon = polygon([point(0, 0), point(100, 0), point(50, 80)])
  const testNode = rectNode({ at: point(100, 100), width: 80, height: 40 })
  const testEdge = edge(point(0, 0), point(100, 100))

  describe('isPoint', () => {
    it('returns true for Point', () => {
      expect(isPoint(testPoint)).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isPoint(testLine)).toBe(false)
      expect(isPoint(testCircle)).toBe(false)
      expect(isPoint({ x: 1, y: 2 })).toBe(false) // plain object without methods
      expect(isPoint(null)).toBe(false)
      expect(isPoint(undefined)).toBe(false)
    })
  })

  describe('isPath', () => {
    it('returns true for Path', () => {
      expect(isPath(testPath)).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isPath(testPoint)).toBe(false)
      expect(isPath(testLine)).toBe(false)
      expect(isPath(null)).toBe(false)
    })
  })

  describe('isLine', () => {
    it('returns true for Line', () => {
      expect(isLine(testLine)).toBe(true)
    })

    it('returns false for Edge (has arrowEnd)', () => {
      expect(isLine(testEdge)).toBe(false)
    })

    it('returns false for other types', () => {
      expect(isLine(testPoint)).toBe(false)
      expect(isLine(testCircle)).toBe(false)
      expect(isLine(null)).toBe(false)
    })
  })

  describe('isCircle', () => {
    it('returns true for Circle', () => {
      expect(isCircle(testCircle)).toBe(true)
    })

    it('returns false for Arc (has startAngle)', () => {
      expect(isCircle(testArc)).toBe(false)
    })

    it('returns false for other types', () => {
      expect(isCircle(testPoint)).toBe(false)
      expect(isCircle(testLine)).toBe(false)
      expect(isCircle(null)).toBe(false)
    })
  })

  describe('isArc', () => {
    it('returns true for Arc', () => {
      expect(isArc(testArc)).toBe(true)
    })

    it('returns false for Circle', () => {
      expect(isArc(testCircle)).toBe(false)
    })

    it('returns false for other types', () => {
      expect(isArc(testPoint)).toBe(false)
      expect(isArc(null)).toBe(false)
    })
  })

  describe('isRectangle', () => {
    it('returns true for Rectangle', () => {
      expect(isRectangle(testRect)).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isRectangle(testPoint)).toBe(false)
      expect(isRectangle(testPolygon)).toBe(false)
      expect(isRectangle(null)).toBe(false)
    })
  })

  describe('isPolygon', () => {
    it('returns true for Polygon', () => {
      expect(isPolygon(testPolygon)).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isPolygon(testPoint)).toBe(false)
      expect(isPolygon(testRect)).toBe(false)
      expect(isPolygon(null)).toBe(false)
    })
  })

  describe('isNode', () => {
    it('returns true for Node', () => {
      expect(isNode(testNode)).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isNode(testPoint)).toBe(false)
      expect(isNode(testRect)).toBe(false)
      expect(isNode(null)).toBe(false)
    })
  })

  describe('isEdge', () => {
    it('returns true for Edge', () => {
      expect(isEdge(testEdge)).toBe(true)
    })

    it('returns false for Line', () => {
      expect(isEdge(testLine)).toBe(false)
    })

    it('returns false for other types', () => {
      expect(isEdge(testPoint)).toBe(false)
      expect(isEdge(null)).toBe(false)
    })
  })

  describe('type guard combinations', () => {
    it('correctly distinguishes all types', () => {
      const items = [
        testPoint, testPath, testLine, testCircle,
        testArc, testRect, testPolygon, testNode, testEdge
      ]

      // Each item should match exactly one type guard
      for (const item of items) {
        const matches = [
          isPoint(item),
          isPath(item),
          isLine(item),
          isCircle(item),
          isArc(item),
          isRectangle(item),
          isPolygon(item),
          isNode(item),
          isEdge(item),
        ].filter(Boolean)

        expect(matches.length).toBe(1)
      }
    })
  })
})
