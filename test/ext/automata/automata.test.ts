/**
 * Automata extension — pinned against `tikzlibraryautomata.code.tex`,
 * whose states are \tikzset styles over circle / circle split, whose
 * `accepting` is the `double` border, and whose `initial` is an edge
 * drawn to the state from `initial distance` away.
 */
import { describe, it, expect } from 'vitest'
import {
  automataShapes,
  automata,
  initialArrow,
  DoubleCircle,
  DOUBLE_DISTANCE,
  DOUBLE_SEPARATION_DEFAULT,
  STATE_MIN_SIZE,
  INITIAL_DISTANCE_DEFAULT,
  INITIAL_TEXT_DEFAULT,
} from '../../../src/ext/automata'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('TikZ defaults', () => {
  it('carries minimum size=2.5em as 25, em being exact at 10pt', () => {
    expect(STATE_MIN_SIZE).toBe(25)
    const pic = picture({ shapes: automataShapes })
    pic.node('q', automata.state({ at: point(0, 0), text: 'q' }))
    expect(pic.getNode('q')!.shape.width).toBeGreaterThanOrEqual(25)
  })

  it('carries double distance=0.6 and separates by it plus the line width', () => {
    expect(DOUBLE_DISTANCE).toBe(0.6)
    expect(DOUBLE_SEPARATION_DEFAULT).toBeCloseTo(1.6, 6)
  })

  it('carries initial text=start and initial distance=3ex', () => {
    expect(INITIAL_TEXT_DEFAULT).toBe('start')
    expect(INITIAL_DISTANCE_DEFAULT).toBe(13)
  })
})

describe('automataShapes', () => {
  it('names each kind and lets every state size to its text', () => {
    for (const [name, kind] of Object.entries(automataShapes)) {
      expect(kind.kindName).toBe(name)
      expect(kind.textAutoSize).toBe(true)
    }
  })

  it('resolves by name once handed to a picture', () => {
    const pic = picture({ shapes: automataShapes })
    pic.node('q0', { at: point(0, 0), shape: 'state', width: 50, height: 50 })
    pic.node('q1', { at: point(100, 0), shape: 'accepting', width: 50, height: 50 })
    expect(pic.getNode('q0')!.shape.type).toBe('circle')
    expect(pic.getNode('q1')!.shape.type).toBe('double circle')
  })
})

describe('DoubleCircle', () => {
  const dc = new DoubleCircle({ center: { x: 0, y: 0 }, width: 50, height: 50 })

  it('keeps the nominal circle the size a plain state would be', () => {
    // TikZ's `double` thickens the stroke on the node's own path; the
    // node is not made bigger, so minimum size still means this circle.
    expect(dc.radius).toBe(25)
  })

  it('straddles that path with the two rings', () => {
    expect(dc.outerRadius).toBeCloseTo(25 + 0.8, 6)
    expect(dc.innerRadius).toBeCloseTo(25 - 0.8, 6)
    expect(dc.outerRadius - dc.innerRadius).toBeCloseTo(DOUBLE_SEPARATION_DEFAULT, 6)
  })

  it('anchors on the outer ring, which is what accepting outer sep buys', () => {
    expectPt(dc.anchor('east'), 25.8, 0, 'east')
    expectPt(dc.boundaryPoint(0), 25.8, 0, 'boundary 0')
    expect(dc.width).toBeCloseTo(51.6, 6)
    expect(dc.bounds).toEqual([-25.8, -25.8, 25.8, 25.8])
  })

  it('emits both rings as one path, wound alike so the disc fills', () => {
    const d = dc.toSVGPath()
    const arcs = d.match(/A /g) ?? []
    expect(arcs).toHaveLength(4) // two half-arcs per ring
    expect(d.match(/M /g)).toHaveLength(2)
    // Same sweep flag on every arc → nonzero fills solid, no hole.
    expect(d.match(/A 25.8 25.8 0 1 0/g)).toHaveLength(2)
    expect(d.match(/A 24.2 24.2 0 1 0/g)).toHaveLength(2)
  })

  it('takes a custom separation', () => {
    const wide = new DoubleCircle({ width: 50, height: 50, separation: 6 })
    expect(wide.outerRadius).toBe(28)
    expect(wide.innerRadius).toBe(22)
  })

  it('collapses the inner ring rather than inverting it', () => {
    // The shape floors on minWidth/minHeight (20 by default), so the
    // guard only comes into play once those are lifted too.
    const tiny = new DoubleCircle({
      width: 2,
      height: 2,
      minWidth: 0,
      minHeight: 0,
      separation: 10,
    })
    expect(tiny.radius).toBe(1)
    expect(tiny.innerRadius).toBe(0)
  })

  it('round-trips through moveTo and resize', () => {
    const moved = dc.moveTo({ x: 100, y: 40 })
    expectPt(moved.center, 100, 40, 'moved')
    expect(moved.radius).toBe(dc.radius)
    expect(moved.separation).toBe(dc.separation)

    const sized = dc.resize(100, 100)
    expect(sized.outerRadius).toBeCloseTo(50, 6)
  })
})

