import { describe, it, expect } from 'vitest'
import { layered, type LayeredOptions, type LayeredResult } from '../../src/layout/Layered'
import { point } from '../../src/core/Point'
import type { Node } from '../../src/node/Node'

type Mode = NonNullable<LayeredOptions['coordinates']>
const MODES: Mode[] = ['gansner', 'brandes-koepf']

const encloses = (
  outer: readonly [number, number, number, number],
  inner: readonly [number, number, number, number],
  slack = 1e-6
): boolean =>
  outer[0] <= inner[0] + slack &&
  outer[1] <= inner[1] + slack &&
  outer[2] >= inner[2] - slack &&
  outer[3] >= inner[3] - slack

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

    it('nests a cluster inside another', () => {
      const r = layered({ at: point(0, 0), grow: 'down', coordinates: mode, clusterPadding: 10 })
        .node('in', { width: 50, height: 24 })
        .node('a', { width: 50, height: 24 })
        .node('b', { width: 50, height: 24 })
        .node('c', { width: 50, height: 24 })
        .node('out', { width: 50, height: 24 })
        .edge('in', 'a')
        .edge('a', 'b')
        .edge('b', 'c')
        .edge('c', 'out')
        .edge('in', 'out')
        .cluster('inner', ['a', 'b'])
        .cluster('outer', ['inner', 'c'])
        .build()

      const inner = r.getCluster('inner')!
      const outer = r.getCluster('outer')!

      expect(inner.depth).toBe(1)
      expect(inner.parent).toBe('outer')
      expect(outer.depth).toBe(0)
      expect(outer.parent).toBeUndefined()
      expect(outer.children).toEqual(['inner'])
      // `nodes` is transitive: the outer box owns the inner box's nodes.
      expect(outer.nodes.map((n) => n.name).sort()).toEqual(['a', 'b', 'c'])
      expect(inner.nodes.map((n) => n.name).sort()).toEqual(['a', 'b'])

      expect(encloses(outer.bounds, inner.bounds)).toBe(true)
      expect(contains(inner.bounds, r.getNode('a')!)).toBe(true)
      expect(contains(inner.bounds, r.getNode('c')!)).toBe(false)
      expect(contains(outer.bounds, r.getNode('c')!)).toBe(true)
      for (const outside of ['in', 'out']) {
        expect(contains(outer.bounds, r.getNode(outside)!)).toBe(false)
      }
    })

    it('keeps a bypass edge outside every nested box', () => {
      const r = layered({ at: point(0, 0), grow: 'down', coordinates: mode, clusterPadding: 10 })
        .node('in', { width: 50, height: 24 })
        .node('a', { width: 50, height: 24 })
        .node('b', { width: 50, height: 24 })
        .node('c', { width: 50, height: 24 })
        .node('out', { width: 50, height: 24 })
        .edge('in', 'a')
        .edge('a', 'b')
        .edge('b', 'c')
        .edge('c', 'out')
        .edge('in', 'out')
        .cluster('inner', ['a', 'b'])
        .cluster('outer', ['inner', 'c'])
        .build()
      const long = r.edges.find((e) => e.bendPoints.length > 0)!
      for (const cl of r.clusters) {
        for (const p of long.bendPoints) {
          const inside =
            p.x > cl.bounds[0] && p.x < cl.bounds[2] && p.y > cl.bounds[1] && p.y < cl.bounds[3]
          expect(inside).toBe(false)
        }
      }
    })

    it('nests three levels deep', () => {
      const r = layered({ at: point(0, 0), grow: 'down', coordinates: mode, clusterPadding: 8 })
        .node('n1', { width: 40, height: 20 })
        .node('n2', { width: 40, height: 20 })
        .node('n3', { width: 40, height: 20 })
        .node('n4', { width: 40, height: 20 })
        .edge('n1', 'n2')
        .edge('n2', 'n3')
        .edge('n3', 'n4')
        .cluster('L3', ['n2'])
        .cluster('L2', ['L3', 'n3'])
        .cluster('L1', ['L2', 'n4'])
        .build()

      const [L1, L2, L3] = ['L1', 'L2', 'L3'].map((n) => r.getCluster(n)!)
      expect([L1.depth, L2.depth, L3.depth]).toEqual([0, 1, 2])
      expect(encloses(L1.bounds, L2.bounds)).toBe(true)
      expect(encloses(L2.bounds, L3.bounds)).toBe(true)
      expect(contains(L1.bounds, r.getNode('n1')!)).toBe(false)
    })

    it('nests even when the inner cluster asks for more padding', () => {
      // A child with a bigger padding would poke out of its parent if
      // the parent only measured its own members.
      const r = layered({ at: point(0, 0), grow: 'down', coordinates: mode, clusterPadding: 4 })
        .node('a', { width: 40, height: 20 })
        .node('b', { width: 40, height: 20 })
        .edge('a', 'b')
        .cluster('inner', ['a'], { padding: 30 })
        .cluster('outer', ['inner', 'b'])
        .build()
      expect(encloses(r.getCluster('outer')!.bounds, r.getCluster('inner')!.bounds)).toBe(true)
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
      expect(() => base().cluster('c', ['nope'])).toThrow(
        /unknown node or cluster "nope"/
      )
    })

    it('rejects a node claimed by two clusters', () => {
      expect(() => base().cluster('c1', ['a']).cluster('c2', ['a'])).toThrow(
        /already in cluster "c1"/
      )
    })

    it('rejects a cluster nested in two parents', () => {
      expect(() =>
        base().cluster('leaf', ['a']).cluster('p1', ['leaf']).cluster('p2', ['leaf'])
      ).toThrow(/already in cluster "p1"/)
    })

    it('rejects a forward reference to a cluster', () => {
      expect(() => base().cluster('outer', ['inner'])).toThrow(
        /must be declared before/
      )
    })

    it('rejects a cluster named like a node', () => {
      expect(() => base().cluster('a', ['b'])).toThrow(/collides with a node/)
    })
  })

  describe('per-cluster grow', () => {
    /** down-flowing pipeline with a right-flowing stage in the middle */
    const staged = (grow: 'right' | 'up' = 'right') =>
      layered({ at: point(0, 0), grow: 'down', clusterPadding: 12 })
        .node('start', { width: 60, height: 24 })
        .node('a', { width: 50, height: 24 })
        .node('b', { width: 50, height: 24 })
        .node('c', { width: 50, height: 24 })
        .node('done', { width: 60, height: 24 })
        .edge('start', 'a')
        .edge('a', 'b')
        .edge('b', 'c')
        .edge('c', 'done')
        .cluster('stage', ['a', 'b', 'c'], { label: 'stage', grow })
        .build()

    it('lays the cluster out in its own direction', () => {
      const r = staged()
      const [a, b, c] = ['a', 'b', 'c'].map((n) => r.getNode(n)!)
      // Inside: left to right, one row.
      expect(a.center.y).toBeCloseTo(b.center.y, 6)
      expect(b.center.y).toBeCloseTo(c.center.y, 6)
      expect(a.center.x).toBeLessThan(b.center.x)
      expect(b.center.x).toBeLessThan(c.center.x)
      // Outside: still top to bottom.
      expect(r.getNode('start')!.center.y).toBeLessThan(a.center.y)
      expect(r.getNode('done')!.center.y).toBeGreaterThan(c.center.y)
    })

    it('boxes the cluster around exactly its own nodes', () => {
      const r = staged()
      const box = r.getCluster('stage')!.bounds
      for (const n of r.nodes) {
        expect(contains(box, n)).toBe(['a', 'b', 'c'].includes(n.name!))
      }
    })

    it('attaches crossing edges to the real nodes, not the placeholder', () => {
      const r = staged()
      const near = (p: { x: number; y: number }, n: Node) =>
        Math.abs(p.x - n.center.x) <= n.width / 2 + 2 &&
        Math.abs(p.y - n.center.y) <= n.height / 2 + 2
      const label = (p: { x: number; y: number }) =>
        r.nodes.find((n) => near(p, n))?.name ?? '?'
      const pairs = r.edges.map((e) => `${label(e.from)}->${label(e.to)}`).sort()
      expect(pairs).toEqual(['a->b', 'b->c', 'c->done', 'start->a'])
    })

    it('reports real adjacency across the boundary', () => {
      const r = staged()
      expect(r.outgoing(r.getNode('start')!).map((n) => n.name)).toEqual(['a'])
      expect(r.incoming(r.getNode('done')!).map((n) => n.name)).toEqual(['c'])
    })

    it('leaks no internal placeholder into the result', () => {
      const r = staged()
      const names = [
        ...r.nodes.map((n) => n.name),
        ...r.clusters.flatMap((c) => c.nodes.map((n) => n.name)),
        ...r.clusters.map((c) => c.name),
      ]
      expect(names.filter((n) => n?.startsWith('__'))).toEqual([])
      expect(r.getNode('__cluster__stage')).toBeUndefined()
    })

    it('reports the cluster as a single rank of the outer graph', () => {
      const r = staged()
      const levels = Array.from({ length: r.levelCount }, (_, i) =>
        r.level(i).map((n) => n.name).sort()
      )
      expect(levels).toContainEqual(['a', 'b', 'c'])
      expect(levels.every((l) => l.length > 0)).toBe(true)
    })

    it('honors a direction opposite the outer one', () => {
      const r = staged('up')
      const [a, c] = ['a', 'c'].map((n) => r.getNode(n)!)
      expect(a.center.y).toBeGreaterThan(c.center.y) // 'up' reverses the flow
      expect(contains(r.getCluster('stage')!.bounds, a)).toBe(true)
    })

    it('nests inside an ordinary cluster', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('s', { width: 40, height: 20 })
        .node('x', { width: 40, height: 20 })
        .node('y', { width: 40, height: 20 })
        .node('z', { width: 40, height: 20 })
        .edge('s', 'x')
        .edge('x', 'y')
        .edge('y', 'z')
        .cluster('inner', ['x', 'y'], { grow: 'right' })
        .cluster('outer', ['inner', 'z'])
        .build()

      const inner = r.getCluster('inner')!
      const outer = r.getCluster('outer')!
      expect(inner.depth).toBe(1)
      expect(inner.parent).toBe('outer')
      expect(encloses(outer.bounds, inner.bounds)).toBe(true)
      expect(outer.nodes.map((n) => n.name).sort()).toEqual(['x', 'y', 'z'])
      // The inner direction really took effect.
      expect(r.getNode('x')!.center.y).toBeCloseTo(r.getNode('y')!.center.y, 6)
    })

    it('contains an ordinary cluster', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('s', { width: 40, height: 20 })
        .node('p', { width: 40, height: 20 })
        .node('q', { width: 40, height: 20 })
        .edge('s', 'p')
        .edge('p', 'q')
        .cluster('deep', ['p', 'q'])
        .cluster('band', ['deep'], { grow: 'right' })
        .build()
      expect(encloses(r.getCluster('band')!.bounds, r.getCluster('deep')!.bounds)).toBe(true)
      expect(r.getNode('p')!.center.y).toBeCloseTo(r.getNode('q')!.center.y, 6)
    })

    it('nests one independently-grown cluster in another', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('s', { width: 40, height: 20 })
        .node('m', { width: 40, height: 20 })
        .node('n', { width: 40, height: 20 })
        .edge('s', 'm')
        .edge('m', 'n')
        .cluster('core', ['m', 'n'], { grow: 'down' })
        .cluster('band', ['core'], { grow: 'right' })
        .build()
      expect(encloses(r.getCluster('band')!.bounds, r.getCluster('core')!.bounds)).toBe(true)
      // 'core' keeps flowing down inside a right-flowing band.
      expect(r.getNode('m')!.center.x).toBeCloseTo(r.getNode('n')!.center.x, 6)
      expect(r.getNode('m')!.center.y).toBeLessThan(r.getNode('n')!.center.y)
    })

    it('keeps a self-edge inside the cluster', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('s', { width: 40, height: 20 })
        .node('p', { width: 40, height: 20 })
        .edge('s', 'p')
        .edge('p', 'p')
        .cluster('band', ['p'], { grow: 'right' })
        .build()
      expect(r.edges.some((e) => e.routing === 'bezier')).toBe(true)
    })

    it('grows the reported bounds to cover the sub-layout', () => {
      const r = staged()
      const box = r.getCluster('stage')!.bounds
      expect(r.bounds[0]).toBeLessThanOrEqual(box[0] + 1e-6)
      expect(r.bounds[2]).toBeGreaterThanOrEqual(box[2] - 1e-6)
      for (const n of r.nodes) {
        expect(r.bounds[0]).toBeLessThanOrEqual(n.bounds[0] + 1e-6)
        expect(r.bounds[2]).toBeGreaterThanOrEqual(n.bounds[2] - 1e-6)
      }
    })
  })


  describe('edges to a cluster', () => {
    /** Whether a point lies on the border of `box`. */
    const onBorder = (p: { x: number; y: number }, box: readonly number[]) => {
      const within =
        p.x >= box[0]! - 1e-6 && p.x <= box[2]! + 1e-6 &&
        p.y >= box[1]! - 1e-6 && p.y <= box[3]! + 1e-6
      const touching =
        Math.abs(p.x - box[0]!) < 1e-6 || Math.abs(p.x - box[2]!) < 1e-6 ||
        Math.abs(p.y - box[1]!) < 1e-6 || Math.abs(p.y - box[3]!) < 1e-6
      return within && touching
    }

    const svc = () =>
      layered({ at: point(0, 0), grow: 'down', clusterPadding: 12 })
        .node('client', { width: 60, height: 24 })
        .node('a', { width: 50, height: 24 })
        .node('b', { width: 50, height: 24 })
        .node('db', { width: 50, height: 24 })
        .edge('a', 'b')
        .edge('b', 'db')
        .cluster('svc', ['a', 'b'], { label: 'service' })
        .edge('client', 'svc')
        .build()

    it('stops at the box rather than at a member', () => {
      const r = svc()
      const box = r.getCluster('svc')!.bounds
      const e = r.edges[r.edges.length - 1]!
      expect(onBorder(e.to, box)).toBe(true)
      // Not the member the layout ranked against.
      expect(e.to.y).not.toBeCloseTo(r.getNode('a')!.bounds[1], 6)
    })

    it('ranks the cluster below the node pointing at it', () => {
      const r = svc()
      expect(r.getNode('client')!.center.y).toBeLessThan(r.getNode('a')!.center.y)
    })

    it('leaves ordinary edges out of a member alone', () => {
      const r = svc()
      // b → db is a node edge; it must start on b's own boundary.
      const e = r.edges.find(
        (x) => Math.abs(x.to.y - r.getNode('db')!.bounds[1]) < 1e-6
      )!
      expect(e.from.y).toBeCloseTo(r.getNode('b')!.bounds[3], 6)
    })

    it('joins two clusters box to box', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('a', { width: 50, height: 24 })
        .node('b', { width: 50, height: 24 })
        .node('x', { width: 50, height: 24 })
        .node('y', { width: 50, height: 24 })
        .edge('a', 'b')
        .edge('x', 'y')
        .cluster('A', ['a', 'b'])
        .cluster('X', ['x', 'y'])
        .edge('A', 'X')
        .build()
      const [A, X] = [r.getCluster('A')!, r.getCluster('X')!]
      const e = r.edges[r.edges.length - 1]!
      expect(onBorder(e.from, A.bounds)).toBe(true)
      expect(onBorder(e.to, X.bounds)).toBe(true)
    })

    it('leaves a cluster with its own grow attached to its box', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('client', { width: 60, height: 24 })
        .node('p', { width: 50, height: 24 })
        .node('q', { width: 50, height: 24 })
        .edge('p', 'q')
        .cluster('svc', ['p', 'q'], { grow: 'right' })
        .edge('client', 'svc')
        .build()

      const box = r.getCluster('svc')!.bounds
      const toBox = r.edges.filter((e) => onBorder(e.to, box))
      expect(toBox).toHaveLength(1)
      // …and the inner edge is not duplicated by the rebuild pass.
      expect(r.edges).toHaveLength(2)
      expect(r.getNode('p')!.center.y).toBeCloseTo(r.getNode('q')!.center.y, 6)
    })

    it('picks the cluster entry and exit as representatives', () => {
      const r = layered({ at: point(0, 0), grow: 'down' })
        .node('top', { width: 40, height: 20 })
        .node('m1', { width: 40, height: 20 })
        .node('m2', { width: 40, height: 20 })
        .node('bot', { width: 40, height: 20 })
        .edge('m1', 'm2')
        .cluster('c', ['m1', 'm2'])
        .edge('top', 'c')
        .edge('c', 'bot')
        .build()
      // Ranked against m1 on the way in and m2 on the way out, so the
      // whole cluster sits between the two outside nodes.
      expect(r.getNode('top')!.center.y).toBeLessThan(r.getNode('m1')!.center.y)
      expect(r.getNode('bot')!.center.y).toBeGreaterThan(r.getNode('m2')!.center.y)
    })

    describe('validation', () => {
      const base = () =>
        layered({ at: point(0, 0) })
          .node('a', { width: 20, height: 20 })
          .node('b', { width: 20, height: 20 })
          .node('out', { width: 20, height: 20 })
          .cluster('c', ['a', 'b'])

      it('rejects a cluster edging to itself', () => {
        expect(() => base().edge('c', 'c')).toThrow(/cannot edge to itself/)
      })

      it('rejects an edge between a cluster and a node inside it', () => {
        expect(() => base().edge('c', 'a')).toThrow(/which is inside it/)
      })

      it('rejects an edge between nested clusters', () => {
        expect(() =>
          layered({ at: point(0, 0) })
            .node('a', { width: 20, height: 20 })
            .node('b', { width: 20, height: 20 })
            .cluster('inner', ['a'])
            .cluster('outer', ['inner', 'b'])
            .edge('outer', 'inner')
        ).toThrow(/nested clusters/)
      })

      it('still rejects an unknown node', () => {
        expect(() => base().edge('c', 'nope')).toThrow(/unknown node "nope"/)
      })
    })
  })

})
