/** `right=of A` inside the picture: PlacementOptions on pic.node. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { basicShapes } from '../../src/geometry/shapes/basic'

describe('relative placement', () => {
  const base = () =>
    picture({ shapes: basicShapes }).node('A', {
      at: point(100, 100),
      shape: 'rectangle',
      width: 40,
      height: 20,
    })

  it('rightOf puts the new node border-to-border to the right', () => {
    const pic = base().node('B', { rightOf: 'A', distance: 30, shape: 'rectangle', width: 20, height: 20 })
    // A's east edge at x=120, gap 30, B's half-width 10 → centre 160.
    expect(pic.resolve('B').x).toBeCloseTo(160)
    expect(pic.resolve('B').y).toBeCloseTo(100)
  })

  it('above/below/leftOf and the diagonals follow the compass', () => {
    const pic = base()
      .node('U', { above: 'A', distance: 10, shape: 'rectangle', width: 20, height: 20 })
      .node('D', { below: 'A', distance: 10, shape: 'rectangle', width: 20, height: 20 })
      .node('L', { leftOf: 'A', distance: 10, shape: 'rectangle', width: 20, height: 20 })
      .node('NE', { aboveRight: 'A', distance: 10, shape: 'rectangle', width: 20, height: 20 })
    expect(pic.resolve('U').y).toBeCloseTo(100 - 10 - 10 - 10)
    expect(pic.resolve('D').y).toBeCloseTo(100 + 10 + 10 + 10)
    expect(pic.resolve('L').x).toBeCloseTo(100 - 20 - 10 - 10)
    expect(pic.resolve('NE').x).toBeCloseTo(120 + 10 + 10)
    expect(pic.resolve('NE').y).toBeCloseTo(90 - 10 - 10)
  })

  it('the default gap is 10 and the reference may be a coordinate or a point', () => {
    const pic = base()
      .coordinate('P', point(0, 0))
      .node('C', { rightOf: 'P', shape: 'rectangle', width: 20, height: 20 })
      .node('Q', { below: point(300, 300), shape: 'rectangle', width: 20, height: 20 })
    expect(pic.resolve('C').x).toBeCloseTo(0 + 10 + 10)
    expect(pic.resolve('Q').y).toBeCloseTo(300 + 10 + 10)
  })

  it('placement keys never reach the Node or the renderer', () => {
    const pic = base().node('B', { rightOf: 'A', shape: 'rectangle', width: 20, height: 20, text: 'B' })
    const svg = pic.toSVG({ width: 300, height: 200 })
    expect(svg).not.toContain('rightOf')
    expect(pic.getNode('B')!.text).toBe('B')
  })

  it('a chain of placements needs no coordinates past the seed', () => {
    const pic = base()
      .node('B', { rightOf: 'A', shape: 'rectangle', width: 20, height: 20 })
      .node('C', { rightOf: 'B', shape: 'rectangle', width: 20, height: 20 })
      .edge('A', 'C', { arrowEnd: 'stealth' })
    expect(pic.resolve('C').x).toBeGreaterThan(pic.resolve('B').x)
    expect(pic.toSVG({ fit: true })).toContain('marker-end')
  })
})
