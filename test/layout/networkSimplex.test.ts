import { describe, it, expect } from 'vitest'
import {
  NetworkSimplex,
  networkSimplexRanks,
  mergeParallelEdges,
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

describe('mergeParallelEdges', () => {
  it('collapses parallel edges into one with summed weight and max minLength', () => {
    const a = vertex('a')
    const b = vertex('b')
    const merged = mergeParallelEdges([edge(a, b, 1, 1), edge(a, b, 3, 2), edge(b, a, 1, 1)])
    expect(merged).toHaveLength(2)
    const ab = merged.find((e) => e.from === a && e.to === b)!
    expect(ab.weight).toBe(3)
    expect(ab.minLength).toBe(3)
    const ba = merged.find((e) => e.from === b && e.to === a)!
    expect(ba.weight).toBe(1)
  })

  it('drops self-loops and leaves the input untouched', () => {
    const a = vertex('a')
    const b = vertex('b')
    const input = [edge(a, a), edge(a, b)]
    const merged = mergeParallelEdges(input)
    expect(merged).toHaveLength(1)
    expect(input).toHaveLength(2)
    expect(merged[0]).not.toBe(input[1])
  })
})

describe('networkSimplexRanks with parallel edges', () => {
  // Regression: after cycle removal a 2-cycle a→b, b→a becomes two a→b
  // edges. The simplex assumes a simple graph and, fed the multigraph,
  // threw "no replacement edge found (infeasible)" on this shape.
  it('ranks the 5-vertex multigraph that used to be reported infeasible', () => {
    const vs = ['a', 'b', 'c', 'd', 'e'].map(vertex)
    const [a, b, c, d, e] = vs as [V, V, V, V, V]
    // Effective (post-reversal) direction of the original repro:
    // a→b, c→b, b→a (rev → a→b), b→c (rev → c→b), a→c, d→e, e→a (rev → a→e), e→c, a→d
    const edges = [
      edge(a, b), edge(c, b), edge(a, b), edge(c, b), edge(a, c),
      edge(d, e), edge(a, e), edge(e, c), edge(a, d),
    ]
    expect(() => networkSimplexRanks(vs, edges)).not.toThrow()
    expectFeasible(vs, edges)
    expect(rank(vs, 'a')).toBe(0)
  })

  it('treats k parallel edges like one edge of weight k', () => {
    const one = ['a', 'b', 'c'].map(vertex)
    const many = ['a', 'b', 'c'].map(vertex)
    const [a1, b1, c1] = one as [V, V, V]
    const [a2, b2, c2] = many as [V, V, V]
    networkSimplexRanks(one, [edge(a1, b1, 1, 3), edge(a1, c1, 2, 1)])
    networkSimplexRanks(many, [edge(a2, b2), edge(a2, b2), edge(a2, b2), edge(a2, c2, 2, 1)])
    expect(many.map((v) => v.rank)).toEqual(one.map((v) => v.rank))
  })

  it('stays feasible on seeded random multigraphs', () => {
    for (let seed = 1; seed <= 60; seed++) {
      let s = seed
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
      const n = 4 + (seed % 8)
      const vs = Array.from({ length: n }, (_, i) => vertex('v' + i))
      const edges: SimplexEdge[] = []
      for (let k = 0; k < 2 * n; k++) {
        let x = Math.floor(rnd() * n)
        let y = Math.floor(rnd() * n)
        if (x === y) continue
        if (x > y) [x, y] = [y, x] // keep it acyclic; duplicates are the point
        edges.push(edge(vs[x]!, vs[y]!, 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 3)))
      }
      expect(() => networkSimplexRanks(vs, edges), `seed ${seed}`).not.toThrow()
      expectFeasible(vs, edges)
    }
  })
})
