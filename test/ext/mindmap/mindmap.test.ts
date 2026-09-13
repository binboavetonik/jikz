/**
 * Mind maps — pinned against `tikzlibrarymindmap.code.tex`: the
 * `circle connection bar` decoration's three states, and the level
 * tables of `mindmap` and `small mindmap`.
 */
import { describe, it, expect } from 'vitest'
import {
  mindmap,
  circleConnectionBar,
  conceptLevels,
  smallConceptLevels,
  CONCEPT_COLOR_DEFAULT,
  MINDMAP_START_ANGLE_DEFAULT,
  CONNECTION_ANGLE_DEFAULT,
  AMPLITUDE_RATIO,
} from '../../../src/ext/mindmap'
import { point } from '../../../src/core/Point'

const CM = 72.27 / 2.54

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('PGF decoration constants', () => {
  it('carries /pgf/decoration/angle=20 and the 0.175 amplitude ratio', () => {
    expect(CONNECTION_ANGLE_DEFAULT).toBe(20)
    expect(AMPLITUDE_RATIO).toBe(0.175)
  })
})

describe('circleConnectionBar', () => {
  const bar = circleConnectionBar(point(0, 0), 40, point(200, 0), 20)

  it('emits the decoration\'s three closed states', () => {
    // initial cap, bar, end cap — each closed, as PGF declares them.
    const d = bar.toSVGPath()
    expect(d.match(/M /g)).toHaveLength(3)
    expect(d.match(/Z/g)).toHaveLength(3)
  })

  it('spans rim to rim, each cap flaring out to 1.5r', () => {
    const [minX, , maxX] = bar.bounds
    // Leftmost point is on the start rim at the decoration angle.
    expect(minX).toBeCloseTo(40 * Math.cos((20 * Math.PI) / 180), 6)
    expect(maxX).toBeCloseTo(200 - 20 * Math.cos((20 * Math.PI) / 180), 6)
  })

  it('reaches the rim at plus and minus the decoration angle', () => {
    const [, minY, , maxY] = bar.bounds
    const rim = 40 * Math.sin((20 * Math.PI) / 180)
    expect(maxY).toBeCloseTo(rim, 6)
    expect(minY).toBeCloseTo(-rim, 6)
  })

  it('takes its height from the smaller circle', () => {
    // \tikz@compute@segmentamplitude: .175 * min(start, end) radius.
    // The bar rectangle is the second subpath; its first corner sits at
    // -amplitude/2, so read the amplitude straight off it.
    const barAmplitude = (p: ReturnType<typeof circleConnectionBar>) => {
      const moves = p.segments.filter((seg) => seg.type === 'M')
      return Math.abs(moves[1]!.points[0]!.y) * 2
    }
    expect(barAmplitude(circleConnectionBar(point(0, 0), 40, point(300, 0), 20)))
      .toBeCloseTo(AMPLITUDE_RATIO * 20, 6)
    expect(barAmplitude(circleConnectionBar(point(0, 0), 20, point(300, 0), 40)))
      .toBeCloseTo(AMPLITUDE_RATIO * 20, 6)
    expect(barAmplitude(circleConnectionBar(point(0, 0), 40, point(300, 0), 40)))
      .toBeCloseTo(AMPLITUDE_RATIO * 40, 6)
  })

  it('is symmetric about the line joining the centres', () => {
    const [, minY, , maxY] = bar.bounds
    expect(minY + maxY).toBeCloseTo(0, 9)
  })

  it('follows the centres at any angle', () => {
    const diagonal = circleConnectionBar(point(10, 10), 20, point(110, 110), 20)
    const [minX, minY, maxX, maxY] = diagonal.bounds
    // Centred on the midpoint of the two centres.
    expect((minX + maxX) / 2).toBeCloseTo(60, 6)
    expect((minY + maxY) / 2).toBeCloseTo(60, 6)
  })

  it('gives up only once the circles actually overlap', () => {
    expect(circleConnectionBar(point(0, 0), 40, point(70, 0), 40).isEmpty).toBe(true)
    expect(circleConnectionBar(point(0, 0), 40, point(0, 0), 40).isEmpty).toBe(true)
  })

  it('keeps both flares when they crowd, dropping only the straight bar', () => {
    // TikZ's own `small mindmap` level 1 lands here: the level distance
    // is a shade under 1.5r + 1.5r, where PGF's bar would go negative.
    const crowded = circleConnectionBar(point(0, 0), 32.7, point(79.7, 0), 21.3)
    expect(crowded.isEmpty).toBe(false)
    expect(crowded.toSVGPath().match(/M /g)).toHaveLength(2) // two caps, no bar
    const roomy = circleConnectionBar(point(0, 0), 32.7, point(200, 0), 21.3)
    expect(roomy.toSVGPath().match(/M /g)).toHaveLength(3)
  })

  it('takes an explicit angle and amplitude', () => {
    const wide = circleConnectionBar(point(0, 0), 40, point(200, 0), 20, {
      angle: 45,
      amplitude: 20,
    })
    const [, minY, , maxY] = wide.bounds
    expect(maxY).toBeCloseTo(40 * Math.sin(Math.PI / 4), 6)
    expect(minY + maxY).toBeCloseTo(0, 9)
  })
})

