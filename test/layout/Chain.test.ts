import { describe, it, expect } from 'vitest'
import { chain, chainFrom } from '../../src/layout/Chain'
import { point } from '../../src/core/Point'
import { rectNode } from '../../src/node/Node'

describe('Chain', () => {
  describe('basic chain creation', () => {
    it('creates a single node at start position', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .build()

      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
      expect(result.nodes[0]!.center.x).toBe(50)
      expect(result.nodes[0]!.center.y).toBe(100)
    })

    it('creates a horizontal chain of nodes (default direction)', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .node({ text: 'B' })
        .node({ text: 'C' })
        .build()

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(2)

      // Nodes should be positioned left to right
      expect(result.nodes[0]!.center.x).toBeLessThan(result.nodes[1]!.center.x)
      expect(result.nodes[1]!.center.x).toBeLessThan(result.nodes[2]!.center.x)

      // All nodes should be at the same Y
      expect(result.nodes[0]!.center.y).toBe(100)
      expect(result.nodes[1]!.center.y).toBe(100)
      expect(result.nodes[2]!.center.y).toBe(100)
    })

    it('creates a vertical chain with direction below', () => {
      const result = chain(point(50, 100), { direction: 'below' })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .node({ text: 'C' })
        .build()

      expect(result.nodes).toHaveLength(3)

      // Nodes should be positioned top to bottom
      expect(result.nodes[0]!.center.y).toBeLessThan(result.nodes[1]!.center.y)
      expect(result.nodes[1]!.center.y).toBeLessThan(result.nodes[2]!.center.y)

      // All nodes should be at the same X
      expect(result.nodes[0]!.center.x).toBe(50)
      expect(result.nodes[1]!.center.x).toBe(50)
      expect(result.nodes[2]!.center.x).toBe(50)
    })

    it('creates a chain going left', () => {
      const result = chain(point(200, 100), { direction: 'left' })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      // B should be to the left of A
      expect(result.nodes[1]!.center.x).toBeLessThan(result.nodes[0]!.center.x)
    })

    it('creates a chain going above', () => {
      const result = chain(point(100, 200), { direction: 'above' })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      // B should be above A
      expect(result.nodes[1]!.center.y).toBeLessThan(result.nodes[0]!.center.y)
    })

    it('connects nodes with edges', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      expect(result.edges).toHaveLength(1)
      // Edge connects first node to second
    })

    it('respects spacing option', () => {
      const smallSpacing = chain(point(50, 100), { spacing: 10 })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      const largeSpacing = chain(point(50, 100), { spacing: 50 })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      const smallGap = smallSpacing.nodes[1]!.center.x - smallSpacing.nodes[0]!.center.x
      const largeGap = largeSpacing.nodes[1]!.center.x - largeSpacing.nodes[0]!.center.x

      expect(largeGap).toBeGreaterThan(smallGap)
    })
  })

  describe('direction changes', () => {
    it('changes direction mid-chain with going()', () => {
      const result = chain(point(50, 50))
        .node({ text: 'A' })
        .node({ text: 'B' })
        .going('below')
        .node({ text: 'C' })
        .build()

      // A and B should be horizontal
      expect(result.nodes[0]!.center.y).toBe(result.nodes[1]!.center.y)
      expect(result.nodes[0]!.center.x).toBeLessThan(result.nodes[1]!.center.x)

      // C should be below B
      expect(result.nodes[2]!.center.y).toBeGreaterThan(result.nodes[1]!.center.y)
    })

    it('handles multiple direction changes', () => {
      const result = chain(point(50, 50))
        .node({ text: 'A' })
        .going('right')
        .node({ text: 'B' })
        .going('below')
        .node({ text: 'C' })
        .going('left')
        .node({ text: 'D' })
        .build()

      expect(result.nodes).toHaveLength(4)
      // Creates an L-shaped path
    })

    it('handles diagonal directions', () => {
      const result = chain(point(100, 100))
        .node({ text: 'A' })
        .going('below right')
        .node({ text: 'B' })
        .build()

      // B should be below and to the right of A
      expect(result.nodes[1]!.center.x).toBeGreaterThan(result.nodes[0]!.center.x)
      expect(result.nodes[1]!.center.y).toBeGreaterThan(result.nodes[0]!.center.y)
    })
  })

  describe('spacing changes', () => {
    it('changes spacing with withSpacing()', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .node({ text: 'B' })
        .withSpacing(100)
        .node({ text: 'C' })
        .build()

      const gapAB = result.nodes[1]!.center.x - result.nodes[0]!.center.x
      const gapBC = result.nodes[2]!.center.x - result.nodes[1]!.center.x

      expect(gapBC).toBeGreaterThan(gapAB)
    })
  })

  describe('branching', () => {
    it('creates branches from named nodes', () => {
      const result = chain(point(100, 50))
        .node({ text: 'Root', name: 'root' })
        .node({ text: 'A' })
        .branch('root', 'below')
        .node({ text: 'B' })
        .build()

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(2)

      const root = result.getNode('root')
      const nodeA = result.nodes[1]!
      const nodeB = result.nodes[2]!

      // A should be to the right of root
      expect(nodeA.center.x).toBeGreaterThan(root!.center.x)
      expect(nodeA.center.y).toBe(root!.center.y)

      // B should be below root
      expect(nodeB.center.y).toBeGreaterThan(root!.center.y)
    })

    it('throws error for non-existent branch node', () => {
      const builder = chain(point(100, 50))
        .node({ text: 'A' })

      expect(() => builder.branch('nonexistent')).toThrow()
    })

    it('handles multiple branches from same node', () => {
      const result = chain(point(100, 50))
        .node({ text: 'Root', name: 'root' })
        .going('right')
        .node({ text: 'A' })
        .branch('root', 'below')
        .node({ text: 'B' })
        .branch('root', 'left')
        .node({ text: 'C' })
        .build()

      expect(result.nodes).toHaveLength(4)
      expect(result.edges).toHaveLength(3)
    })
  })

  describe('edge customization', () => {
    it('applies global edge options', () => {
      const result = chain(point(50, 100), {
        edgeOptions: { arrowEnd: 'stealth' }
      })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      expect(result.edges).toHaveLength(1)
      expect(result.edges[0]!.arrowEnd).toBe('stealth')
    })

    it('applies per-edge options with withEdge()', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .withEdge({ arrowEnd: 'latex' })
        .node({ text: 'B' })
        .node({ text: 'C' })
        .build()

      expect(result.edges[0]!.arrowEnd).toBe('latex')
      // Second edge should use default (no arrow)
    })

    it('skips edges with skipEdge()', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .skipEdge()
        .node({ text: 'B' })
        .node({ text: 'C' })
        .build()

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(1) // Only one edge (B to C)
    })

    it('disables all edges with connectNodes: false', () => {
      const result = chain(point(50, 100), { connectNodes: false })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .node({ text: 'C' })
        .build()

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(0)
    })
  })

  describe('node options', () => {
    it('applies global node options', () => {
      const result = chain(point(50, 100), {
        nodeOptions: { shape: 'circle' }
      })
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      expect(result.nodes[0]!.shape.type).toBe('circle')
      expect(result.nodes[1]!.shape.type).toBe('circle')
    })

    it('per-node options override global options', () => {
      const result = chain(point(50, 100), {
        nodeOptions: { shape: 'circle' }
      })
        .node({ text: 'A' })
        .node({ text: 'B', shape: 'rectangle' })
        .build()

      expect(result.nodes[0]!.shape.type).toBe('circle')
      expect(result.nodes[1]!.shape.type).toBe('rectangle')
    })
  })

  describe('ChainResult', () => {
    it('provides node lookup by name', () => {
      const result = chain(point(50, 100))
        .node({ text: 'First', name: 'first' })
        .node({ text: 'Second', name: 'second' })
        .build()

      expect(result.getNode('first')).toBe(result.nodes[0])
      expect(result.getNode('second')).toBe(result.nodes[1])
      expect(result.getNode('unknown')).toBeUndefined()
    })

    it('returns all nodes in creation order', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .node({ text: 'B' })
        .node({ text: 'C' })
        .build()

      expect(result.nodes.map(n => n.text)).toEqual(['A', 'B', 'C'])
    })

    it('toRenderables returns nodes and edges', () => {
      const result = chain(point(50, 100))
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      const renderables = result.toRenderables()
      expect(renderables).toHaveLength(3) // 2 nodes + 1 edge
    })
  })

  describe('chainFrom', () => {
    it('starts from an existing node', () => {
      const firstNode = rectNode({ at: point(50, 100), text: 'Start' })
      const result = chainFrom(firstNode)
        .node({ text: 'A' })
        .node({ text: 'B' })
        .build()

      expect(result.nodes).toHaveLength(3)
      expect(result.nodes[0]).toBe(firstNode)
      expect(result.edges).toHaveLength(2)
    })
  })
})
