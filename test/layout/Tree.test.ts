import { describe, it, expect } from 'vitest'
import { tree, treeFromSpec } from '../../src/layout/Tree'
import { point } from '../../src/core/Point'

describe('Tree', () => {
  describe('basic tree creation', () => {
    it('creates a tree with just a root', () => {
      const result = tree({ at: point(100, 50) })
        .root('Root')
        .build()

      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
      expect(result.root.text).toBe('Root')
      expect(result.root.center.x).toBe(100)
      expect(result.root.center.y).toBe(50)
    })

    it('creates a tree with one level of children', () => {
      const result = tree({ at: point(100, 50) })
        .root('Root')
          .children(['A', 'B', 'C'])
        .build()

      expect(result.nodes).toHaveLength(4)
      expect(result.edges).toHaveLength(3)
    })

    it('creates edges connecting parent to children', () => {
      const result = tree({ at: point(100, 50) })
        .root('Root')
          .child('A')
        .build()

      expect(result.edges).toHaveLength(1)
    })

    it('positions children correctly (grow down)', () => {
      const result = tree({ at: point(100, 50), grow: 'down' })
        .root('Root')
          .children(['A', 'B'])
        .build()

      // Children should be below the root
      const childA = result.getNode('A')!
      const childB = result.getNode('B')!

      expect(childA.center.y).toBeGreaterThan(result.root.center.y)
      expect(childB.center.y).toBeGreaterThan(result.root.center.y)

      // Children should be at the same level
      expect(childA.center.y).toBe(childB.center.y)
    })
  })

  describe('nested subtrees', () => {
    it('handles deep nesting with parent()', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .child('A')
            .children(['A1', 'A2'])
            .parent()
          .parent()
          .child('B')
        .build()

      expect(result.nodes).toHaveLength(5)
      expect(result.levelCount).toBe(3)

      // A1 and A2 should be children of A
      const nodeA = result.getNode('A')!
      const childrenOfA = result.children(nodeA)
      expect(childrenOfA).toHaveLength(2)
      expect(childrenOfA.map(n => n.text)).toContain('A1')
      expect(childrenOfA.map(n => n.text)).toContain('A2')
    })

    it('handles multiple levels of nesting', () => {
      const result = tree({ at: point(100, 30) })
        .root('1')
          .child('1.1')
            .child('1.1.1')
              .child('1.1.1.1')
        .build()

      expect(result.levelCount).toBe(4)
    })

    it('centers parent over children', () => {
      const result = tree({ at: point(200, 30), grow: 'down' })
        .root('Root')
          .children(['A', 'B', 'C'])
        .build()

      const root = result.root
      const children = result.children(root)

      // Root X should be approximately in the middle of children
      const childXs = children.map(c => c.center.x)
      const minX = Math.min(...childXs)
      const maxX = Math.max(...childXs)
      const midX = (minX + maxX) / 2

      expect(root.center.x).toBeCloseTo(midX, 0)
    })

    it('calculates subtree widths correctly', () => {
      const result = tree({ at: point(200, 30), grow: 'down' })
        .root('Root')
          .child('A')
            .children(['A1', 'A2', 'A3'])
            .parent()
          .parent()
          .child('B')
        .build()

      // A's subtree is wider, so A should have more space
      const nodeA = result.getNode('A')!
      const nodeB = result.getNode('B')!

      // A should be to the left of B (since A has more children, it takes more space)
      expect(nodeA.center.x).toBeLessThan(nodeB.center.x)
    })
  })

  describe('growth directions', () => {
    it('grows down (default)', () => {
      const result = tree({ at: point(100, 50), grow: 'down' })
        .root('Root')
          .child('A')
        .build()

      expect(result.getNode('A')!.center.y).toBeGreaterThan(result.root.center.y)
    })

    it('grows up', () => {
      const result = tree({ at: point(100, 200), grow: 'up' })
        .root('Root')
          .child('A')
        .build()

      expect(result.getNode('A')!.center.y).toBeLessThan(result.root.center.y)
    })

    it('grows right', () => {
      const result = tree({ at: point(50, 100), grow: 'right' })
        .root('Root')
          .child('A')
        .build()

      expect(result.getNode('A')!.center.x).toBeGreaterThan(result.root.center.x)
      expect(result.getNode('A')!.center.y).toBe(result.root.center.y)
    })

    it('grows left', () => {
      const result = tree({ at: point(200, 100), grow: 'left' })
        .root('Root')
          .child('A')
        .build()

      expect(result.getNode('A')!.center.x).toBeLessThan(result.root.center.x)
    })

    it('arranges siblings perpendicular to growth (grow right)', () => {
      const result = tree({ at: point(50, 100), grow: 'right' })
        .root('Root')
          .children(['A', 'B'])
        .build()

      const nodeA = result.getNode('A')!
      const nodeB = result.getNode('B')!

      // A and B should be at same X (same level)
      expect(nodeA.center.x).toBe(nodeB.center.x)

      // But different Y (siblings spread vertically)
      expect(nodeA.center.y).not.toBe(nodeB.center.y)
    })
  })

  describe('distance options', () => {
    it('respects levelDistance option', () => {
      const smallDist = tree({ at: point(100, 30), levelDistance: 30 })
        .root('Root')
          .child('A')
        .build()

      const largeDist = tree({ at: point(100, 30), levelDistance: 80 })
        .root('Root')
          .child('A')
        .build()

      const smallGap = smallDist.getNode('A')!.center.y - smallDist.root.center.y
      const largeGap = largeDist.getNode('A')!.center.y - largeDist.root.center.y

      expect(largeGap).toBeGreaterThan(smallGap)
    })

    it('respects siblingDistance option', () => {
      const smallDist = tree({ at: point(100, 30), siblingDistance: 15 })
        .root('Root')
          .children(['A', 'B'])
        .build()

      const largeDist = tree({ at: point(100, 30), siblingDistance: 60 })
        .root('Root')
          .children(['A', 'B'])
        .build()

      const smallGap = Math.abs(
        smallDist.getNode('A')!.center.x - smallDist.getNode('B')!.center.x
      )
      const largeGap = Math.abs(
        largeDist.getNode('A')!.center.x - largeDist.getNode('B')!.center.x
      )

      expect(largeGap).toBeGreaterThan(smallGap)
    })

    it('allows changing distances via builder methods', () => {
      const result = tree({ at: point(100, 30) })
        .levelDistance(80)
        .siblingDistance(50)
        .root('Root')
          .children(['A', 'B'])
        .build()

      // Just verify it builds without error
      expect(result.nodes).toHaveLength(3)
    })
  })

  describe('size-aware spacing', () => {
    it('places children edge-to-edge along the growth axis', () => {
      const result = tree({ at: point(0, 0), grow: 'right', levelDistance: 30 })
        .root({ text: 'P', name: 'P', width: 40, height: 20 })
          .child({ text: 'C', name: 'C', width: 20, height: 20 })
        .build()

      const child = result.getNode('C')!
      // parent.half (20) + gap (30) + child.half (10)
      expect(child.center.x - result.root.center.x).toBe(60)
      expect(child.center.y).toBe(result.root.center.y)
    })

    it('uses node heights for vertical growth', () => {
      const result = tree({ at: point(0, 0), grow: 'down', levelDistance: 30 })
        .root({ text: 'P', name: 'P', width: 50, height: 40 })
          .child({ text: 'C', name: 'C', width: 20, height: 30 })
        .build()

      const child = result.getNode('C')!
      // parent.half (20) + gap (30) + child.half (15)
      expect(child.center.y - result.root.center.y).toBe(65)
    })

    it('supports per-node sep via the builder', () => {
      const result = tree({ at: point(0, 0), grow: 'down', levelDistance: 30 })
        .root({ text: 'P', name: 'P', width: 20, height: 20 })
          .sep(80)
          .child({ text: 'C', name: 'C', width: 20, height: 20 })
        .build()

      // parent.half (10) + sep (80) + child.half (10)
      expect(result.getNode('C')!.center.y - result.root.center.y).toBe(100)
    })

    it('supports per-node sep via treeFromSpec', () => {
      const result = treeFromSpec({
        content: { text: 'P', name: 'P', width: 20, height: 20 },
        sep: 80,
        children: [{ content: { text: 'C', name: 'C', width: 20, height: 20 } }],
      }, { at: point(0, 0), grow: 'down', levelDistance: 30 })

      expect(result.getNode('C')!.center.y - result.root.center.y).toBe(100)
    })

    it('supports an invisible zero-size root with a small sep', () => {
      const result = tree({ at: point(0, 0), grow: 'right', levelDistance: 50 })
        .root({ text: '', name: 'root', width: 0, height: 0, minWidth: 0, minHeight: 0 })
          .sep(20)
          .child({ text: 'A', name: 'A', width: 20, height: 20 })
        .build()

      // root.half (0) + sep (20) + child.half (10)
      expect(result.getNode('A')!.center.x - result.root.center.x).toBe(30)
    })

    it('advances a wide parent further than a narrow parent', () => {
      const short = tree({ at: point(0, 0), grow: 'right' })
        .root('1.e4').child('2.Nf3').build()
      const long = tree({ at: point(0, 0), grow: 'right' })
        .root('6.Bg5 e6 Nf3 d5').child('7...').build()

      const shortAdvance = short.getNode('2.Nf3')!.center.x - short.root.center.x
      const longAdvance = long.getNode('7...')!.center.x - long.root.center.x
      expect(longAdvance).toBeGreaterThan(shortAdvance)
    })

    it('aligns sibling near edges under a parent', () => {
      const result = tree({ at: point(0, 0), grow: 'right', levelDistance: 30 })
        .root({ text: 'P', name: 'P', width: 40, height: 20 })
          .children([
            { text: 'A', name: 'A', width: 20, height: 20 },
            { text: 'Wide', name: 'Wide', width: 80, height: 20 },
          ])
        .build()

      const a = result.getNode('A')!
      const wide = result.getNode('Wide')!
      // parent far edge (20) + gap (30) = 50 from parent center
      expect(a.center.x - a.width / 2).toBe(50)
      expect(wide.center.x - wide.width / 2).toBe(50)
      expect(wide.center.x).toBeGreaterThan(a.center.x)
    })

    it('does not overlap a long parent label', () => {
      const result = tree({ at: point(0, 0), grow: 'right', levelDistance: 20 })
        .root('6.Bg5 e6 Nf3 d5').child('7...').build()

      const child = result.getNode('7...')!
      const parentFar = result.root.center.x + result.root.width / 2
      const childNear = child.center.x - child.width / 2
      expect(childNear).toBeGreaterThanOrEqual(parentFar + 20)
    })
  })

  describe('edge options', () => {
    it('applies global edge options', () => {
      const result = tree({
        at: point(100, 30),
        edgeOptions: { arrowEnd: 'stealth' }
      })
        .root('Root')
          .child('A')
        .build()

      expect(result.edges[0]!.arrowEnd).toBe('stealth')
    })

    it('disables edges with drawEdges: false', () => {
      const result = tree({ at: point(100, 30), drawEdges: false })
        .root('Root')
          .child('A')
          .child('B')
        .build()

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(0)
    })
  })

  describe('node options', () => {
    it('applies global node options', () => {
      const result = tree({
        at: point(100, 30),
        nodeOptions: { shape: 'circle' }
      })
        .root('Root')
          .child('A')
        .build()

      expect(result.root.shape.type).toBe('circle')
      expect(result.getNode('A')!.shape.type).toBe('circle')
    })

    it('allows per-node options', () => {
      const result = tree({ at: point(100, 30) })
        .root({ text: 'Root', name: 'Root', shape: 'ellipse' })
          .child({ text: 'A', name: 'A', shape: 'circle' })
          .parent()
          .child({ text: 'B', name: 'B', shape: 'diamond' })
        .build()

      expect(result.root.shape.type).toBe('ellipse')
      expect(result.getNode('A')!.shape.type).toBe('circle')
      expect(result.getNode('B')!.shape.type).toBe('diamond')
    })
  })

  describe('children() helper', () => {
    it('adds multiple children at once', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .children(['A', 'B', 'C'])
        .build()

      expect(result.nodes).toHaveLength(4)
      expect(result.children(result.root)).toHaveLength(3)
    })
  })

  describe('TreeResult', () => {
    it('provides level access', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .child('A')
            .child('A1')
            .parent()
          .parent()
          .child('B')
        .build()

      expect(result.level(0)).toHaveLength(1)
      expect(result.level(0)[0]!.text).toBe('Root')

      expect(result.level(1)).toHaveLength(2)
      expect(result.level(1).map(n => n.text).sort()).toEqual(['A', 'B'])

      expect(result.level(2)).toHaveLength(1)
      expect(result.level(2)[0]!.text).toBe('A1')

      expect(result.level(5)).toHaveLength(0)
    })

    it('provides levelCount', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .child('A')
            .child('A1')
        .build()

      expect(result.levelCount).toBe(3)
    })

    it('provides node lookup by name', () => {
      const result = tree({ at: point(100, 30) })
        .root({ text: 'Root', name: 'root' })
          .child({ text: 'A', name: 'nodeA' })
        .build()

      expect(result.getNode('root')).toBe(result.root)
      expect(result.getNode('nodeA')?.text).toBe('A')
      expect(result.getNode('unknown')).toBeUndefined()
    })

    it('provides children navigation', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .children(['A', 'B'])
        .build()

      const children = result.children(result.root)
      expect(children).toHaveLength(2)
      expect(children.map(n => n.text).sort()).toEqual(['A', 'B'])

      // Leaf nodes have no children
      expect(result.children(result.getNode('A')!)).toHaveLength(0)
    })

    it('provides parent navigation', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .child('A')
            .child('A1')
        .build()

      expect(result.parent(result.root)).toBeUndefined()
      expect(result.parent(result.getNode('A')!)).toBe(result.root)
      expect(result.parent(result.getNode('A1')!)).toBe(result.getNode('A'))
    })

    it('toRenderables returns nodes and edges', () => {
      const result = tree({ at: point(100, 30) })
        .root('Root')
          .child('A')
        .build()

      const renderables = result.toRenderables()
      expect(renderables).toHaveLength(3) // 2 nodes + 1 edge
    })

    it('calculates correct bounds', () => {
      const result = tree({ at: point(100, 50) })
        .root('Root')
          .children(['A', 'B', 'C'])
        .build()

      const [minX, minY, maxX, maxY] = result.bounds
      expect(minX).toBeLessThan(maxX)
      expect(minY).toBeLessThan(maxY)
    })
  })

  describe('treeFromSpec', () => {
    it('creates tree from spec object', () => {
      const result = treeFromSpec({
        content: 'Root',
        children: [
          { content: 'A' },
          { content: 'B' },
        ]
      }, { at: point(100, 30) })

      expect(result.nodes).toHaveLength(3)
      expect(result.root.text).toBe('Root')
    })

    it('handles nested specs', () => {
      const result = treeFromSpec({
        content: 'Root',
        children: [
          {
            content: 'A',
            children: [
              { content: 'A1' },
              { content: 'A2' },
            ]
          },
          { content: 'B' },
        ]
      }, { at: point(100, 30) })

      expect(result.nodes).toHaveLength(5)
      expect(result.levelCount).toBe(3)
    })

    it('handles spec with node options', () => {
      const result = treeFromSpec({
        content: { text: 'Root', name: 'Root', shape: 'ellipse' },
        children: [
          { content: { text: 'A', name: 'A', shape: 'circle' } },
        ]
      }, { at: point(100, 30) })

      expect(result.root.shape.type).toBe('ellipse')
      expect(result.getNode('A')!.shape.type).toBe('circle')
    })
  })
})
