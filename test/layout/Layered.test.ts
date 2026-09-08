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

  it('throws on cyclic input (cycle handling lands later)', () => {
    expect(() =>
      layered()
        .node('A')
        .node('B')
        .edge('A', 'B')
        .edge('B', 'A')
        .build(),
    ).toThrow(/cycle/)
  })
})
