import { describe, it, expect } from 'vitest'
import { matrix, matrixFromData } from '../../src/layout/Matrix'
import { point } from '../../src/core/Point'

describe('Matrix', () => {
  describe('basic matrix creation', () => {
    it('creates an empty matrix', () => {
      const result = matrix().build()

      expect(result.nodes).toHaveLength(0)
      expect(result.rowCount).toBe(0)
      expect(result.columnCount).toBe(0)
    })

    it('creates a single cell matrix', () => {
      const result = matrix({ at: point(50, 50) })
        .cell(0, 0, 'A')
        .build()

      expect(result.nodes).toHaveLength(1)
      expect(result.rowCount).toBe(1)
      expect(result.columnCount).toBe(1)
      expect(result.nodes[0]!.text).toBe('A')
    })

    it('creates a 2D grid of nodes', () => {
      const result = matrix({ at: point(50, 50) })
        .row(0, ['A', 'B', 'C'])
        .row(1, ['D', 'E', 'F'])
        .build()

      expect(result.nodes).toHaveLength(6)
      expect(result.rowCount).toBe(2)
      expect(result.columnCount).toBe(3)
    })

    it('creates matrix with rows() helper', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
        ])
        .build()

      expect(result.nodes).toHaveLength(4)
      expect(result.rowCount).toBe(2)
      expect(result.columnCount).toBe(2)
    })
  })

  describe('sparse matrices', () => {
    it('handles null cells', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', null, 'C'],
          [null, 'E', null],
        ])
        .build()

      expect(result.nodes).toHaveLength(3) // Only A, C, E
      expect(result.cell(0, 0)?.text).toBe('A')
      expect(result.cell(0, 1)).toBeUndefined()
      expect(result.cell(0, 2)?.text).toBe('C')
      expect(result.cell(1, 0)).toBeUndefined()
      expect(result.cell(1, 1)?.text).toBe('E')
    })

    it('handles non-contiguous cells', () => {
      const result = matrix({ at: point(50, 50) })
        .cell(0, 0, 'A')
        .cell(2, 2, 'B')
        .build()

      expect(result.rowCount).toBe(3)
      expect(result.columnCount).toBe(3)
      expect(result.nodes).toHaveLength(2)
    })
  })

  describe('positioning', () => {
    it('positions first cell at specified origin', () => {
      const result = matrix({ at: point(100, 200) })
        .cell(0, 0, 'A')
        .build()

      const node = result.nodes[0]!
      // Node center should be at origin + half node size
      expect(node.center.x).toBeGreaterThanOrEqual(100)
      expect(node.center.y).toBeGreaterThanOrEqual(200)
    })

    it('aligns nodes in columns', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
        ])
        .build()

      const a = result.cell(0, 0)!
      const c = result.cell(1, 0)!
      const b = result.cell(0, 1)!
      const d = result.cell(1, 1)!

      // Same column = same X
      expect(a.center.x).toBe(c.center.x)
      expect(b.center.x).toBe(d.center.x)
    })

    it('aligns nodes in rows', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
        ])
        .build()

      const a = result.cell(0, 0)!
      const b = result.cell(0, 1)!
      const c = result.cell(1, 0)!
      const d = result.cell(1, 1)!

      // Same row = same Y
      expect(a.center.y).toBe(b.center.y)
      expect(c.center.y).toBe(d.center.y)
    })

    it('respects columnSep option', () => {
      const smallSep = matrix({ at: point(50, 50), columnSep: 10 })
        .rows([['A', 'B']])
        .build()

      const largeSep = matrix({ at: point(50, 50), columnSep: 50 })
        .rows([['A', 'B']])
        .build()

      const smallGap = smallSep.cell(0, 1)!.center.x - smallSep.cell(0, 0)!.center.x
      const largeGap = largeSep.cell(0, 1)!.center.x - largeSep.cell(0, 0)!.center.x

      expect(largeGap).toBeGreaterThan(smallGap)
    })

    it('respects rowSep option', () => {
      const smallSep = matrix({ at: point(50, 50), rowSep: 10 })
        .rows([['A'], ['B']])
        .build()

      const largeSep = matrix({ at: point(50, 50), rowSep: 50 })
        .rows([['A'], ['B']])
        .build()

      const smallGap = smallSep.cell(1, 0)!.center.y - smallSep.cell(0, 0)!.center.y
      const largeGap = largeSep.cell(1, 0)!.center.y - largeSep.cell(0, 0)!.center.y

      expect(largeGap).toBeGreaterThan(smallGap)
    })
  })

  describe('column width calculation', () => {
    it('uses max node width in each column', () => {
      const result = matrix({ at: point(50, 50) })
        .cell(0, 0, { text: 'Short' })
        .cell(1, 0, { text: 'Much Longer Text', minWidth: 100 })
        .build()

      // Both cells should be aligned in the same column
      expect(result.cell(0, 0)!.center.x).toBe(result.cell(1, 0)!.center.x)
    })
  })

  describe('row height calculation', () => {
    it('uses max node height in each row', () => {
      const result = matrix({ at: point(50, 50) })
        .cell(0, 0, { text: 'A' })
        .cell(0, 1, { text: 'Tall', minHeight: 60 })
        .build()

      // Both cells should be aligned in the same row
      expect(result.cell(0, 0)!.center.y).toBe(result.cell(0, 1)!.center.y)
    })
  })

  describe('node options', () => {
    it('applies global node options', () => {
      const result = matrix({
        at: point(50, 50),
        nodeOptions: { shape: 'circle' }
      })
        .rows([['A', 'B']])
        .build()

      expect(result.nodes[0]!.shape.type).toBe('circle')
      expect(result.nodes[1]!.shape.type).toBe('circle')
    })

    it('allows per-cell options', () => {
      const result = matrix({ at: point(50, 50) })
        .cell(0, 0, { text: 'A', shape: 'circle' })
        .cell(0, 1, { text: 'B', shape: 'rectangle' })
        .build()

      expect(result.cell(0, 0)!.shape.type).toBe('circle')
      expect(result.cell(0, 1)!.shape.type).toBe('rectangle')
    })

    it('per-cell options override global options', () => {
      const result = matrix({
        at: point(50, 50),
        nodeOptions: { shape: 'circle' }
      })
        .cell(0, 0, 'A')
        .cell(0, 1, { text: 'B', shape: 'diamond' })
        .build()

      expect(result.cell(0, 0)!.shape.type).toBe('circle')
      expect(result.cell(0, 1)!.shape.type).toBe('diamond')
    })
  })

  describe('MatrixResult', () => {
    it('provides cell access by row/col', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
        ])
        .build()

      expect(result.cell(0, 0)?.text).toBe('A')
      expect(result.cell(0, 1)?.text).toBe('B')
      expect(result.cell(1, 0)?.text).toBe('C')
      expect(result.cell(1, 1)?.text).toBe('D')
      expect(result.cell(5, 5)).toBeUndefined()
    })

    it('provides row access', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B', 'C'],
          ['D', 'E', 'F'],
        ])
        .build()

      const row0 = result.row(0)
      expect(row0).toHaveLength(3)
      expect(row0.map(n => n.text)).toEqual(['A', 'B', 'C'])

      const row1 = result.row(1)
      expect(row1.map(n => n.text)).toEqual(['D', 'E', 'F'])

      expect(result.row(5)).toHaveLength(0)
    })

    it('provides column access', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
          ['E', 'F'],
        ])
        .build()

      const col0 = result.column(0)
      expect(col0).toHaveLength(3)
      expect(col0.map(n => n.text)).toEqual(['A', 'C', 'E'])

      const col1 = result.column(1)
      expect(col1.map(n => n.text)).toEqual(['B', 'D', 'F'])

      expect(result.column(5)).toHaveLength(0)
    })

    it('provides node lookup by name', () => {
      const result = matrix({ at: point(50, 50) })
        .cell(0, 0, { text: 'First', name: 'first' })
        .cell(0, 1, 'Second') // Uses text as name
        .build()

      expect(result.getNode('first')?.text).toBe('First')
      expect(result.getNode('Second')?.text).toBe('Second')
      expect(result.getNode('unknown')).toBeUndefined()
    })

    it('calculates correct bounds', () => {
      const result = matrix({ at: point(100, 100), columnSep: 20, rowSep: 20 })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
        ])
        .build()

      const [minX, minY, maxX, maxY] = result.bounds
      expect(minX).toBe(100)
      expect(minY).toBe(100)
      expect(maxX).toBeGreaterThan(minX)
      expect(maxY).toBeGreaterThan(minY)
    })

    it('provides cells as 2D array', () => {
      const result = matrix({ at: point(50, 50) })
        .rows([
          ['A', 'B'],
          ['C', 'D'],
        ])
        .build()

      expect(result.cells).toHaveLength(2)
      expect(result.cells[0]).toHaveLength(2)
      expect(result.cells[0]![0]?.text).toBe('A')
    })
  })

  describe('matrixFromData', () => {
    it('creates matrix directly from 2D array', () => {
      const result = matrixFromData([
        ['1', '2', '3'],
        ['4', '5', '6'],
      ], { at: point(50, 50) })

      expect(result.nodes).toHaveLength(6)
      expect(result.rowCount).toBe(2)
      expect(result.columnCount).toBe(3)
    })

    it('handles empty data', () => {
      const result = matrixFromData([], { at: point(50, 50) })

      expect(result.nodes).toHaveLength(0)
      expect(result.rowCount).toBe(0)
    })
  })
})
