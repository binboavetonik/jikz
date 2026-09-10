import { describe, it, expect } from 'vitest'
import { layered, type LayeredOptions, type LayeredResult } from '../../src/layout/Layered'
import { point } from '../../src/core/Point'
import type { Node } from '../../src/node/Node'

type Mode = NonNullable<LayeredOptions['coordinates']>
const MODES: Mode[] = ['gansner', 'brandes-koepf']

const contains = (
  box: readonly [number, number, number, number],
  n: Node,
  slack = 1e-6
): boolean => {
  const [x0, y0, x1, y1] = n.bounds
  return x0 >= box[0] - slack && x1 <= box[2] + slack && y0 >= box[1] - slack && y1 <= box[3] + slack
}

/** A pipeline whose middle three nodes form a cluster, plus a bypass edge. */
function pipeline(coordinates: Mode, padding?: number): LayeredResult {
  return layered({ at: point(0, 0), grow: 'down', coordinates, clusterPadding: padding })
    .node('in', { width: 50, height: 24 })
    .node('parse', { width: 50, height: 24 })
    .node('check', { width: 50, height: 24 })
    .node('emit', { width: 50, height: 24 })
    .node('out', { width: 50, height: 24 })
    .edge('in', 'parse')
    .edge('parse', 'check')
    .edge('check', 'emit')
    .edge('emit', 'out')
    .edge('in', 'out') // bypasses the cluster entirely
    .cluster('core', ['parse', 'check', 'emit'], { label: 'core' })
    .build()
}

