import { describe, it, expect } from 'vitest'
import { tree, treeFromSpec } from '../../src/layout/Tree'
import { point } from '../../src/core/Point'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

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

  describe('rank alignment', () => {
    it('aligns every level to one column (grow right)', () => {
      const result = tree({ at: point(0, 0), grow: 'right', align: 'rank', levelDistance: 50 })
        .root({ text: 'P', name: 'P', width: 40, height: 20 })
          .children([
            { text: 'A', name: 'A', width: 20, height: 20 },
            { text: 'Wide', name: 'Wide', width: 80, height: 20 },
          ])
        .build()

      const a = result.getNode('A')!
      const wide = result.getNode('Wide')!
      // Same column (centers aligned, unlike parent mode's near edges)
      expect(a.center.x).toBe(wide.center.x)
      // root.half (20) + gap (50) + level-1 max half (40)
      expect(a.center.x).toBe(110)
      // Level box near edge sits at the root's far edge + gap
      expect(wide.center.x - wide.width / 2).toBe(70)
    })

    it('aligns every level to one column (grow down)', () => {
      const result = tree({ at: point(0, 0), grow: 'down', align: 'rank', levelDistance: 50 })
        .root({ text: 'P', name: 'P', width: 20, height: 40 })
          .children([
            { text: 'A', name: 'A', width: 20, height: 20 },
            { text: 'Tall', name: 'Tall', width: 20, height: 80 },
          ])
        .build()

      const a = result.getNode('A')!
      const tall = result.getNode('Tall')!
      expect(a.center.y).toBe(tall.center.y)
      // root.half (20) + gap (50) + level-1 max half (40)
      expect(a.center.y).toBe(110)
    })

    it('keeps per-parent drift by default', () => {
      const result = tree({ at: point(0, 0), grow: 'right', levelDistance: 50 })
        .root({ text: 'P', name: 'P', width: 40, height: 20 })
          .children([
            { text: 'A', name: 'A', width: 20, height: 20 },
            { text: 'Wide', name: 'Wide', width: 80, height: 20 },
          ])
        .build()

      const a = result.getNode('A')!
      const wide = result.getNode('Wide')!
      expect(a.center.x).not.toBe(wide.center.x)
      // Parent mode aligns near edges
      expect(a.center.x - a.width / 2).toBe(wide.center.x - wide.width / 2)
    })

    it('ignores per-node sep in rank mode', () => {
      const withSep = tree({ at: point(0, 0), grow: 'right', align: 'rank', levelDistance: 50 })
        .root({ text: 'P', name: 'P', width: 40, height: 20 })
          .sep(200)
          .child({ text: 'A', name: 'A', width: 20, height: 20 })
        .build()
      const withoutSep = tree({ at: point(0, 0), grow: 'right', align: 'rank', levelDistance: 50 })
        .root({ text: 'P', name: 'P', width: 40, height: 20 })
          .child({ text: 'A', name: 'A', width: 20, height: 20 })
        .build()

      expect(withSep.getNode('A')!.center.x).toBe(withoutSep.getNode('A')!.center.x)
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
        nodeOptions: { shape: SHAPES['circle'] }
      })
        .root('Root')
          .child('A')
        .build()

      expect(result.root.shape.type).toBe('circle')
      expect(result.getNode('A')!.shape.type).toBe('circle')
    })

    it('allows per-node options', () => {
      const result = tree({ at: point(100, 30) })
        .root({ text: 'Root', name: 'Root', shape: SHAPES['ellipse'] })
          .child({ text: 'A', name: 'A', shape: SHAPES['circle'] })
          .parent()
          .child({ text: 'B', name: 'B', shape: SHAPES['diamond'] })
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
        content: { text: 'Root', name: 'Root', shape: SHAPES['ellipse'] },
        children: [
          { content: { text: 'A', name: 'A', shape: SHAPES['circle'] } },
        ]
      }, { at: point(100, 30) })

      expect(result.root.shape.type).toBe('ellipse')
      expect(result.getNode('A')!.shape.type).toBe('circle')
    })
  })

  describe('contour packing', () => {
    const N = (name: string, width = 40) => ({ name, text: name, width, height: 20 })
    const GAP = 20

    /** Every node's box, grouped by depth (cross axis = x when growing down). */
    function rows(result: ReturnType<typeof treeFromSpec>) {
      const byY = new Map<number, { name: string; lo: number; hi: number }[]>()
      for (const n of result.nodes) {
        const row = byY.get(n.center.y) ?? []
        row.push({ name: n.name!, lo: n.center.x - n.width / 2, hi: n.center.x + n.width / 2 })
        byY.set(n.center.y, row)
      }
      for (const row of byY.values()) row.sort((a, b) => a.lo - b.lo)
      return byY
    }

    function tightestGap(result: ReturnType<typeof treeFromSpec>): number {
      let tightest = Infinity
      for (const row of rows(result).values()) {
        for (let i = 1; i < row.length; i++) {
          tightest = Math.min(tightest, row[i]!.lo - row[i - 1]!.hi)
        }
      }
      return tightest
    }

    it('nests a leaf beside a sibling that is only wide deeper down', () => {
      // The bbox of B's subtree is 3 nodes wide, but at C's own depth B is
      // a single node. Bounding-box packing reserved the full 3-node width
      // and pushed C clear of it; contour packing lets C sit next to B.
      const result = treeFromSpec(
        {
          content: N('root'),
          children: [
            { content: N('B'), children: [{ content: N('b1') }, { content: N('b2') }, { content: N('b3') }] },
            { content: N('C') },
          ],
        },
        { at: point(0, 0), grow: 'down', siblingDistance: GAP }
      )

      const B = result.getNode('B')!
      const C = result.getNode('C')!
      // Adjacent at their shared depth, at exactly the requested gap.
      expect(C.center.x - C.width / 2 - (B.center.x + B.width / 2)).toBeCloseTo(GAP, 6)
      // Bounding-box packing would have needed 3 node widths + 2 gaps
      // between the two subtree centers; contour packing needs far less.
      const bboxSeparation = (3 * 40 + 2 * GAP) / 2 + GAP + 40 / 2
      expect(C.center.x - B.center.x).toBeLessThan(bboxSeparation)
    })

    it('centers a parent between its outermost children', () => {
      const result = treeFromSpec(
        {
          content: N('root'),
          children: [
            { content: N('L'), children: [{ content: N('l1') }, { content: N('l2') }] },
            { content: N('R', 120) },
          ],
        },
        { at: point(0, 0), grow: 'down', siblingDistance: GAP }
      )
      const root = result.root
      const L = result.getNode('L')!
      const R = result.getNode('R')!
      expect(root.center.x).toBeCloseTo((L.center.x + R.center.x) / 2, 6)
    })

    it('keeps the root at `at` on the cross axis', () => {
      const result = treeFromSpec(
        { content: N('root'), children: [{ content: N('a') }, { content: N('b') }, { content: N('c') }] },
        { at: point(137, 11), grow: 'down', siblingDistance: GAP }
      )
      expect(result.root.center.x).toBeCloseTo(137, 6)
      expect(result.root.center.y).toBeCloseTo(11, 6)
    })

    it('respects siblingDistance with mixed node widths', () => {
      const result = treeFromSpec(
        {
          content: N('root'),
          children: [
            { content: N('wide', 140), children: [{ content: N('w1', 20) }] },
            { content: N('thin', 20), children: [{ content: N('t1', 140) }] },
            { content: N('mid', 60) },
          ],
        },
        { at: point(0, 0), grow: 'down', siblingDistance: GAP }
      )
      expect(tightestGap(result)).toBeGreaterThanOrEqual(GAP - 1e-9)
    })

    it('clears a non-adjacent earlier sibling (contour threading)', () => {
      // The third child must clear the first child's deep-right subtree,
      // not merely its immediate left neighbor. Threads are what carry
      // that contour across the intervening sibling.
      const result = treeFromSpec(
        {
          content: N('root'),
          children: [
            {
              content: N('A'),
              children: [
                { content: N('a1') },
                { content: N('a2'), children: [{ content: N('a2a') }, { content: N('a2b') }] },
              ],
            },
            { content: N('B') },
            { content: N('C'), children: [{ content: N('c1') }, { content: N('c2') }] },
          ],
        },
        { at: point(0, 0), grow: 'down', siblingDistance: GAP }
      )
      expect(tightestGap(result)).toBeGreaterThanOrEqual(GAP - 1e-9)
    })

    it('never overlaps and always honors siblingDistance, over many shapes', () => {
      const mulberry = (a: number) => () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      let counter = 0
      type Spec = Parameters<typeof treeFromSpec>[0]
      const rand = (depth: number, rnd: () => number): Spec => {
        const self: Spec = { content: N('n' + counter++, 20 + (counter % 5) * 30) }
        if (depth >= 4 || rnd() < 0.3) return self
        self.children = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => rand(depth + 1, rnd))
        return self
      }

      for (let seed = 0; seed < 60; seed++) {
        counter = 0
        const result = treeFromSpec(rand(0, mulberry(seed)), {
          at: point(0, 0),
          grow: 'down',
          siblingDistance: GAP,
        })
        expect(tightestGap(result)).toBeGreaterThanOrEqual(GAP - 1e-9)
      }
    })

    it('lays out a deep chain without drift', () => {
      let spec: Parameters<typeof treeFromSpec>[0] = { content: N('leaf') }
      for (let i = 0; i < 500; i++) spec = { content: N('n' + i), children: [spec] }
      const result = treeFromSpec(spec, { at: point(50, 0), grow: 'down', siblingDistance: GAP })
      // A pure chain has no siblings to separate: one straight column.
      const xs = new Set(result.nodes.map((n) => n.center.x))
      expect(xs).toEqual(new Set([50]))
    })

    it('grows sideways with the same guarantees', () => {
      const result = treeFromSpec(
        {
          content: N('root'),
          children: [
            { content: N('B'), children: [{ content: N('b1') }, { content: N('b2') }, { content: N('b3') }] },
            { content: N('C') },
          ],
        },
        { at: point(0, 0), grow: 'right', siblingDistance: GAP }
      )
      const B = result.getNode('B')!
      const C = result.getNode('C')!
      // Cross axis is y when growing right.
      expect(C.center.y - C.height / 2 - (B.center.y + B.height / 2)).toBeCloseTo(GAP, 6)
    })
  })

  describe('non-overlap with variable node sizes (parent align)', () => {
    // Parent alignment places each child right after its own parent's far
    // edge, so with variable node sizes nodes at different depths can
    // share primary-axis ranges. Cross-axis contour separation must then
    // compare contours as functions of the primary axis — a level-lockstep
    // walk never compares a deep descendant against a wide uncle whose
    // primary range it slides back into, and the branches overlapped.
    interface Box { name: string; x0: number; y0: number; x1: number; y1: number }

    function boxes(result: ReturnType<typeof treeFromSpec>): Box[] {
      return result.nodes.map((n) => ({
        name: n.name!,
        x0: n.center.x - n.width / 2, x1: n.center.x + n.width / 2,
        y0: n.center.y - n.height / 2, y1: n.center.y + n.height / 2,
      }))
    }

    function overlappingPairs(result: ReturnType<typeof treeFromSpec>): [string, string][] {
      const bs = boxes(result)
      const out: [string, string][] = []
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i]!, b = bs[j]!
          if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
            out.push([a.name, b.name])
          }
        }
      }
      return out
    }

    const spec = (name: string, w: number, h = 15) =>
      ({ name, text: '', shape: SHAPES['rectangle'] as const, width: w, height: h, innerSep: 0, minWidth: 0, minHeight: 0 })

    it('pushes a deep child clear of a wide uncle in a neighbouring branch, in all four growth directions', () => {
      // A is a long row whose short children end early; B's branch is
      // narrow, so B1's children start at a primary position still covered
      // by A's extent. A level-lockstep contour walk ends once B1's left
      // contour runs out and never compares B1a/B1b against A's subtree.
      // 'up'/'left' run the primary math with a -1 sign; the overlap check
      // works on screen boxes, so the same scenario stresses all
      // directions. The long nodes must be long ALONG THE GROWTH AXIS:
      // width for right/left, height for down/up (the primary extent).
      for (const grow of ['right', 'down', 'left', 'up'] as const) {
        const horiz = grow === 'right' || grow === 'left'
        const longA = horiz ? [160, 15] : [15, 160]
        const longB = horiz ? [148, 15] : [15, 148]
        const result = treeFromSpec({
          content: spec('root', 20, 20),
          children: [
            { content: spec('A-long-row', longA[0], longA[1]), children: [{ content: spec('A1', 40) }, { content: spec('A2', 40) }] },
            {
              content: spec('B', 30),
              children: [
                { content: spec('B1', 30), children: [{ content: spec('B1a', longB[0], longB[1]) }, { content: spec('B1b', longB[0], longB[1]) }] },
              ],
            },
          ],
        }, { at: point(0, 0), grow, levelDistance: 26, siblingDistance: 10 })

        // Sanity: the scenario really is set up — B1a's primary range
        // reaches back into A-long-row's primary span (interval overlap
        // on the primary axis; sign-agnostic, works for all four grows).
        const a = result.getNode('A-long-row')!
        const b1a = result.getNode('B1a')!
        const aC = horiz ? a.center.x : a.center.y
        const aHalf = (horiz ? a.width : a.height) / 2
        const bC = horiz ? b1a.center.x : b1a.center.y
        const bHalf = (horiz ? b1a.width : b1a.height) / 2
        expect(Math.max(aC - aHalf, bC - bHalf)).toBeLessThan(Math.min(aC + aHalf, bC + bHalf))

        expect(overlappingPairs(result)).toEqual([])
      }
    })

    it('never overlaps, over many random branchy shapes, all growth directions and both align modes', () => {
      const mulberry = (a: number) => () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      let counter = 0
      type Spec = Parameters<typeof treeFromSpec>[0]
      const rand = (depth: number, rnd: () => number): Spec => {
        // Widths vary as wildly as collapsed move-chain rows do — and
        // heights too: for down/up growth the HEIGHT is the primary
        // extent, so varying only widths would leave vertical-growth
        // trees with uniform primary bands and never stress the bug.
        const self: Spec = {
          content: spec('n' + counter++, 30 + Math.floor(rnd() * 140), 10 + Math.floor(rnd() * 40)),
        }
        if (depth >= 5) return self
        const kids = depth === 0 ? 3 : Math.floor(rnd() * 3)
        if (kids > 0) self.children = Array.from({ length: kids }, () => rand(depth + 1, rnd))
        return self
      }

      for (let seed = 0; seed < 60; seed++) {
        for (const grow of ['right', 'down', 'left', 'up'] as const) {
          for (const align of ['parent', 'rank'] as const) {
            for (const siblingDistance of [10, 0]) {
              counter = 0
              const result = treeFromSpec(rand(0, mulberry(seed)), {
                at: point(0, 0), grow, align, levelDistance: 26, siblingDistance,
              })
              // Strict inequality: with siblingDistance 0 boxes may touch,
              // and touching edges are not an overlap.
              expect(overlappingPairs(result)).toEqual([])
            }
          }
        }
      }
    })

    it('still packs tightly: no phantom separation where primary ranges never meet', () => {
      // B1a is narrow enough that its primary range ends before A's
      // children begin: it must slide back up to exactly siblingDistance
      // below A's own row — only true primary overlaps may force
      // separation, or the layout degenerates to bounding-box packing.
      // Runs both growth signs: 'left' mirrors the primary axis of
      // 'right', which must not change the cross-axis packing.
      for (const grow of ['right', 'left'] as const) {
        const result = treeFromSpec({
          content: spec('root', 20),
          children: [
            { content: spec('A-long-row', 160), children: [{ content: spec('A1', 40) }, { content: spec('A2', 40) }] },
            {
              content: spec('B', 30),
              children: [{ content: spec('B1', 30), children: [{ content: spec('B1a', 40) }] }],
            },
          ],
        }, { at: point(0, 0), grow, levelDistance: 26, siblingDistance: 10 })

        // Sanity: B1a's x-range really is disjoint from A1/A2's.
        const a1 = result.getNode('A1')!
        const b1a = result.getNode('B1a')!
        if (grow === 'right') {
          expect(b1a.center.x + b1a.width / 2).toBeLessThanOrEqual(a1.center.x - a1.width / 2)
        } else {
          expect(b1a.center.x - b1a.width / 2).toBeGreaterThanOrEqual(a1.center.x + a1.width / 2)
        }

        const a = result.getNode('A-long-row')!
        const gap = b1a.center.y - b1a.height / 2 - (a.center.y + a.height / 2)
        expect(gap).toBeCloseTo(10, 6)
      }
    })
  })
})
