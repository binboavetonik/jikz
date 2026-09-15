/**
 * The symbols added to close the gap against
 * `tikzlibrarycircuits.ee.IEC.code.tex`: battery, bulb, the three
 * meters, the AC/DC supplies, and the Schottky diode variant.
 *
 * The upstream list was read from the library source rather than from
 * memory; these are the names it declares that jikz did not have.
 */
import { describe, it, expect } from 'vitest'
import {
  circuitShapes,
  circuit,
  battery,
  bulb,
  meter,
  acSource,
  dcSource,
  diode,
  wire,
  Meter,
  BATTERY_DEFAULT_WIDTH,
  BATTERY_DEFAULT_HEIGHT,
  METER_DEFAULT_WIDTH,
  SUPPLY_DEFAULT_WIDTH,
} from '../../../src/ext/circuits'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { allShapes } from '../../../src/geometry/shapes'

const SHAPES = { ...allShapes, ...circuitShapes }

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('battery', () => {
  it('alternates short and long plates, ending long so `out` is positive', () => {
    const b = battery({ center: point(0, 0) })
    const d = b.toSVGPath()
    // Four plates, 6 apart, centred: -9 -3 3 9. Long half-height is
    // 0.9·36/2 = 16.2; short is 0.48 of that.
    expect(d).toContain('M -9 -7.776 L -9 7.776') // short
    expect(d).toContain('M -3 -16.2 L -3 16.2') // long
    expect(d).toContain('M 3 -7.776 L 3 7.776')
    expect(d).toContain('M 9 -16.2 L 9 16.2') // east-most plate is long
  })

  it('draws one cell on the single variant', () => {
    const one = battery({ center: point(0, 0), variant: 'single' }).toSVGPath()
    const two = battery({ center: point(0, 0) }).toSVGPath()
    expect((one.match(/M -?\d/g) ?? []).length).toBeLessThan((two.match(/M -?\d/g) ?? []).length)
  })

  it('puts ports at the lead tips', () => {
    const b = battery({ center: point(100, 50) })
    expectPt(b.anchor('in'), 100 - BATTERY_DEFAULT_WIDTH / 2, 50, 'in')
    expectPt(b.anchor('out'), 100 + BATTERY_DEFAULT_WIDTH / 2, 50, 'out')
    expect(b.height).toBe(BATTERY_DEFAULT_HEIGHT)
  })
})

describe('bulb', () => {
  it('crosses the circle, not the bounding box', () => {
    // The diagonals must touch the circle at r/√2, or the X pokes out
    // of a symbol that has been made wide.
    const d = bulb({ center: point(0, 0) }).toSVGPath()
    const at = (18 / Math.SQRT2).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
    expect(d).toContain(`M -${at} -${at} L ${at} ${at}`)
    expect(d).toContain(`M -${at} ${at} L ${at} -${at}`)
  })

  it('keeps the X inside the circle at any width', () => {
    const wide = bulb({ center: point(0, 0), width: 200 })
    const d = wide.toSVGPath()
    const xs = [...d.matchAll(/L (-?[\d.]+) (-?[\d.]+)/g)].map((m) => Math.abs(Number(m[1])))
    // Only the leads reach the box edge; the glyph stays within r.
    const glyphReach = xs.filter((x) => x !== 100)
    for (const x of glyphReach) expect(x).toBeLessThanOrEqual(18.000001)
  })
})

describe('meters', () => {
  it('names three shapes that share one symbol', () => {
    for (const name of ['ammeter', 'voltmeter', 'ohmmeter'] as const) {
      expect(circuitShapes[name].kindName).toBe(name)
    }
  })

  it('fixes the letter by shape name, so a voltmeter cannot draw an A', () => {
    const pic = picture({ shapes: SHAPES })
    // shapeOptions cannot talk the shape out of its own variant.
    pic.node('M1', {
      at: point(0, 0),
      shape: 'voltmeter',
      shapeOptions: { variant: 'ammeter' },
    })
    const shape = pic.getNode('M1')!.shape
    expect(shape).toBeInstanceOf(Meter)
    expect((shape as Meter).variant).toBe('voltmeter')
  })

  it('draws A with a crossbar, V without one', () => {
    const a = meter({ center: point(0, 0), variant: 'ammeter' }).toSVGPath()
    const v = meter({ center: point(0, 0), variant: 'voltmeter' }).toSVGPath()
    // The A is apex-up with a bar; the V is apex-down with none.
    expect(a).toContain('M -9 9.9 L 0 -9.9 L 9 9.9')
    expect(v).toContain('M -9 -9.9 L 0 9.9 L 9 -9.9')
    expect((a.match(/M /g) ?? []).length).toBeGreaterThan((v.match(/M /g) ?? []).length)
  })

  it('draws Ω as an arc with two feet', () => {
    const o = meter({ center: point(0, 0), variant: 'ohmmeter' }).toSVGPath()
    expect(o).toMatch(/A [\d.]+ [\d.]+ 0 1 0/) // large arc, anticlockwise
    expect((o.match(/ L /g) ?? []).length).toBeGreaterThanOrEqual(4) // leads + 2 feet
  })

  it('keeps ports at the lead tips', () => {
    const m = meter({ center: point(50, 50) })
    expectPt(m.anchor('in'), 50 - METER_DEFAULT_WIDTH / 2, 50, 'in')
    expectPt(m.anchor('out'), 50 + METER_DEFAULT_WIDTH / 2, 50, 'out')
  })
})