describe('level tables', () => {
  it('matches TikZ\'s mindmap sizes, converted from cm', () => {
    expect(conceptLevels[0]!.size).toBeCloseTo(4 * CM, 6) // root concept
    expect(conceptLevels[1]!.size).toBeCloseTo(2.25 * CM, 6)
    expect(conceptLevels[1]!.distance).toBeCloseTo(5 * CM, 6)
    expect(conceptLevels[2]!.distance).toBeCloseTo(2.9 * CM, 6)
    expect(conceptLevels[3]!.size).toBeCloseTo(1.15 * CM, 6)
    expect(conceptLevels[4]!.size).toBeCloseTo(0.9 * CM, 6)
  })

  it('matches its sibling angles: 60, 60, 30, 30', () => {
    expect(conceptLevels.map((l) => l.siblingAngle)).toEqual([undefined, 60, 60, 30, 30])
  })

  it('matches small mindmap, whose level 1 spreads wider', () => {
    expect(smallConceptLevels[0]!.size).toBeCloseTo(2.3 * CM, 6)
    expect(smallConceptLevels[1]!.siblingAngle).toBe(75)
    expect(smallConceptLevels[2]!.siblingAngle).toBe(60)
    expect(smallConceptLevels[3]!.siblingAngle).toBe(30)
  })
})

describe('layout', () => {
  it('puts the root where asked, sized by the root level', () => {
    const m = mindmap({ text: 'R' }, { at: point(100, 100) })
    expectPt(m.root.center, 100, 100, 'root')
    expect(m.root.radius).toBeCloseTo((4 * CM) / 2, 6)
    expect(m.root.level).toBe(0)
    expect(m.concepts).toHaveLength(1)
    expect(m.bars).toHaveLength(0)
  })

  it('spreads siblings by the level angle, centred on the start angle', () => {
    const m = mindmap(
      { children: [{}, {}, {}] },
      { at: point(0, 0), levels: smallConceptLevels, startAngle: 0 }
    )
    // Three children, sibling angle 75: -75, 0, +75.
    expect(m.root.children.map((c) => c.heading)).toEqual([-75, 0, 75])
  })

  it('defaults the first branch upward', () => {
    expect(MINDMAP_START_ANGLE_DEFAULT).toBe(-90)
    const m = mindmap({ children: [{}] })
    expect(m.root.children[0]!.heading).toBe(-90)
    expect(m.root.children[0]!.center.y).toBeLessThan(0)
  })

  it('places a child at the level distance along its heading', () => {
    const m = mindmap(
      { children: [{}] },
      { at: point(0, 0), levels: smallConceptLevels, startAngle: 0 }
    )
    expectPt(m.root.children[0]!.center, 2.8 * CM, 0, 'child')
  })

  it('lets a concept name its own direction, size and distance', () => {
    const m = mindmap(
      { children: [{ angle: 180, distance: 50, size: 10 }] },
      { at: point(0, 0) }
    )
    const kid = m.root.children[0]!
    expectPt(kid.center, -50, 0, 'kid')
    expect(kid.radius).toBe(5)
  })

  it('grows deeper levels outward from the parent', () => {
    const m = mindmap(
      { children: [{ angle: 0, children: [{}] }] },
      { at: point(0, 0), levels: smallConceptLevels }
    )
    const grandchild = m.root.children[0]!.children[0]!
    // A lone child carries straight on in the parent's direction.
    expect(grandchild.heading).toBe(0)
    expect(grandchild.center.x).toBeGreaterThan(m.root.children[0]!.center.x)
  })

  it('reuses the last level row once the table runs out', () => {
    const m = mindmap(
      { children: [{ children: [{ children: [{ children: [{ children: [{}] }] }] }] }] },
      { levels: smallConceptLevels }
    )
    const deepest = m.concepts[m.concepts.length - 1]!
    expect(deepest.level).toBe(5)
    expect(deepest.radius).toBeCloseTo(smallConceptLevels[3]!.size / 2, 6)
  })

  it('cascades the concept colour to descendants that name none', () => {
    const m = mindmap({
      color: '#111111',
      children: [{ color: '#222222', children: [{}] }, {}],
    })
    expect(m.root.color).toBe('#111111')
    expect(m.root.children[0]!.color).toBe('#222222')
    expect(m.root.children[0]!.children[0]!.color).toBe('#222222')
    expect(m.root.children[1]!.color).toBe('#111111')
  })

  it('falls back to black, as TikZ\'s concept color does', () => {
    expect(CONCEPT_COLOR_DEFAULT).toBe('#000000')
    expect(mindmap({}).root.color).toBe('#000000')
  })
})

describe('bars', () => {
  const tree = mindmap(
    { color: '#1d4ed8', children: [{ color: '#dc2626', children: [{}] }, {}] },
    { at: point(0, 0), levels: smallConceptLevels }
  )

  it('makes one per link', () => {
    expect(tree.bars).toHaveLength(3)
    expect(tree.concepts).toHaveLength(4)
  })

  it('orders them top-down, matching the concept order', () => {
    // Parents before children, so filling them in order paints top-down.
    expect(tree.bars.map((b) => b.from.level)).toEqual([0, 1, 0])
    expect(tree.concepts.map((c) => c.level)).toEqual([0, 1, 2, 1])
  })

  it('takes the child\'s concept colour, which is what TikZ fills with', () => {
    expect(tree.bars[0]!.color).toBe('#dc2626')
    expect(tree.bars[2]!.color).toBe('#1d4ed8')
  })

  it('joins the actual circles', () => {
    for (const bar of tree.bars) {
      expect(bar.path.isEmpty).toBe(false)
      const [minX, minY, maxX, maxY] = bar.path.bounds
      // The bar lies between the two centres.
      expect(minX).toBeLessThanOrEqual(Math.max(bar.from.center.x, bar.to.center.x))
      expect(maxX).toBeGreaterThanOrEqual(Math.min(bar.from.center.x, bar.to.center.x))
      expect(minY).toBeLessThanOrEqual(Math.max(bar.from.center.y, bar.to.center.y))
      expect(maxY).toBeGreaterThanOrEqual(Math.min(bar.from.center.y, bar.to.center.y))
    }
  })
})
