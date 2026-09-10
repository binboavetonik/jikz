import { describe, it, expect } from 'vitest'
import {
  crossCount,
  minimizeCrossings,
  type OrderingEdge,
  type OrderingVertex,
} from '../../src/layout/ordering'

function vertex(): OrderingVertex {
  return { inEdges: [], outEdges: [] }
}

function link(from: OrderingVertex, to: OrderingVertex, weight = 1): void {
  const e: OrderingEdge = { from, to, weight }
  from.outEdges.push(e)
  to.inEdges.push(e)
}

describe('crossCount', () => {
  it('counts a single crossing between two crossed edges', () => {
    const [a, b, x, y] = [vertex(), vertex(), vertex(), vertex()]
    link(a, y)
    link(b, x)

    expect(crossCount([[a, b], [x, y]])).toBe(1)
    expect(crossCount([[a, b], [y, x]])).toBe(0)
  })

  it('weights crossings by edge weight', () => {
    const [a, b, x, y] = [vertex(), vertex(), vertex(), vertex()]
    link(a, y, 3)
    link(b, x)

    // One crossing, weighted 3 × 1.
    expect(crossCount([[a, b], [x, y]])).toBe(3)
  })

  it('counts crossings across multiple rank pairs', () => {
    const [a, b, x, y, p, q] = [vertex(), vertex(), vertex(), vertex(), vertex(), vertex()]
    link(a, y)
    link(b, x)
    link(x, q)
    link(y, p)

    expect(crossCount([[a, b], [x, y], [p, q]])).toBe(2)
  })
})

describe('minimizeCrossings', () => {
  it('uncrosses a reversed bipartite graph', () => {
    const north = [vertex(), vertex(), vertex(), vertex()]
    const south = [vertex(), vertex(), vertex(), vertex()]
    for (let i = 0; i < 4; i++) {
      link(north[i]!, south[3 - i]!)
    }

    const ranks: OrderingVertex[][] = [north, south]
    minimizeCrossings(ranks)

    expect(crossCount(ranks)).toBe(0)
    expect(ranks[1]).toEqual(south.slice().reverse())
  })

  it('improves an order that a single median pass leaves crossed', () => {
    // A and C share median ties; only transposing the adjacent pair
    // (or an up-sweep) removes the remaining crossing.
    const [a, b, c] = [vertex(), vertex(), vertex()]
    const [x, y, z] = [vertex(), vertex(), vertex()]
    link(a, x)
    link(a, y)
    link(b, x)
    link(c, z)

    const ranks: OrderingVertex[][] = [[a, b, c], [z, x, y]]
    minimizeCrossings(ranks)

    expect(crossCount(ranks)).toBe(0)
  })

  it('keeps the weighted-cheaper of two tied orders', () => {
    // Unweighted, several orders have equal crossings; with a heavy
    // N0→S0 edge the keep-best comparison prefers a different order.
    const build = (heavy: boolean): { ranks: OrderingVertex[][]; south: OrderingVertex[] } => {
      const n0 = vertex()
      const n1 = vertex()
      const s = [vertex(), vertex(), vertex(), vertex()]
      link(n0, s[0]!, heavy ? 10 : 1)
      link(n0, s[2]!)
      link(n0, s[3]!)
      link(n1, s[0]!)
      link(n1, s[1]!)
      return { ranks: [[n0, n1], s.slice()], south: s }
    }

    const plain = build(false)
    const heavy = build(true)
    minimizeCrossings(plain.ranks)
    minimizeCrossings(heavy.ranks)

    const indices = (run: { ranks: OrderingVertex[][]; south: OrderingVertex[] }): number[] =>
      run.ranks[1]!.map((v) => run.south.indexOf(v))

    // The heavy edge changes the kept order (probed: [1,0,2,3] vs
    // [2,3,0,1]); with the heavy N0→S0 edge, S0 moves next to S1 so
    // the heavy edge stays uncrossed.
    expect(indices(plain)).toEqual([1, 0, 2, 3])
    expect(indices(heavy)).toEqual([2, 3, 0, 1])
  })
})