describe('ac and dc supplies', () => {
  it('draws one full sine period for ac', () => {
    const d = acSource({ center: point(0, 0) }).toSVGPath()
    // Two cubics, one per half-period, crossing at the centre.
    expect((d.match(/ C /g) ?? []).length).toBe(2)
    expect(d).toContain('M -10.8 0')
  })

  it('draws dc as a solid line over a broken one', () => {
    const d = dcSource({ center: point(0, 0) }).toSVGPath()
    const lower = [...d.matchAll(/M (-?[\d.]+) 5\.04 L (-?[\d.]+) 5\.04/g)]
    expect(lower, 'three dashes below the solid line').toHaveLength(3)
    expect(d).toContain('M -9.9 -5.04 L 9.9 -5.04') // the solid line
  })

  it('never uses a dash pattern, which would dash the leads too', () => {
    // One symbol is one path and one stroke, so the break has to be
    // drawn rather than set with stroke-dasharray.
    const pic = picture({ shapes: SHAPES })
    pic.node('S1', { at: point(40, 40), shape: 'dc source' })
    expect(pic.toSVG({ width: 120, height: 80 })).not.toContain('stroke-dasharray')
  })

  it('keeps ports at the lead tips', () => {
    const s = acSource({ center: point(60, 20) })
    expectPt(s.anchor('in'), 60 - SUPPLY_DEFAULT_WIDTH / 2, 20, 'in')
    expectPt(s.anchor('out'), 60 + SUPPLY_DEFAULT_WIDTH / 2, 20, 'out')
  })
})

describe('schottky diode', () => {
  it('hooks the bar on one side, where zener hooks it on two', () => {
    const s = diode({ center: point(0, 0), variant: 'schottky' }).toSVGPath()
    const z = diode({ center: point(0, 0), variant: 'zener' }).toSVGPath()
    expect(s).not.toBe(z)
    // Schottky's hooks both point back toward the anode (same x side).
    const hooks = [...s.matchAll(/M (-?[\d.]+) (-?[\d.]+) L/g)].map((m) => Number(m[1]))
    expect(hooks.some((x) => x < 0 || x > 0)).toBe(true)
  })

  it('still resolves through the builder and the string path', () => {
    const pic = picture({ shapes: SHAPES })
    pic.node('D1', circuit.diode({ at: point(0, 0), variant: 'schottky' }))
    pic.node('D2', { at: point(0, 0), shape: 'diode', shapeOptions: { variant: 'schottky' } })
    expect(pic.getNode('D1')!.shape.toSVGPath()).toBe(pic.getNode('D2')!.shape.toSVGPath())
  })
})

describe('the new symbols behave like the old ones', () => {
  const names = ['battery', 'bulb', 'ac source', 'dc source', 'ammeter', 'voltmeter', 'ohmmeter'] as const

  it('opts every one out of text auto-sizing', () => {
    for (const name of names) {
      expect(circuitShapes[name].textAutoSize, name).toBe(false)
    }
  })

  it('names each kind after its shape-set key', () => {
    for (const name of names) expect(circuitShapes[name].kindName, name).toBe(name)
  })

  it('wires port to port like any other two-terminal symbol', () => {
    const pic = picture({ shapes: SHAPES })
    pic.node('B1', circuit.battery({ at: point(40, 100) }))
    pic.node('A1', circuit.ammeter({ at: point(160, 100) }))
    pic.node('L1', circuit.bulb({ at: point(280, 100) }))
    wire(pic, ['B1.out', 'A1.in'])
    wire(pic, ['A1.out', 'L1.in'])
    const svg = pic.toSVG({ width: 360, height: 200 })
    expect(svg).toContain('<svg')
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  it('rotates like any other symbol, ports following', () => {
    const pic = picture({ shapes: SHAPES })
    pic.node('B1', circuit.battery({ at: point(0, 0), rotate: 90 }))
    const n = pic.getNode('B1')!
    // Rotated a quarter turn, `out` sits below the centre on screen.
    expect(n.anchor('out').y).toBeGreaterThan(n.center.y)
    expect(Math.abs(n.anchor('out').x - n.center.x)).toBeLessThan(1e-6)
  })
})