describe('layered clusters', () => {
  describe.each(MODES)('with coordinates: %s', (mode) => {
    it('encloses exactly its members', () => {
      const r = pipeline(mode)
      const c = r.getCluster('core')!
      for (const n of r.nodes) {
        expect(contains(c.bounds, n)).toBe(c.nodes.includes(n))
      }
    })

    it('routes a foreign long edge outside the box', () => {
      // The bypass edge spans the cluster's ranks. If its dummies were
      // free to sit anywhere, the edge would cut straight through the box.
      const r = pipeline(mode)
      const c = r.getCluster('core')!
      const long = r.edges.find((e) => e.bendPoints.length > 0)!
      expect(long.bendPoints.length).toBeGreaterThan(0)
      for (const p of long.bendPoints) {
        const inside =
          p.x > c.bounds[0] && p.x < c.bounds[2] && p.y > c.bounds[1] && p.y < c.bounds[3]
        expect(inside).toBe(false)
      }
    })

    it('keeps non-members out on a rank the cluster spans but has no member on', () => {
      const r = layered({ at: point(0, 0), grow: 'down', coordinates: mode })
        .node('a', { width: 40, height: 24 })
        .node('mid', { width: 40, height: 24 })
        .node('b', { width: 40, height: 24 })
        .node('x', { width: 40, height: 24 })
        .edge('a', 'mid')
        .edge('mid', 'b')
        .edge('a', 'x')
        .cluster('ends', ['a', 'b'])
        .build()
      const c = r.getCluster('ends')!
      // The box spans all three ranks…
      expect(c.bounds[1]).toBeLessThan(r.getNode('a')!.bounds[1] + 1e-6)
      expect(c.bounds[3]).toBeGreaterThan(r.getNode('b')!.bounds[3] - 1e-6)
      // …and the rank-1 non-members stay clear of it.
      expect(contains(c.bounds, r.getNode('mid')!)).toBe(false)
      expect(contains(c.bounds, r.getNode('x')!)).toBe(false)
    })

    it('pads the box by clusterPadding on every side', () => {
      const r = pipeline(mode, 20)
      const c = r.getCluster('core')!
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const n of c.nodes) {
        x0 = Math.min(x0, n.bounds[0]); y0 = Math.min(y0, n.bounds[1])
        x1 = Math.max(x1, n.bounds[2]); y1 = Math.max(y1, n.bounds[3])
      }
      expect(x0 - c.bounds[0]).toBeCloseTo(20, 6)
      expect(c.bounds[2] - x1).toBeCloseTo(20, 6)
      expect(y0 - c.bounds[1]).toBeCloseTo(20, 6)
      expect(c.bounds[3] - y1).toBeCloseTo(20, 6)
    })

    it('keeps two clusters disjoint', () => {
      const r = layered({ at: point(0, 0), grow: 'down', coordinates: mode })
        .node('a1', { width: 40, height: 24 })
        .node('a2', { width: 40, height: 24 })
        .node('b1', { width: 40, height: 24 })
        .node('b2', { width: 40, height: 24 })
        .node('sink', { width: 40, height: 24 })
        .edge('a1', 'a2')
        .edge('b1', 'b2')
        .edge('a2', 'sink')
        .edge('b2', 'sink')
        .cluster('A', ['a1', 'a2'])
        .cluster('B', ['b1', 'b2'])
        .build()
      const [A, B] = [r.getCluster('A')!, r.getCluster('B')!]
      const overlapX = Math.min(A.bounds[2], B.bounds[2]) - Math.max(A.bounds[0], B.bounds[0])
      const overlapY = Math.min(A.bounds[3], B.bounds[3]) - Math.max(A.bounds[1], B.bounds[1])
      expect(overlapX > 1e-6 && overlapY > 1e-6).toBe(false)
    })

    it('grows sideways with the same guarantees', () => {
      const r = layered({ at: point(0, 0), grow: 'right', coordinates: mode })
        .node('in', { width: 40, height: 24 })
        .node('m1', { width: 40, height: 24 })
        .node('m2', { width: 40, height: 24 })
        .node('out', { width: 40, height: 24 })
        .edge('in', 'm1')
        .edge('m1', 'm2')
        .edge('m2', 'out')
        .cluster('mid', ['m1', 'm2'])
        .build()
      const c = r.getCluster('mid')!
      expect(contains(c.bounds, r.getNode('m1')!)).toBe(true)
      expect(contains(c.bounds, r.getNode('m2')!)).toBe(true)
      expect(contains(c.bounds, r.getNode('in')!)).toBe(false)
      expect(contains(c.bounds, r.getNode('out')!)).toBe(false)
    })
  })

  it('exposes the box as a renderable rectangle and carries the label', () => {
    const c = pipeline('gansner').getCluster('core')!
    expect(c.label).toBe('core')
    expect(c.rect.type).toBe('rectangle')
    expect(c.rect.bounds[0]).toBeCloseTo(c.bounds[0], 6)
    expect(c.rect.bounds[3]).toBeCloseTo(c.bounds[3], 6)
    expect(c.nodes.map((n) => n.name)).toEqual(['parse', 'check', 'emit'])
  })

  it('grows the layout bounds to include the boxes', () => {
    const r = pipeline('gansner')
    const c = r.getCluster('core')!
    expect(r.bounds[0]).toBeLessThanOrEqual(c.bounds[0] + 1e-6)
    expect(r.bounds[3]).toBeGreaterThanOrEqual(c.bounds[3] - 1e-6)
  })

  it('reports no clusters when none are declared', () => {
    const plain = layered({ at: point(0, 0), grow: 'down' })
      .node('a', { width: 40, height: 24 })
      .node('b', { width: 40, height: 24 })
      .edge('a', 'b')
      .build()
    expect(plain.clusters).toEqual([])
    expect(plain.getCluster('c')).toBeUndefined()
  })

  it('may reshape the layout it constrains, but stays consistent', () => {
    // A cluster is a constraint, so it is allowed to move nodes — the
    // border chains add structure the unconstrained layout did not have.
    // What must hold is that the result is still a valid drawing.
    const r = layered({ at: point(0, 0), grow: 'down' })
      .node('a', { width: 40, height: 24 })
      .node('b', { width: 60, height: 24 })
      .node('c', { width: 40, height: 24 })
      .edge('a', 'b')
      .edge('a', 'c')
      .cluster('all', ['a', 'b', 'c'])
      .build()

    const box = r.getCluster('all')!.bounds
    // Origin anchors the box, since the box is content too.
    expect(box[0]).toBeCloseTo(0, 6)
    for (const n of r.nodes) expect(contains(box, n)).toBe(true)

    // Padding is exact on the tight sides.
    const left = Math.min(...r.nodes.map((n) => n.bounds[0]))
    const right = Math.max(...r.nodes.map((n) => n.bounds[2]))
    expect(left - box[0]).toBeCloseTo(12, 6)
    expect(box[2] - right).toBeCloseTo(12, 6)

    // Same-rank nodes still do not overlap.
    for (let lvl = 0; lvl < r.levelCount; lvl++) {
      const row = r.level(lvl).slice().sort((x, y) => x.center.x - y.center.x)
      for (let i = 1; i < row.length; i++) {
        expect(row[i]!.bounds[0]).toBeGreaterThanOrEqual(row[i - 1]!.bounds[2] - 1e-6)
      }
    }
  })

  describe('validation', () => {
    const base = () =>
      layered({ at: point(0, 0) })
        .node('a', { width: 20, height: 20 })
        .node('b', { width: 20, height: 20 })

    it('rejects a duplicate cluster name', () => {
      expect(() => base().cluster('c', ['a']).cluster('c', ['b'])).toThrow(/duplicate cluster/)
    })

    it('rejects an unknown member', () => {
      expect(() => base().cluster('c', ['nope'])).toThrow(/unknown node "nope"/)
    })

    it('rejects a node claimed by two clusters', () => {
      expect(() => base().cluster('c1', ['a']).cluster('c2', ['a'])).toThrow(
        /already in cluster "c1"/
      )
    })
  })
})
