import { describe, it, expect } from 'vitest'
import { tree, treeFromSpec } from '../../src/layout/Tree'
import { point } from '../../src/core/Point'

describe('Tree truncation (collapsed / maxDepth)', () => {
  describe('collapsed', () => {
    it('lays out a collapsed node as a leaf: children withheld, no edges', () => {
      const result = tree({ at: point(0, 0) })
        .root('Root')
          .child('A')
            .child('A1')
            .parent()
          .parent()
          .child('B')
            .collapsed(5)
        .build()

      // Root, A, A1, B — B's (absent) children contribute nothing.
      expect(result.nodes).toHaveLength(4)
      expect(result.edges).toHaveLength(3)
      expect(result.children(result.getNode('B')!)).toHaveLength(0)
    })

    it('records collapsed nodes with their hidden counts on the result', () => {
      const result = tree({ at: point(0, 0) })
        .root('Root')
          .child('A')
            .collapsed(3)
          .parent()
          .child('B')
        .build()

      expect(result.collapsed).toHaveLength(1)
      expect(result.collapsed[0]!.hidden).toBe(3)
      expect(result.collapsed[0]!.node.text).toBe('A')
    })

    it('spec children of a collapsed node are not laid out', () => {
      const result = treeFromSpec(
        {
          content: 'Root',
          children: [
            { content: 'A', collapsed: 2, children: [{ content: 'A1' }, { content: 'A2' }] },
            { content: 'B' },
          ],
        },
        { at: point(0, 0) }
      )

      expect(result.getNode('A1')).toBeUndefined()
      expect(result.getNode('A2')).toBeUndefined()
      expect(result.collapsed).toHaveLength(1)
      expect(result.collapsed[0]!.hidden).toBe(2)
    })

    it('a marker-sized collapsed node keeps its reserved width', () => {
      // B reserves width for its "+2›" marker; collapse must not shrink
      // the node to a bare label.
      const result = tree({ at: point(0, 0), grow: 'right', levelDistance: 10 })
        .root({ name: 'Root', text: '', width: 20, height: 10, minWidth: 0, minHeight: 0 })
          .child({ name: 'B', text: '', width: 60, height: 10, minWidth: 0, minHeight: 0 })
            .collapsed(2)
          .parent()
          .child({ name: 'C', text: '', width: 20, height: 10, minWidth: 0, minHeight: 0 })
        .build()

      const b = result.getNode('B')!
      const c = result.getNode('C')!
      expect(b.bounds[2] - b.bounds[0]).toBeCloseTo(60)
      expect(c.bounds[2] - c.bounds[0]).toBeCloseTo(20)
    })
  })

  describe('maxDepth', () => {
    const deepSpec = {
      content: 'L0',
      children: [
        {
          content: 'L1',
          children: [{ content: 'L2', children: [{ content: 'L3' }] }],
        },
      ],
    }

    it('lays out nodes up to and including maxDepth levels', () => {
      const result = treeFromSpec(deepSpec, { at: point(0, 0), maxDepth: 2 })
      expect(result.getNode('L0')).toBeDefined()
      expect(result.getNode('L1')).toBeDefined()
      expect(result.getNode('L2')).toBeDefined()
      expect(result.getNode('L3')).toBeUndefined()
      expect(result.levelCount).toBe(3)
    })

    it('does not mark depth-cut nodes as collapsed', () => {
      const result = treeFromSpec(deepSpec, { at: point(0, 0), maxDepth: 1 })
      expect(result.getNode('L2')).toBeUndefined()
      expect(result.collapsed).toHaveLength(0)
    })

    it('an uncapped tree lays out everything', () => {
      const result = treeFromSpec(deepSpec, { at: point(0, 0) })
      expect(result.getNode('L3')).toBeDefined()
      expect(result.levelCount).toBe(4)
    })
  })
})
