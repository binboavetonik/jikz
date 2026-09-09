import { describe, it, expect } from 'vitest'
import { layered, type LayeredOptions } from '../../src/layout/Layered'
import { point } from '../../src/core/Point'

type Mode = NonNullable<LayeredOptions['coordinates']>
const MODES: Mode[] = ['gansner', 'brandes-koepf']

const BK: LayeredOptions = {
  at: point(0, 0),
  grow: 'down',
  nodeSep: 30,
  coordinates: 'brandes-koepf',
}

/** Nodes on the same rank, left to right. */
function rank(result: ReturnType<ReturnType<typeof layered>['build']>, i: number) {
  return result.level(i).slice().sort((a, b) => a.center.x - b.center.x)
}

describe('brandes-koepf coordinate assignment', () => {
  it('produces the same ranks and rank membership as gansner', () => {
    const build = (coordinates: Mode) =>
      layered({ at: point(0, 0), grow: 'down', coordinates })
        .node('A', { width: 40, height: 20 })
        .node('B', { width: 40, height: 20 })
        .node('C', { width: 40, height: 20 })
        .node('D', { width: 40, height: 20 })
        .node('E', { width: 40, height: 20 })
        .edge('A', 'B')
        .edge('A', 'C')
        .edge('B', 'D')
        .edge('C', 'D')
        .edge('D', 'E')
        .build()

    const g = build('gansner')
    const b = build('brandes-koepf')

    expect(b.levelCount).toBe(g.levelCount)
    for (let i = 0; i < g.levelCount; i++) {
      expect(rank(b, i).map((n) => n.name)).toEqual(rank(g, i).map((n) => n.name))
      // Ranks are a primary-axis concern; both assigners leave them alone.
      expect(rank(b, i).map((n) => n.center.y)).toEqual(rank(g, i).map((n) => n.center.y))
    }
  })

  it('separates rank neighbors by at least nodeSep, edge to edge', () => {
    const b = layered({ ...BK, nodeSep: 25 })
      .node('root', { width: 60, height: 20 })
      .node('w', { width: 100, height: 20 })
      .node('x', { width: 20, height: 20 })
      .node('y', { width: 80, height: 20 })
      .node('z', { width: 40, height: 20 })
      .edge('root', 'w')
      .edge('root', 'x')
      .edge('root', 'y')
      .edge('root', 'z')
      .build()

    const children = rank(b, 1)
    expect(children).toHaveLength(4)
    for (let i = 1; i < children.length; i++) {
      const left = children[i - 1]!
      const right = children[i]!
      const gap = right.center.x - right.width / 2 - (left.center.x + left.width / 2)
      expect(gap).toBeGreaterThanOrEqual(25 - 1e-9)
    }
  })

  it('never overlaps nodes within a rank', () => {
    const b = layered(BK)
    for (let i = 0; i < 24; i++) b.node('n' + i, { width: 30 + (i % 5) * 10, height: 20 })
    for (let i = 0; i < 24; i++) for (const j of [i + 4, i + 7]) if (j < 24) b.edge('n' + i, 'n' + j)
    const result = b.build()

    for (let r = 0; r < result.levelCount; r++) {
      const row = rank(result, r)
      for (let i = 1; i < row.length; i++) {
        const left = row[i - 1]!
        const right = row[i]!
        expect(right.center.x - right.width / 2).toBeGreaterThanOrEqual(
          left.center.x + left.width / 2 - 1e-9
        )
      }
    }
  })

  it('keeps a multi-rank edge straight through its dummy chain', () => {
    // A → E spans four ranks alongside the A→B→C→D→E chain, so it is
    // routed through three dummies. Straightening them is the property
    // the four-way median is designed to preserve.
    const b = layered(BK)
      .node('A', { width: 30, height: 20 })
      .node('B', { width: 30, height: 20 })
      .node('C', { width: 30, height: 20 })
      .node('D', { width: 30, height: 20 })
      .node('E', { width: 30, height: 20 })
      .edge('A', 'B')
      .edge('B', 'C')
      .edge('C', 'D')
      .edge('D', 'E')
      .edge('A', 'E')
      .build()

    const long = b.edges.find((e) => e.bendPoints && e.bendPoints.length === 3)
    expect(long).toBeDefined()
    const xs = long!.bendPoints!.map((p) => p.x)
    for (const x of xs) expect(x).toBeCloseTo(xs[0]!, 6)
  })

  it('centers a shared child between its two parents', () => {
    const b = layered(BK)
      .node('A', { width: 40, height: 20 })
      .node('B', { width: 40, height: 20 })
      .node('D', { width: 40, height: 20 })
      .edge('A', 'D')
      .edge('B', 'D')
      .build()

    const A = b.getNode('A')!
    const B = b.getNode('B')!
    const D = b.getNode('D')!
    expect(D.center.x).toBeCloseTo((A.center.x + B.center.x) / 2, 6)
  })

  it('places the first box edge at the secondary component of `at`', () => {
    const b = layered({ ...BK, at: point(17, 5) })
      .node('A', { width: 40, height: 20 })
      .node('B', { width: 40, height: 20 })
      .edge('A', 'B')
      .build()

    const left = Math.min(...b.nodes.map((n) => n.center.x - n.width / 2))
    expect(left).toBeCloseTo(17, 6)
  })

  it('is deterministic across repeated builds', () => {
    const make = () => {
      const b = layered(BK)
      for (let i = 0; i < 16; i++) b.node('n' + i, { width: 40, height: 20 })
      for (let i = 0; i < 16; i++) for (const j of [i + 2, i + 5]) if (j < 16) b.edge('n' + i, 'n' + j)
      return b.build()
    }
    const a = make().nodes.map((n) => `${n.name}:${n.center.x},${n.center.y}`)
    const c = make().nodes.map((n) => `${n.name}:${n.center.x},${n.center.y}`)
    expect(c).toEqual(a)
  })

  it('handles disconnected components, isolated nodes and cycles', () => {
    const b = layered(BK)
      .node('a1', { width: 30, height: 20 })
      .node('a2', { width: 30, height: 20 })
      .node('lonely', { width: 30, height: 20 })
      .node('c1', { width: 30, height: 20 })
      .node('c2', { width: 30, height: 20 })
      .node('c3', { width: 30, height: 20 })
      .edge('a1', 'a2')
      .edge('c1', 'c2')
      .edge('c2', 'c3')
      .edge('c3', 'c1') // back-edge
      .build()

    expect(b.nodes).toHaveLength(6)
    for (const n of b.nodes) {
      expect(Number.isFinite(n.center.x)).toBe(true)
      expect(Number.isFinite(n.center.y)).toBe(true)
    }
  })

  it('survives a deep chain without overflowing the stack', () => {
    // The paper's placeBlock is recursive; this chain makes the block
    // graph ~2000 deep, which would blow a recursive implementation.
    const n = 2000
    const b = layered(BK)
    for (let i = 0; i < n; i++) b.node('n' + i, { width: 20, height: 10 })
    for (let i = 1; i < n; i++) b.edge('n' + (i - 1), 'n' + i)
    const result = b.build()

    expect(result.levelCount).toBe(n)
    for (const node of result.nodes) expect(Number.isFinite(node.center.x)).toBe(true)
    // A pure chain has nothing to spread: every node shares one column.
    const xs = new Set(result.nodes.map((node) => node.center.x))
    expect(xs.size).toBe(1)
  })

  for (const mode of MODES) {
    it(`grows right correctly with coordinates: '${mode}'`, () => {
      const b = layered({ at: point(0, 0), grow: 'right', coordinates: mode })
        .node('A', { width: 40, height: 20 })
        .node('B', { width: 40, height: 20 })
        .node('C', { width: 40, height: 20 })
        .edge('A', 'B')
        .edge('A', 'C')
        .build()

      const A = b.getNode('A')!
      const B = b.getNode('B')!
      const C = b.getNode('C')!
      // Growth is along x; the cross axis is y.
      expect(B.center.x).toBeGreaterThan(A.center.x)
      expect(C.center.x).toBeCloseTo(B.center.x, 6)
      expect(B.center.y).not.toBeCloseTo(C.center.y, 6)
      // A sits within its children's span either way; where exactly is
      // the assigners' business — see the centering test below.
      expect(A.center.y).toBeGreaterThanOrEqual(Math.min(B.center.y, C.center.y) - 1e-9)
      expect(A.center.y).toBeLessThanOrEqual(Math.max(B.center.y, C.center.y) + 1e-9)
    })
  }

  // Documents a real difference, not a preference: with a lone parent over
  // two children every position between them is an optimum of Gansner's
  // objective, and `balanceLeftRight` does not break that tie — the parent
  // lands flush with one child. Brandes–Köpf's four-way median centers it.
  // Both are "correct"; BK simply looks better here.
  it.each(['down', 'right'] as const)(
    'centers a lone parent over two children (grow: %s) where gansner does not',
    (grow) => {
      const build = (coordinates: Mode) =>
        layered({ at: point(0, 0), grow, coordinates })
          .node('A', { width: 40, height: 20 })
          .node('B', { width: 40, height: 20 })
          .node('C', { width: 40, height: 20 })
          .edge('A', 'B')
          .edge('A', 'C')
          .build()

      const cross = (n: { center: { x: number; y: number } }) =>
        grow === 'down' ? n.center.x : n.center.y

      const bk = build('brandes-koepf')
      const midBk = (cross(bk.getNode('B')!) + cross(bk.getNode('C')!)) / 2
      expect(cross(bk.getNode('A')!)).toBeCloseTo(midBk, 6)

      const g = build('gansner')
      const midG = (cross(g.getNode('B')!) + cross(g.getNode('C')!)) / 2
      expect(cross(g.getNode('A')!)).not.toBeCloseTo(midG, 6)
    }
  )
})