describe('initialArrow', () => {
  const pic = picture({ shapes: automataShapes })
  pic.node('q0', automata.state({ at: point(80, 110), width: 50, height: 50 }))
  const q0 = pic.getNode('q0')!

  it('starts initial distance beyond the west side by default', () => {
    // TikZ: initial angle 180, anchor east, distance 3ex, text "start".
    const start = initialArrow(q0)
    expectPt(start.from, 80 - 25 - 13, 110, 'from')
    expect(start.text).toBe('start')
    expect(start.textPlacement).toBe('west')
  })

  it('maps TikZ y-up wheres onto jikz screen directions', () => {
    // TikZ initial where=above is angle 90 with y up; on screen that is
    // north, i.e. a smaller y.
    expect(initialArrow(q0, { where: 'above' }).from.y).toBeLessThan(110)
    expect(initialArrow(q0, { where: 'below' }).from.y).toBeGreaterThan(110)
    expect(initialArrow(q0, { where: 'right' }).from.x).toBeGreaterThan(80)
    expect(initialArrow(q0, { where: 'left' }).from.x).toBeLessThan(80)
  })

  it('takes a custom distance and text', () => {
    const s = initialArrow(q0, { where: 'right', distance: 40, text: 'begin' })
    expectPt(s.from, 80 + 25 + 40, 110, 'from')
    expect(s.text).toBe('begin')
    expect(s.textPlacement).toBe('east')
  })

  it('leaves from the outer ring on an accepting state', () => {
    const p = picture({ shapes: automataShapes })
    p.node('f', automata.accepting({ at: point(0, 0), width: 50, height: 50 }))
    const s = initialArrow(p.getNode('f')!, { where: 'right' })
    expectPt(s.from, 25.8 + 13, 0, 'from')
  })

  it('feeds edge() directly, which clips to the state boundary', () => {
    const p = picture({ shapes: automataShapes })
    p.node('q0', automata.state({ at: point(80, 110), width: 50, height: 50 }))
    const start = initialArrow(p.getNode('q0')!)
    const svg = p
      .edge(start.from, 'q0', { arrowEnd: 'stealth' })
      .toSVG({ width: 200, height: 200 })
    expect(svg).toContain('marker-end')
  })
})

describe('automata builders', () => {
  it('applies the minimum size floor and passes separation through', () => {
    expect(automata.state().minWidth).toBe(STATE_MIN_SIZE)
    expect(automata.accepting().minHeight).toBe(STATE_MIN_SIZE)
    expect(automata.accepting({ separation: 5 }).shapeOptions).toEqual({ separation: 5 })
    expect(automata.accepting().shapeOptions).toBeUndefined()
  })

  it('lets an explicit minimum win over the TikZ floor', () => {
    expect(automata.state({ minWidth: 60 }).minWidth).toBe(60)
  })

  it('builds a split circle for state with output', () => {
    const pic = picture({ shapes: automataShapes })
    pic.node('q', automata.stateWithOutput({ at: point(0, 0), width: 50, height: 50 }))
    expect(pic.getNode('q')!.shape.type).toBe('circle split')
  })
})
