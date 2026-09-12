import { describe, it, expect } from 'vitest'
import { graph } from '../../src/layout/Graph'

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

describe('graph builder', () => {
  it('declares nodes and edges and builds a result', () => {
    const g = graph().node('a').node('b').edge('a', 'b').circular({ radius: 100 })
    const r = g.build()
    expect(r.nodes).toHaveLength(2)
    expect(r.edges).toHaveLength(1)
    expect(r.getNode('a')).toBeDefined()
    expect(r.toRenderables()).toHaveLength(3)
  })

  it('throws on duplicate node names', () => {
    expect(() => graph().node('a').node('a')).toThrow(/duplicate node name/)
  })

  it('defaults node text to the name', () => {
    const r = graph().node('a').circular({ radius: 50 }).build()
    expect(r.getNode('a')!.text).toBe('a')
  })
})

describe('circular layout', () => {
  it('places nodes evenly on a ring of the given radius', () => {
    const r = graph()
      .node('n0').node('n1').node('n2').node('n3')
      .circular({ center: { x: 0, y: 0 }, radius: 100, startAngle: 0 })
      .build()

    expect(dist(r.getNode('n0')!.center, { x: 100, y: 0 })).toBeLessThan(1e-6)
    expect(dist(r.getNode('n1')!.center, { x: 0, y: 100 })).toBeLessThan(1e-6)
    expect(dist(r.getNode('n2')!.center, { x: -100, y: 0 })).toBeLessThan(1e-6)
    expect(dist(r.getNode('n3')!.center, { x: 0, y: -100 })).toBeLessThan(1e-6)
  })

  it('computes a radius when none is given', () => {
    const r = graph().node('a').node('b').node('c').circular().build()
    const c = r.getNode('a')!.center
    expect(dist(c, { x: 0, y: 0 })).toBeGreaterThan(0)
    for (const n of r.nodes) {
      expect(dist(n.center, { x: 0, y: 0 })).toBeCloseTo(dist(c, { x: 0, y: 0 }), 6)
    }
  })
})

describe('force layout', () => {
  it('is deterministic for a given seed', () => {
    const build = () =>
      graph()
        .node('a').node('b').node('c').node('d').node('e')
        .edge('a', 'b').edge('b', 'c').edge('c', 'd').edge('d', 'e').edge('e', 'a')
        .force({ seed: 42, iterations: 60 })
        .build()

    const r1 = build()
    const r2 = build()
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      expect(r1.getNode(name)!.center).toEqual(r2.getNode(name)!.center)
    }
  })

  it('keeps nodes inside the viewport', () => {
    const r = graph()
      .node('a').node('b').node('c').node('d')
      .edge('a', 'b').edge('b', 'c').edge('c', 'd')
      .force({ width: 200, height: 100, iterations: 50 })
      .build()
    for (const n of r.nodes) {
      expect(n.center.x).toBeGreaterThanOrEqual(0)
      expect(n.center.x).toBeLessThanOrEqual(200)
      expect(n.center.y).toBeGreaterThanOrEqual(0)
      expect(n.center.y).toBeLessThanOrEqual(100)
    }
  })

  it('spreads a complete graph apart (no node collapses onto another)', () => {
    const r = graph()
      .node('a').node('b').node('c').node('d')
      .edge('a', 'b').edge('a', 'c').edge('a', 'd')
      .edge('b', 'c').edge('b', 'd').edge('c', 'd')
      .force({ seed: 7, iterations: 120, width: 300, height: 300 })
      .build()
    const pts = r.nodes.map((n) => n.center)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(dist(pts[i]!, pts[j]!)).toBeGreaterThan(10)
      }
    }
  })

  it('renders self-edges as loops without throwing', () => {
    const r = graph().node('a').edge('a', 'a').force({ seed: 1, iterations: 10 }).build()
    expect(r.edges).toHaveLength(1)
    // A self-loop routes as a bezier curve, not a zero-length line.
    expect(r.edges[0]!.toSVGPath()).toContain('C')
  })
})
