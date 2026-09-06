import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { rectNode } from '../../src/node/Node'
import {
  DEFAULT_NODE_DISTANCE,
  calculateRelativePosition,
  nodeAt,
  nodeAbove,
  nodeBelow,
  nodeLeft,
  nodeRight,
  nodeAboveLeft,
  nodeAboveRight,
  nodeBelowLeft,
  nodeBelowRight,
  nodeRow,
  nodeColumn,
  nodeGrid,
  nodeCircle,
} from '../../src/node/Positioning'

describe('Positioning', () => {
  describe('calculateRelativePosition', () => {
    it('calculates position above a point', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'above',
        { distance: 10 },
        { width: 40, height: 30 }
      )
      // Should be at y = 100 - 10 (distance) - 15 (half height) = 75
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(75)
    })

    it('calculates position below a point', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'below',
        { distance: 10 },
        { width: 40, height: 30 }
      )
      // Should be at y = 100 + 10 + 15 = 125
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(125)
    })

    it('calculates position right of a point', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'right',
        { distance: 10 },
        { width: 40, height: 30 }
      )
      // Should be at x = 100 + 10 + 20 = 130
      expect(pos.x).toBe(130)
      expect(pos.y).toBe(100)
    })

    it('calculates position left of a point', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'left',
        { distance: 10 },
        { width: 40, height: 30 }
      )
      // Should be at x = 100 - 10 - 20 = 70
      expect(pos.x).toBe(70)
      expect(pos.y).toBe(100)
    })

    it('uses default distance when not specified', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'right',
        {},
        { width: 40, height: 30 }
      )
      // Should use DEFAULT_NODE_DISTANCE (10)
      expect(pos.x).toBe(130)
    })

    it('calculates diagonal positions', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'above right',
        { distance: 10 },
        { width: 40, height: 30 }
      )
      expect(pos.x).toBe(130) // 100 + 10 + 20
      expect(pos.y).toBe(75)  // 100 - 10 - 15
    })

    it('supports separate x and y distances for diagonal', () => {
      const pos = calculateRelativePosition(
        { x: 100, y: 100 },
        'above right',
        { xDistance: 20, yDistance: 30 },
        { width: 40, height: 30 }
      )
      expect(pos.x).toBe(140) // 100 + 20 + 20
      expect(pos.y).toBe(55)  // 100 - 30 - 15
    })
  })

  describe('nodeAt', () => {
    const refNode = rectNode({ at: point(100, 100), width: 50, height: 40 })

    it('positions node relative to reference node', () => {
      const newNode = nodeAt(refNode, 'right', { distance: 15 }, { width: 30, height: 20 })
      // Reference east anchor is at 125
      // New node center should be at 125 + 15 + 15 = 155
      expect(newNode.center.x).toBeCloseTo(155)
      expect(newNode.center.y).toBeCloseTo(100)
    })

    it('works with point as reference', () => {
      const newNode = nodeAt({ x: 50, y: 50 }, 'below', { distance: 10 }, { width: 30, height: 20 })
      expect(newNode.center.x).toBe(50)
      expect(newNode.center.y).toBe(70) // 50 + 10 + 10
    })
  })

  describe('convenience functions', () => {
    const refNode = rectNode({ at: point(100, 100), width: 40, height: 30 })

    it('nodeAbove creates node above reference', () => {
      const n = nodeAbove(refNode, 10, { width: 40, height: 30 })
      expect(n.center.y).toBeLessThan(refNode.center.y)
    })

    it('nodeBelow creates node below reference', () => {
      const n = nodeBelow(refNode, 10, { width: 40, height: 30 })
      expect(n.center.y).toBeGreaterThan(refNode.center.y)
    })

    it('nodeLeft creates node left of reference', () => {
      const n = nodeLeft(refNode, 10, { width: 40, height: 30 })
      expect(n.center.x).toBeLessThan(refNode.center.x)
    })

    it('nodeRight creates node right of reference', () => {
      const n = nodeRight(refNode, 10, { width: 40, height: 30 })
      expect(n.center.x).toBeGreaterThan(refNode.center.x)
    })

    it('nodeAboveLeft creates node above and left', () => {
      const n = nodeAboveLeft(refNode, 10, { width: 40, height: 30 })
      expect(n.center.x).toBeLessThan(refNode.center.x)
      expect(n.center.y).toBeLessThan(refNode.center.y)
    })

    it('nodeAboveRight creates node above and right', () => {
      const n = nodeAboveRight(refNode, 10, { width: 40, height: 30 })
      expect(n.center.x).toBeGreaterThan(refNode.center.x)
      expect(n.center.y).toBeLessThan(refNode.center.y)
    })

    it('nodeBelowLeft creates node below and left', () => {
      const n = nodeBelowLeft(refNode, 10, { width: 40, height: 30 })
      expect(n.center.x).toBeLessThan(refNode.center.x)
      expect(n.center.y).toBeGreaterThan(refNode.center.y)
    })

    it('nodeBelowRight creates node below and right', () => {
      const n = nodeBelowRight(refNode, 10, { width: 40, height: 30 })
      expect(n.center.x).toBeGreaterThan(refNode.center.x)
      expect(n.center.y).toBeGreaterThan(refNode.center.y)
    })

    it('diagonal functions accept { x, y } distance', () => {
      const n = nodeAboveRight(refNode, { x: 30, y: 20 }, { width: 40, height: 30 })
      expect(n.center.x).toBeGreaterThan(refNode.center.x)
      expect(n.center.y).toBeLessThan(refNode.center.y)
    })
  })

  describe('nodeRow', () => {
    it('creates a row of nodes', () => {
      const nodes = nodeRow(point(50, 100), ['A', 'B', 'C'], { distance: 15 })

      expect(nodes).toHaveLength(3)
      expect(nodes[0]!.text).toBe('A')
      expect(nodes[1]!.text).toBe('B')
      expect(nodes[2]!.text).toBe('C')

      // Each node should be to the right of the previous
      expect(nodes[1]!.center.x).toBeGreaterThan(nodes[0]!.center.x)
      expect(nodes[2]!.center.x).toBeGreaterThan(nodes[1]!.center.x)

      // All at same y
      expect(nodes[0]!.center.y).toBe(nodes[1]!.center.y)
      expect(nodes[1]!.center.y).toBe(nodes[2]!.center.y)
    })

    it('sets node names from labels', () => {
      const nodes = nodeRow(point(50, 100), ['X', 'Y', 'Z'])
      expect(nodes[0]!.name).toBe('X')
      expect(nodes[1]!.name).toBe('Y')
      expect(nodes[2]!.name).toBe('Z')
    })
  })

  describe('nodeColumn', () => {
    it('creates a column of nodes', () => {
      const nodes = nodeColumn(point(100, 50), ['A', 'B', 'C'], { distance: 15 })

      expect(nodes).toHaveLength(3)

      // Each node should be below the previous
      expect(nodes[1]!.center.y).toBeGreaterThan(nodes[0]!.center.y)
      expect(nodes[2]!.center.y).toBeGreaterThan(nodes[1]!.center.y)

      // All at same x
      expect(nodes[0]!.center.x).toBe(nodes[1]!.center.x)
      expect(nodes[1]!.center.x).toBe(nodes[2]!.center.x)
    })
  })

  describe('nodeGrid', () => {
    it('creates a grid of nodes', () => {
      const grid = nodeGrid(point(50, 50), [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
      ], { xDistance: 20, yDistance: 15 })

      expect(grid).toHaveLength(2)
      expect(grid[0]).toHaveLength(3)
      expect(grid[1]).toHaveLength(3)

      expect(grid[0]![0]!.text).toBe('A')
      expect(grid[0]![2]!.text).toBe('C')
      expect(grid[1]![0]!.text).toBe('D')
      expect(grid[1]![2]!.text).toBe('F')
    })

    it('aligns nodes in rows and columns', () => {
      const grid = nodeGrid(point(50, 50), [
        ['A', 'B'],
        ['C', 'D'],
      ])

      // Same row = same y
      expect(grid[0]![0]!.center.y).toBe(grid[0]![1]!.center.y)
      expect(grid[1]![0]!.center.y).toBe(grid[1]![1]!.center.y)

      // Same column = same x
      expect(grid[0]![0]!.center.x).toBe(grid[1]![0]!.center.x)
      expect(grid[0]![1]!.center.x).toBe(grid[1]![1]!.center.x)
    })
  })

  describe('nodeCircle', () => {
    it('creates nodes arranged in a circle', () => {
      const nodes = nodeCircle(point(100, 100), 50, ['A', 'B', 'C', 'D'])

      expect(nodes).toHaveLength(4)

      // All nodes should be approximately 50 units from center
      for (const n of nodes) {
        const dist = Math.sqrt(
          (n.center.x - 100) ** 2 + (n.center.y - 100) ** 2
        )
        expect(dist).toBeCloseTo(50, 0)
      }
    })

    it('starts from top by default', () => {
      const nodes = nodeCircle(point(100, 100), 50, ['A', 'B', 'C', 'D'])

      // First node should be at the top (y = 100 - 50 = 50)
      expect(nodes[0]!.center.x).toBeCloseTo(100)
      expect(nodes[0]!.center.y).toBeCloseTo(50)
    })

    it('respects startAngle option', () => {
      const nodes = nodeCircle(point(100, 100), 50, ['A', 'B'], { startAngle: 0 })

      // First node should be to the right (x = 100 + 50 = 150)
      expect(nodes[0]!.center.x).toBeCloseTo(150)
      expect(nodes[0]!.center.y).toBeCloseTo(100)
    })
  })
})
