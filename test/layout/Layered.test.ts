import { describe, it, expect } from 'vitest'
import { layered } from '../../src/layout/Layered'
import { point } from '../../src/core/Point'

describe('Layered', () => {
  it('builds an empty result for no nodes', () => {
    const result = layered().build()
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
    expect(result.levelCount).toBe(0)
    expect(result.level(0)).toHaveLength(0)
  })

  it('places a multi-parent node once with two incoming edges', () => {
    const result = layered({ at: point(0, 0), grow: 'down' })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .node('D', { width: 20, height: 20 })
      .edge('A', 'D')
      .edge('B', 'D')
      .build()

    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)

    const A = result.getNode('A')!
    const B = result.getNode('B')!
    const D = result.getNode('D')!

    // A and B share rank 0; D is one rank further.
    expect(A.center.y).toBe(B.center.y)
    expect(D.center.y).toBeGreaterThan(A.center.y)

    expect(result.incoming(D).map((n) => n.name).sort()).toEqual(['A', 'B'])
    expect(result.outgoing(A).map((n) => n.name)).toEqual(['D'])
  })

  it('assigns longest-path ranks for a chain', () => {
    const result = layered({ at: point(0, 0), grow: 'down' })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .node('C', { width: 20, height: 20 })
      .edge('A', 'B')
      .edge('B', 'C')
      .build()

    expect(result.levelCount).toBe(3)
    expect(result.level(0).map((n) => n.name)).toEqual(['A'])
    expect(result.level(1).map((n) => n.name)).toEqual(['B'])
    expect(result.level(2).map((n) => n.name)).toEqual(['C'])
  })

  it('respects edge minLength in rank assignment', () => {
    const result = layered({ at: point(0, 0), grow: 'down' })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .node('C', { width: 20, height: 20 })
      .edge('A', 'B')
      .edge('A', 'C', { minLength: 2 })
      .edge('B', 'C')
      .build()

    // C = max(A+2, B+1) = rank 2; B = rank 1.
    expect(result.levelCount).toBe(3)
    expect(result.level(1).map((n) => n.name)).toEqual(['B'])
    expect(result.level(2).map((n) => n.name)).toEqual(['C'])
    expect(result.getNode('C')!.center.y).toBeGreaterThan(result.getNode('B')!.center.y)
  })

  it('grows right along the primary axis', () => {
    const result = layered({ at: point(0, 0), grow: 'right' })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .edge('A', 'B')
      .build()

    expect(result.getNode('B')!.center.x).toBeGreaterThan(result.getNode('A')!.center.x)
    expect(result.getNode('B')!.center.y).toBe(result.getNode('A')!.center.y)
  })

  it('centers a shared child between its two parents', () => {
    const result = layered({ at: point(0, 0), grow: 'down', nodeSep: 20 })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .node('C', { width: 20, height: 20 })
      .edge('A', 'C')
      .edge('B', 'C')
      .build()

    const A = result.getNode('A')!
    const B = result.getNode('B')!
    const C = result.getNode('C')!
    expect(C.center.x).toBeCloseTo((A.center.x + B.center.x) / 2)
  })

  it('computes a non-degenerate bounding box', () => {
    const result = layered({ at: point(0, 0), grow: 'down' })
      .node('A', { width: 40, height: 30 })
      .node('B', { width: 40, height: 30 })
      .edge('A', 'B')
      .build()

    const [minX, minY, maxX, maxY] = result.bounds
    expect(minX).toBeLessThan(maxX)
    expect(minY).toBeLessThan(maxY)
  })

  it('throws on duplicate node names', () => {
    expect(() => layered().node('A').node('A')).toThrow(/duplicate node name "A"/)
  })

  it('throws on edges referencing unknown nodes', () => {
    expect(() => layered().node('A').edge('A', 'B')).toThrow(/unknown node "B"/)
  })

  it('breaks cycles by reversing back-edges', () => {
    const result = layered({ at: point(0, 0), grow: 'down' })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .edge('A', 'B')
      .edge('B', 'A')
      .build()

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(2)
    // Original direction is preserved on the rendered edges.
    expect(result.outgoing(result.getNode('A')!).map((n) => n.name)).toEqual(['B'])
    expect(result.outgoing(result.getNode('B')!).map((n) => n.name)).toEqual(['A'])
  })

  it('routes a multi-rank edge through dummy bend points', () => {
    const result = layered({ at: point(0, 0), grow: 'down' })
      .node('A', { width: 20, height: 20 })
      .node('B', { width: 20, height: 20 })
      .edge('A', 'B', { minLength: 3 })
      .build()

    expect(result.nodes).toHaveLength(2) // dummies are not exposed as nodes
    expect(result.edges).toHaveLength(1)

    const e = result.edges[0]!
    const A = result.getNode('A')!
    const B = result.getNode('B')!

    // minLength 3 → ranks 0,1,2,3; two dummy bend points on ranks 1,2.
    expect(result.levelCount).toBe(4)
    expect(result.level(1)).toHaveLength(0)
    expect(result.level(2)).toHaveLength(0)
    expect(result.level(3).map((n) => n.name)).toEqual(['B'])
    expect(e.bendPoints).toHaveLength(2)

    expect(e.bendPoints![0]!.y).toBeGreaterThan(A.center.y)
    expect(e.bendPoints![1]!.y).toBeGreaterThan(e.bendPoints![0]!.y)
    expect(e.bendPoints![1]!.y).toBeLessThan(B.center.y)
  })

  describe('network-simplex coordinate assignment', () => {
    it('balances a full binary tree symmetrically about the root', () => {
      const result = layered({ at: point(0, 0), grow: 'down', nodeSep: 20 })
        .node('R', { width: 20, height: 20 })
        .node('A', { width: 20, height: 20 })
        .node('B', { width: 20, height: 20 })
        .node('C', { width: 20, height: 20 })
        .node('D', { width: 20, height: 20 })
        .node('E', { width: 20, height: 20 })
        .node('F', { width: 20, height: 20 })
        .edge('R', 'A')
        .edge('R', 'B')
        .edge('A', 'C')
        .edge('A', 'D')
        .edge('B', 'E')
        .edge('B', 'F')
        .build()

      const x = (n: string) => result.getNode(n)!.center.x

      // Parents centered between rank neighbors…
      expect(x('R')).toBeCloseTo((x('A') + x('B')) / 2)
      // …and the whole drawing is mirror-symmetric about the root.
      expect(x('A') + x('B')).toBeCloseTo(2 * x('R'))
      expect(x('C') + x('F')).toBeCloseTo(2 * x('R'))
      expect(x('D') + x('E')).toBeCloseTo(2 * x('R'))
    })

    it('keeps multi-rank dummy chains straight (omega straightening)', () => {
      const result = layered({ at: point(0, 0), grow: 'down', nodeSep: 20 })
        .node('A', { width: 20, height: 20 })
        .node('X', { width: 20, height: 20 })
        .node('B', { width: 20, height: 20 })
        .edge('A', 'B', { minLength: 3 })
        .edge('X', 'B')
        .build()

      const A = result.getNode('A')!
      const B = result.getNode('B')!
      const long = result.edges.find((e) => e.bendPoints?.length === 2)!

      expect(long.bendPoints).toHaveLength(2)
      for (const p of long.bendPoints!) {
        expect(p.x).toBeCloseTo(A.center.x)
      }
      expect(B.center.x).toBeCloseTo(A.center.x)
    })

    it('places the first box edge at the secondary component of `at`', () => {
      const result = layered({ at: point(100, 50), grow: 'down', nodeSep: 20 })
        .node('A', { width: 20, height: 20 })
        .node('B', { width: 40, height: 20 })
        .edge('A', 'B')
        .build()

      const [minX] = result.bounds
      expect(minX).toBeCloseTo(100)
    })
  })

  describe('crossing minimization', () => {
    it('uncrosses a reversed 4×4 bipartite graph', () => {
      let b = layered({ at: point(0, 0), grow: 'down', nodeSep: 10 })
      for (const n of ['N1', 'N2', 'N3', 'N4']) b = b.node(n, { width: 10, height: 10 })
      for (const s of ['S1', 'S2', 'S3', 'S4']) b = b.node(s, { width: 10, height: 10 })
      // Adversarial insertion: fully reversed crossings.
      const edges: [string, string][] = [
        ['N1', 'S4'],
        ['N2', 'S3'],
        ['N3', 'S2'],
        ['N4', 'S1'],
      ]
      let bb = b
      for (const [f, t] of edges) bb = bb.edge(f, t)
      const result = bb.build()

      const north = result.level(0).map((n) => n.name)
      const south = result.level(1).map((n) => n.name)

      // Zero crossings: every pair of edges keeps its relative order
      // on both ranks (either orientation — the mirror is equivalent).
      for (const [f1, t1] of edges) {
        for (const [f2, t2] of edges) {
          const dn = north.indexOf(f1) - north.indexOf(f2)
          const ds = south.indexOf(t1) - south.indexOf(t2)
          expect(dn * ds).toBeGreaterThanOrEqual(0)
        }
      }
      // And the fully-parallel order was actually found (not left crossed).
      expect(new Set(north)).toEqual(new Set(['N1', 'N2', 'N3', 'N4']))
    })

    it('reorders both ranks to remove crossings a single sweep misses', () => {
      const result = layered({ at: point(0, 0), grow: 'down', nodeSep: 10 })
        .node('A', { width: 10, height: 10 })
        .node('B', { width: 10, height: 10 })
        .node('C', { width: 10, height: 10 })
        .node('X', { width: 10, height: 10 })
        .node('Y', { width: 10, height: 10 })
        .node('Z', { width: 10, height: 10 })
        .edge('A', 'X')
        .edge('A', 'Y')
        .edge('B', 'X')
        .edge('C', 'Z')
        .build()

      // Zero crossings requires reversing both ranks (median ties alone
      // cannot get there).
      expect(result.level(0).map((n) => n.name)).toEqual(['C', 'B', 'A'])
      expect(result.level(1).map((n) => n.name)).toEqual(['Z', 'X', 'Y'])
    })

    it('lets a heavy edge decide between tied crossing counts', () => {
      const mk = (heavy: boolean) => {
        let b = layered({ at: point(0, 0), grow: 'down', nodeSep: 10 })
        b = b.node('N0', { width: 10, height: 10 }).node('N1', { width: 10, height: 10 })
        for (const s of ['S0', 'S1', 'S2', 'S3']) b = b.node(s, { width: 10, height: 10 })
        return b
          .edge('N0', 'S0', { weight: heavy ? 10 : 1 })
          .edge('N0', 'S2')
          .edge('N0', 'S3')
          .edge('N1', 'S0')
          .edge('N1', 'S1')
          .build()
      }

      const plain = mk(false)
      const heavy = mk(true)

      expect(plain.level(1).map((n) => n.name)).toEqual(['S1', 'S0', 'S2', 'S3'])
      // With N0→S0 heavy, the kept order groups S0 with S1 (both N0/N1
      // neighbors) so the heavy edge stays uncrossed.
      expect(heavy.level(1).map((n) => n.name)).toEqual(['S2', 'S3', 'S0', 'S1'])
    })
  })

  describe('self-edges', () => {
    const graph = (grow: 'down' | 'right', loop?: 'above' | 'below' | 'left' | 'right') =>
      layered({ at: point(0, 0), grow })
        .node('A', { width: 40, height: 24 })
        .node('B', { width: 40, height: 24 })
        .edge('A', 'B')
        .edge('A', 'A', loop ? { loop } : undefined)
        .build()

    it('renders a self-edge as a loop', () => {
      const r = graph('down')
      expect(r.edges).toHaveLength(2)
      const loop = r.edges.find((e) => e.routing === 'bezier')!
      expect(loop).toBeDefined()
      expect(loop.length).toBeGreaterThan(0)
    })

    it('leaves ranks and coordinates untouched', () => {
      // A loop carries no ranking or ordering information, so it must
      // not perturb the layout it sits in.
      const withLoop = graph('down')
      const without = layered({ at: point(0, 0), grow: 'down' })
        .node('A', { width: 40, height: 24 })
        .node('B', { width: 40, height: 24 })
        .edge('A', 'B')
        .build()

      expect(withLoop.levelCount).toBe(without.levelCount)
      for (const name of ['A', 'B']) {
        expect(withLoop.getNode(name)!.center.x).toBeCloseTo(without.getNode(name)!.center.x)
        expect(withLoop.getNode(name)!.center.y).toBeCloseTo(without.getNode(name)!.center.y)
      }
    })

    it('loops to the side that does not collide with the rank direction', () => {
      // Vertical growth stacks ranks above and below, so the loop goes
      // beside the node; horizontal growth is the other way round.
      const down = graph('down').edges.find((e) => e.routing === 'bezier')!
      const A = graph('down').getNode('A')!
      expect(down.from.x).toBeGreaterThan(A.center.x)

      const right = graph('right').edges.find((e) => e.routing === 'bezier')!
      const A2 = graph('right').getNode('A')!
      expect(right.from.y).toBeLessThan(A2.center.y)
    })

    it('honors an explicit loop direction', () => {
      const r = graph('down', 'below')
      const loop = r.edges.find((e) => e.routing === 'bezier')!
      expect(loop.from.y).toBeGreaterThan(r.getNode('A')!.center.y)
    })

    it('reports the node as its own neighbor', () => {
      const r = graph('down')
      const A = r.getNode('A')!
      expect(r.outgoing(A).map((n) => n.name)).toContain('A')
      expect(r.incoming(A).map((n) => n.name)).toContain('A')
    })

    it('lays out a graph made only of self-edges', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('A', { width: 40, height: 24 })
        .node('B', { width: 40, height: 24 })
        .edge('A', 'A')
        .edge('B', 'B')
        .build()
      expect(r.nodes).toHaveLength(2)
      expect(r.edges).toHaveLength(2)
      expect(r.levelCount).toBe(1)
      for (const n of r.nodes) expect(Number.isFinite(n.center.x)).toBe(true)
    })
  })

})

