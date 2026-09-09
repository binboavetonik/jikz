import { describe, it, expect } from 'vitest'
import {
  NetworkSimplex,
  networkSimplexRanks,
  type SimplexVertex,
  type SimplexEdge,
} from '../../src/layout/networkSimplex'

interface V extends SimplexVertex {
  name: string
}

function vertex(name: string): V {
  return { name, rank: 0 }
}

function edge(from: V, to: V, minLength = 1, weight = 1): SimplexEdge {
  return { from, to, minLength, weight }
}

function rank(vertices: V[], name: string): number {
  return vertices.find((v) => v.name === name)!.rank
}

/** Every edge must satisfy rank[to] - rank[from] >= minLength. */
function expectFeasible(vertices: V[], edges: SimplexEdge[]): void {
  for (const e of edges) {
    expect(e.to.rank - e.from.rank).toBeGreaterThanOrEqual(e.minLength)
  }
}

describe('networkSimplexRanks', () => {
  it('ranks a simple chain 0,1,2', () => {
    const a = vertex('a'), b = vertex('b'), c = vertex('c')
    const vertices = [a, b, c]
    const edges = [edge(a, b), edge(b, c)]

    networkSimplexRanks(vertices, edges)

    expect(rank(vertices, 'a')).toBe(0)
    expect(rank(vertices, 'b')).toBe(1)
    expect(rank(vertices, 'c')).toBe(2)
  })

  it('places both parents of a diamond on the same rank', () => {
    const a = vertex('a'), b = vertex('b'), c = vertex('c'), d = vertex('d')
    const vertices = [a, b, c, d]
    const edges = [edge(a, b), edge(a, c), edge(b, d), edge(c, d)]

    networkSimplexRanks(vertices, edges)

    expect(rank(vertices, 'a')).toBe(0)
    expect(rank(vertices, 'b')).toBe(1)
    expect(rank(vertices, 'c')).toBe(1)
    expect(rank(vertices, 'd')).toBe(2)
    expectFeasible(vertices, edges)
  })

  it('respects minLength', () => {
    const a = vertex('a'), b = vertex('b'), c = vertex('c')
    const vertices = [a, b, c]
    const edges = [edge(a, b, 1), edge(a, c, 3), edge(b, c, 1)]

    networkSimplexRanks(vertices, edges)

    expect(rank(vertices, 'a')).toBe(0)
    expect(rank(vertices, 'c')).toBe(3)
    expectFeasible(vertices, edges)
  })

  it('balances a free node to the least-crowded rank', () => {
    // b has equal in/out weight, so it may sit anywhere in [1, 2].
    // The TikZ balance pass moves it to the empty rank 2.
    const a = vertex('a'), b = vertex('b'), c = vertex('c')
    const vertices = [a, b, c]
    const edges = [edge(a, b, 1), edge(a, c, 3), edge(b, c, 1)]

    networkSimplexRanks(vertices, edges)

    expect(rank(vertices, 'b')).toBe(2)
    expectFeasible(vertices, edges)
  })

  it('normalizes disconnected components independently', () => {
    const a = vertex('a'), b = vertex('b'), c = vertex('c'), d = vertex('d')
    const vertices = [a, b, c, d]
    const edges = [edge(a, b), edge(c, d)]

    networkSimplexRanks(vertices, edges)

    expect(rank(vertices, 'a')).toBe(0)
    expect(rank(vertices, 'b')).toBe(1)
    expect(rank(vertices, 'c')).toBe(0)
    expect(rank(vertices, 'd')).toBe(1)
    expectFeasible(vertices, edges)
  })

  it('does not shorten an edge below its minLength', () => {
    const a = vertex('a'), b = vertex('b'), c = vertex('c'), d = vertex('d'), e = vertex('e')
    const vertices = [a, b, c, d, e]
    const edges = [
      edge(a, b), edge(a, c), edge(b, d), edge(c, d), edge(d, e), edge(b, e),
    ]

    networkSimplexRanks(vertices, edges)

    expectFeasible(vertices, edges)
    expect(rank(vertices, 'a')).toBe(0)
    expect(rank(vertices, 'e')).toBe(3)
  })
})

describe('balanceLeftRight', () => {
  it('distributes slack evenly on a zero-cut tree edge', () => {
    // c is free to sit anywhere in [a, b-10] = [0, 20] without changing
    // the objective (in-weight == out-weight across the a-c cut). The
    // simplex leaves it tight at 0; the balance pass moves it halfway.
    const a: SimplexVertex = { rank: 0 }
    const b: SimplexVertex = { rank: 0 }
    const c: SimplexVertex = { rank: 0 }
    const edges: SimplexEdge[] = [
      { from: a, to: b, minLength: 30, weight: 1 },
      { from: a, to: c, minLength: 0, weight: 1 },
      { from: c, to: b, minLength: 10, weight: 1 },
    ]

    const simplex = new NetworkSimplex([a, b, c], edges)
    simplex.run()

    expect(a.rank).toBe(0)
    expect(b.rank).toBe(30)
    expect(c.rank).toBe(0) // tight to one side before balancing

    simplex.balanceLeftRight()

    expect(c.rank).toBe(10) // half the replacement edge's slack (20)
    // Still feasible.
    expect(b.rank - a.rank).toBeGreaterThanOrEqual(30)
    expect(c.rank - a.rank).toBeGreaterThanOrEqual(0)
    expect(b.rank - c.rank).toBeGreaterThanOrEqual(10)
  })
})
