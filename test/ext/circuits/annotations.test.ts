/**
 * Voltage and current annotations — circuitikz's `v=`, `i=` and `f=`.
 *
 * The geometry that matters is the frame: a direction along the span
 * and a normal to one side of it, in screen space. Most of these tests
 * pin that, because everything else follows from it.
 */
import { describe, it, expect } from 'vitest'
import { circuitShapes, circuit, voltage, current, openTerminal, wire } from '../../../src/ext/circuits'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { allShapes } from '../../../src/geometry/shapes'

const SHAPES = { ...allShapes, ...circuitShapes }
const pic = () => picture({ shapes: SHAPES })

/**
 * Every straight annotation mark, as {x1,y1,x2,y2}. An edge between
 * two raw points renders as a two-command path, so the closing quote
 * in this pattern is what keeps braces — which have more commands —
 * out of the results.
 */
function lines(svg: string) {
  return [...svg.matchAll(/<path d="M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)"/g)].map((m) => ({
    x1: Number(m[1]),
    y1: Number(m[2]),
    x2: Number(m[3]),
    y2: Number(m[4]),
  }))
}

describe('the annotation frame', () => {
  it('puts `left` above an eastward span, as travel-left is on screen', () => {
    const p = pic()
    voltage(p, point(0, 100), point(100, 100), { distance: 20, inset: 0 })
    const [mark] = lines(p.toSVG({ width: 200, height: 200 }))
    // Screen space: smaller y is up, and left-of-travel for an
    // eastward segment is up.
    expect(mark!.y1).toBeCloseTo(80, 6)
    expect(mark!.y2).toBeCloseTo(80, 6)
  })

  it('puts `right` below it', () => {
    const p = pic()
    voltage(p, point(0, 100), point(100, 100), { side: 'right', distance: 20, inset: 0 })
    const [mark] = lines(p.toSVG({ width: 200, height: 200 }))
    expect(mark!.y1).toBeCloseTo(120, 6)
  })

  it('keeps the side relative to travel, not to the page', () => {
    // Reversing the span flips which way is "left" — the mark follows
    // the direction, as circuitikz's ^ and _ do.
    const east = pic()
    voltage(east, point(0, 100), point(100, 100), { distance: 20, inset: 0 })
    const west = pic()
    voltage(west, point(100, 100), point(0, 100), { distance: 20, inset: 0 })
    const a = lines(east.toSVG({ width: 200, height: 200 }))[0]!
    const b = lines(west.toSVG({ width: 200, height: 200 }))[0]!
    expect(a.y1).toBeCloseTo(80, 6)
    expect(b.y1).toBeCloseTo(120, 6)
  })

  it('works on a vertical span, where circuitikz needs `open`', () => {
    const p = pic()
    voltage(p, point(50, 0), point(50, 100), { distance: 20, inset: 0 })
    const [mark] = lines(p.toSVG({ width: 200, height: 200 }))
    // Travelling south, left-of-travel is east.
    expect(mark!.x1).toBeCloseTo(70, 6)
  })

  it('has nothing to draw across a zero-length span', () => {
    const p = pic()
    voltage(p, point(10, 10), point(10, 10), { label: 'x' })
    expect(p.items).toHaveLength(0)
  })
})

describe('voltage', () => {
  it('insets at both ends so the mark clears the terminals', () => {
    const p = pic()
    voltage(p, point(0, 0), point(100, 0), { inset: 10, distance: 0 })
    const [mark] = lines(p.toSVG({ width: 200, height: 200 }))
    expect(mark!.x1).toBeCloseTo(10, 6)
    expect(mark!.x2).toBeCloseTo(90, 6)
  })

  it('reverses the arrow without moving the mark', () => {
    const forward = pic()
    voltage(forward, point(0, 0), point(100, 0), { inset: 0, distance: 0 })
    const reverse = pic()
    voltage(reverse, point(0, 0), point(100, 0), { inset: 0, distance: 0, sense: 'reverse' })
    const f = lines(forward.toSVG({ width: 200, height: 100 }))[0]!
    const r = lines(reverse.toSVG({ width: 200, height: 100 }))[0]!
    expect([f.x1, f.x2]).toEqual([r.x2, r.x1])
  })

  it('draws a brace instead of an arrow when curly', () => {
    const p = pic()
    voltage(p, point(0, 0), point(100, 0), { curly: true, label: '$u$' })
    const svg = p.toSVG({ width: 200, height: 120 })
    expect(svg).toContain('<path') // the brace
    expect(svg).not.toContain('marker-end') // braces carry no tip
  })

  it('places the label beyond the mark, on the same side', () => {
    const p = pic()
    voltage(p, point(0, 100), point(100, 100), { label: 'u', distance: 20, labelDistance: 10 })
    const svg = p.toSVG({ width: 200, height: 200 })
    const y = Number(/<text[^>]*y="([-\d.]+)"/.exec(svg)![1])
    expect(y).toBeCloseTo(70, 6) // 100 − (20 + 10)
  })

  it('omits the text entirely when there is no label', () => {
    const p = pic()
    voltage(p, point(0, 0), point(100, 0))
    expect(p.toSVG({ width: 200, height: 100 })).not.toContain('<text')
  })
})

