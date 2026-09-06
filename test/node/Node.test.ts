import { describe, it, expect } from 'vitest'
import {
  Node,
  node,
  rectNode,
  circleNode,
  ellipseNode,
  diamondNode,
} from '../../src/node/Node'
import { point } from '../../src/core/Point'

describe('Node', () => {
  describe('constructor and factories', () => {
    it('creates a node with default options', () => {
      const n = new Node()
      expect(n.center.x).toBe(0)
      expect(n.center.y).toBe(0)
      expect(n.shape.type).toBe('rectangle')
    })

    it('node() factory creates a Node', () => {
      const n = node({ at: point(50, 50), width: 100, height: 50 })
      expect(n).toBeInstanceOf(Node)
      expect(n.center.x).toBe(50)
      expect(n.width).toBe(100)
    })

    it('rectNode() creates rectangle node', () => {
      const n = rectNode({ at: point(0, 0), width: 80, height: 40 })
      expect(n.shape.type).toBe('rectangle')
    })

    it('circleNode() creates circle node', () => {
      const n = circleNode({ at: point(0, 0), width: 60 })
      expect(n.shape.type).toBe('circle')
    })

    it('ellipseNode() creates ellipse node', () => {
      const n = ellipseNode({ at: point(0, 0), width: 80, height: 40 })
      expect(n.shape.type).toBe('ellipse')
    })

    it('diamondNode() creates diamond node', () => {
      const n = diamondNode({ at: point(0, 0), width: 60, height: 60 })
      expect(n.shape.type).toBe('diamond')
    })

    it('sets name and text', () => {
      const n = node({ name: 'A', text: 'Hello' })
      expect(n.name).toBe('A')
      expect(n.text).toBe('Hello')
    })
  })

  describe('anchors', () => {
    const n = rectNode({ at: point(100, 100), width: 80, height: 40 })

    it('center returns shape center', () => {
      expect(n.center.x).toBe(100)
      expect(n.center.y).toBe(100)
    })

    it('anchor() returns named anchors', () => {
      expect(n.anchor('east').x).toBeCloseTo(140)
      expect(n.anchor('west').x).toBeCloseTo(60)
      expect(n.anchor('north').y).toBeCloseTo(80)
      expect(n.anchor('south').y).toBeCloseTo(120)
    })

    it('has named anchor shortcuts', () => {
      expect(n.north.y).toBeCloseTo(80)
      expect(n.south.y).toBeCloseTo(120)
      expect(n.east.x).toBeCloseTo(140)
      expect(n.west.x).toBeCloseTo(60)
      expect(n.northEast.x).toBeCloseTo(140)
      expect(n.northEast.y).toBeCloseTo(80)
    })

    it('anchor() accepts numeric angles', () => {
      const p = n.anchor(0) // east
      expect(p.x).toBeCloseTo(140)
    })
  })

  describe('geometry', () => {
    const n = rectNode({ at: point(100, 100), width: 80, height: 40 })

    it('width and height return shape dimensions', () => {
      expect(n.width).toBe(80)
      expect(n.height).toBe(40)
    })

    it('bounds returns bounding box', () => {
      const [minX, minY, maxX, maxY] = n.bounds
      expect(minX).toBe(60)
      expect(minY).toBe(80)
      expect(maxX).toBe(140)
      expect(maxY).toBe(120)
    })

    it('contains() checks point containment', () => {
      expect(n.contains(point(100, 100))).toBe(true)
      expect(n.contains(point(200, 200))).toBe(false)
    })

    it('boundaryPoint() returns point on boundary', () => {
      const p = n.boundaryPoint(0)
      expect(p.x).toBeCloseTo(140)
    })
  })

  describe('positioning', () => {
    const n = rectNode({ at: point(100, 100), width: 80, height: 40 })

    // rightOf/leftOf/above/below use TikZ positioning semantics:
    // `distance` is the edge-to-edge gap, shared with the nodeAt()
    // family in Positioning.ts.

    it('rightOf() creates node to the right with an edge-to-edge gap', () => {
      const n2 = n.rightOf(50, { width: 60, height: 30 })
      // east border 140 + gap 50 + half width 30
      expect(n2.center.x).toBeCloseTo(220)
      expect(n2.center.y).toBeCloseTo(100)
    })

    it('leftOf() creates node to the left with an edge-to-edge gap', () => {
      const n2 = n.leftOf(50, { width: 60, height: 30 })
      // west border 60 − gap 50 − half width 30
      expect(n2.center.x).toBeCloseTo(-20)
    })

    it('above() creates node above with an edge-to-edge gap', () => {
      const n2 = n.above(50, { width: 60, height: 30 })
      // north border 80 − gap 50 − half height 15
      expect(n2.center.y).toBeCloseTo(15)
    })

    it('below() creates node below with an edge-to-edge gap', () => {
      const n2 = n.below(50, { width: 60, height: 30 })
      // south border 120 + gap 50 + half height 15
      expect(n2.center.y).toBeCloseTo(185)
    })

    it('positioned() measures anchor-to-center (unlike the gap methods)', () => {
      const n2 = n.positioned('north east', 50, { width: 40, height: 40 })
      // anchor 'north east' = (140, 80); direction 315° (screen conv)
      expect(n2.center.x).toBeCloseTo(140 + 50 * Math.cos(Math.PI / 4))
      expect(n2.center.y).toBeCloseTo(80 - 50 * Math.sin(Math.PI / 4))
    })
  })

  describe('transformations', () => {
    const n = rectNode({ name: 'A', text: 'Test', at: point(100, 100), width: 80, height: 40 })

    it('moveTo() creates copy at new position', () => {
      const n2 = n.moveTo(point(200, 200))
      expect(n2.center.x).toBe(200)
      expect(n2.center.y).toBe(200)
      expect(n2.name).toBe('A')
      expect(n2.width).toBe(80)
    })

    it('resize() creates copy with new dimensions', () => {
      const n2 = n.resize(120, 60)
      expect(n2.width).toBe(120)
      expect(n2.height).toBe(60)
      expect(n2.center.x).toBe(100)
    })
  })

  describe('SVG', () => {
    it('toSVGPath() generates valid path', () => {
      const n = rectNode({ at: point(50, 50), width: 100, height: 50 })
      const path = n.toSVGPath()
      expect(path).toContain('M')
      expect(path).toContain('L')
    })

    it('circle node generates arc path', () => {
      const n = circleNode({ at: point(50, 50), width: 60 })
      const path = n.toSVGPath()
      expect(path).toContain('A')
    })
  })

  describe('different shapes', () => {
    it('rectangle node anchors are on rectangle boundary', () => {
      const n = rectNode({ at: point(0, 0), width: 100, height: 50 })
      expect(n.east.x).toBeCloseTo(50)
      expect(n.north.y).toBeCloseTo(-25)
    })

    it('circle node anchors are on circle boundary', () => {
      const n = circleNode({ at: point(0, 0), width: 100 })
      expect(n.east.x).toBeCloseTo(50)
      expect(n.north.y).toBeCloseTo(-50)
      expect(n.anchor(45).x).toBeCloseTo(50 * Math.cos(Math.PI / 4))
    })

    it('diamond node anchors are on diamond boundary', () => {
      const n = diamondNode({ at: point(0, 0), width: 100, height: 100 })
      expect(n.east.x).toBeCloseTo(50)
      expect(n.north.y).toBeCloseTo(-50)
      // Diagonal anchor should be on the visually upper-right edge
      const ne = n.anchor('north east')
      expect(ne.x).toBeGreaterThan(0)
      expect(ne.y).toBeLessThan(0)
      expect(ne.x).toBeLessThan(50)
    })
  })
})