describe('Layered on cyclic input', () => {
  // Regression (2026-09-12 review): cycle removal turns each 2-cycle into a
  // pair of parallel edges, which the network simplex could not rank —
  // build() threw "network simplex: no replacement edge found".
  it('lays out the 5-node graph that used to throw', () => {
    const l = layered()
    for (const n of ['a', 'b', 'c', 'd', 'e']) l.node(n)
    const edges: [string, string][] = [
      ['a', 'b'], ['c', 'b'], ['b', 'a'], ['b', 'c'], ['a', 'c'],
      ['d', 'e'], ['e', 'a'], ['e', 'c'], ['a', 'd'],
    ]
    for (const [f, t] of edges) l.edge(f, t)
    const result = l.build()
    expect(result.nodes).toHaveLength(5)
    expect(result.edges).toHaveLength(edges.length)
    for (const n of result.nodes) {
      expect(Number.isFinite(n.center.x)).toBe(true)
      expect(Number.isFinite(n.center.y)).toBe(true)
    }
  })

  it('never throws on seeded random cyclic graphs', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let s = seed
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
      const n = 3 + (seed % 10)
      const l = layered()
      for (let i = 0; i < n; i++) l.node('n' + i)
      const seen = new Set<string>()
      let edges = 0
      let tries = 0
      while (edges < 2 * n && tries++ < 1000) {
        const x = Math.floor(rnd() * n)
        const y = Math.floor(rnd() * n)
        if (x === y) continue
        const key = x + '>' + y
        if (seen.has(key)) continue
        seen.add(key)
        l.edge('n' + x, 'n' + y)
        edges++
      }
      expect(() => l.build(), `seed ${seed}`).not.toThrow()
    }
  })
})