describe('current', () => {
  it('marks a direction rather than measuring a span', () => {
    const p = pic()
    current(p, point(0, 50), point(200, 50), { length: 20 })
    const [mark] = lines(p.toSVG({ width: 300, height: 100 }))
    // Centred on the span, 20 long — not 200.
    expect(mark!.x1).toBeCloseTo(90, 6)
    expect(mark!.x2).toBeCloseTo(110, 6)
  })

  it('sits on the wire by default, and off it for circuitikz `f=`', () => {
    const on = pic()
    current(on, point(0, 50), point(100, 50))
    const off = pic()
    current(off, point(0, 50), point(100, 50), { distance: 12 })
    expect(lines(on.toSVG({ width: 200, height: 100 }))[0]!.y1).toBeCloseTo(50, 6)
    expect(lines(off.toSVG({ width: 200, height: 100 }))[0]!.y1).toBeCloseTo(38, 6)
  })

  it('slides along the span with `pos`', () => {
    const p = pic()
    current(p, point(0, 50), point(200, 50), { length: 10, pos: 0.25 })
    const [mark] = lines(p.toSVG({ width: 300, height: 100 }))
    expect((mark!.x1 + mark!.x2) / 2).toBeCloseTo(50, 6)
  })

  it('carries an arrow tip', () => {
    const p = pic()
    current(p, point(0, 50), point(100, 50), { label: '$i_1$' })
    expect(p.toSVG({ width: 200, height: 100 })).toContain('marker-end')
  })
})

describe('annotating a real schematic', () => {
  it('spans ports by name', () => {
    const p = pic()
    p.node('R1', circuit.resistor({ at: point(100, 60) }))
    voltage(p, 'R1.in', 'R1.out', { label: '$u_R$' })
    current(p, 'R1.in', 'R1.out', { label: '$i$', side: 'right' })
    const svg = p.toSVG({ width: 240, height: 160 })
    expect(lines(svg)).toHaveLength(2)
    expect((svg.match(/foreignObject|<text/g) ?? []).length).toBe(2)
  })

  it('measures across an open pair, which is what circuitikz needs `open` for', () => {
    // No component, no placeholder bipole — just two terminals and the
    // voltage between them.
    const p = pic()
    const a = point(60, 40)
    const b = point(60, 120)
    p.draw(openTerminal(a))
    p.draw(openTerminal(b))
    voltage(p, a, b, { label: '$u^s_s$', curly: true })
    const svg = p.toSVG({ width: 200, height: 200 })
    expect((svg.match(/<circle/g) ?? []).length).toBe(2)
    expect(svg).toContain('<path')
  })

  it('takes a style for both the mark and its label', () => {
    const p = pic()
    voltage(p, point(0, 0), point(80, 0), { label: 'u', style: { stroke: '#dc2626' } })
    const svg = p.toSVG({ width: 160, height: 100 })
    // The label takes its colour from `stroke`, as bare text does.
    expect((svg.match(/#dc2626/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('returns the picture, so annotations chain like wires', () => {
    const p = pic()
    p.node('R1', circuit.resistor({ at: point(100, 60) }))
    expect(voltage(p, 'R1.in', 'R1.out')).toBe(p)
    expect(current(p, 'R1.in', 'R1.out')).toBe(p)
    expect(wire(p, ['R1.out', point(180, 60)])).toBe(p)
  })
})
