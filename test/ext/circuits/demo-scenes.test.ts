/**
 * Smoke tests mirroring the demo/index.html circuit cards — same scene
 * code, compiled headless via toSVG. Guards the examples users copy.
 */
import { describe, it, expect } from 'vitest'
import {
  circuitShapes,
  wire,
  junctionDot,
  circuit,
  resistor,
  opAmp,
} from '../../../src/ext/circuits'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { allShapes } from '../../../src/geometry/shapes'
const SHAPES = { ...allShapes, ...circuitShapes }

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('demo card: symbol gallery', () => {
  it('all 12 gallery cells render', () => {
    const pic = picture({ shapes: SHAPES })
    const cells = [
      circuit.resistor(),
      circuit.resistor({ variant: 'iec' }),
      circuit.capacitor(),
      circuit.inductor(),
      circuit.diode(),
      circuit.diode({ variant: 'zener' }),
      circuit.diode({ variant: 'led' }),
      circuit.switch(),
      circuit.voltageSource(),
      circuit.currentSource(),
      circuit.ground(),
      circuit.opAmp(),
    ]
    cells.forEach((options, i) => {
      pic.node('s' + i, {
        ...options,
        at: point(70 + (i % 4) * 120, 45 + Math.floor(i / 4) * 85),
      })
    })
    const svg = pic.toSVG({ width: 500, height: 280 })
    expect(svg.split('<path').length - 1).toBeGreaterThanOrEqual(12)
  })
})

describe('demo card: RC low-pass filter', () => {
  it('ports land where the card claims; scene renders', () => {
    const pic = picture({ shapes: SHAPES })
    pic.node('V1', circuit.voltageSource({ at: point(60, 120), rotate: 90 }))
    pic.node('R1', circuit.resistor({ at: point(140, 60) }))
    pic.node('C1', circuit.capacitor({ at: point(220, 120), rotate: 90 }))
    pic.node('G1', circuit.ground({ at: point(60, 180), anchor: 'in' }))
    pic.node('G2', circuit.ground({ at: point(220, 180), anchor: 'in' }))

    wire(pic, ['V1.in', point(60, 60), 'R1.in'])
    wire(pic, ['R1.out', point(220, 60), 'C1.in'])
    wire(pic, ['V1.out', point(60, 180)])
    wire(pic, ['C1.out', point(220, 180)])
    wire(pic, [point(60, 180), point(220, 180)])
    pic.fill(junctionDot(point(220, 60)))

    // Rotated ports: in → visual north, out → visual south.
    expectPt(pic.resolve('V1.in'), 60, 90, 'V1.in')
    expectPt(pic.resolve('V1.out'), 60, 150, 'V1.out')
    expectPt(pic.resolve('R1.out'), 170, 60, 'R1.out')
    expectPt(pic.resolve('C1.in'), 220, 90, 'C1.in')
    expectPt(pic.resolve('C1.out'), 220, 150, 'C1.out')
    // Grounds placed by terminal: 'in' sits exactly on the bottom rail.
    expectPt(pic.resolve('G1.in'), 60, 180, 'G1.in')
    expectPt(pic.resolve('G2.in'), 220, 180, 'G2.in')

    const svg = pic.toSVG({ width: 320, height: 210 })
    expect(svg).not.toContain('marker-end') // wires have no arrows
    expect(svg).toContain('<circle') // junction dot
  })
})

describe('demo card: inverting amplifier', () => {
  it('op-amp ports resolve as typed Points; scene renders', () => {
    const pic = picture({ shapes: SHAPES })
    const u1 = opAmp({ center: point(200, 120) })
    const rin = resistor({ center: point(95, 104) })
    const rf = resistor({ center: point(150, 55) })
    pic.node('U1', { shape: u1 })
    pic.node('Rin', { shape: rin })
    pic.node('Rf', { shape: rf })
    pic.node('GND', circuit.ground({ at: point(170, 190), anchor: 'in' }))

    wire(pic, [point(30, 104), rin.in])
    wire(pic, [rin.out, u1.minus])
    wire(pic, [rf.out, point(250, 55), point(250, 120), u1.out])
    wire(pic, [point(145, 104), point(145, 55), rf.in])
    wire(pic, [u1.out, point(250, 120)])
    wire(pic, [point(250, 120), point(285, 120)])
    pic.fill(junctionDot(point(250, 120)))
    pic.fill(junctionDot(point(145, 104)))
    wire(pic, [u1.plus, point(170, 190)])

    // Typed ports and string resolution agree on the same instance.
    expectPt(u1.minus, 170, 104, 'u1.minus')
    expectPt(u1.plus, 170, 136, 'u1.plus')
    expectPt(u1.out, 230, 120, 'u1.out')
    expectPt(pic.resolve('U1.-'), 170, 104, 'U1.-')
    expectPt(pic.resolve('U1.+'), 170, 136, 'U1.+')
    expectPt(pic.resolve('U1.out'), 230, 120, 'U1.out')
    expectPt(rin.out, 125, 104, 'rin.out')
    expectPt(rf.in, 120, 55, 'rf.in')
    expectPt(pic.resolve('GND.in'), 170, 190, 'GND.in')

    const svg = pic.toSVG({ width: 320, height: 240 })
    expect(svg).not.toContain('marker-end')
    expect(svg.split('<circle').length - 1).toBe(2) // two junction dots
  })
})

describe('demo card: two ways to reference symbols', () => {
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }

  /** The card's Style-1 scene: string shape names + string port specs. */
  function buildWithStrings(): string {
    const pic = picture({ shapes: SHAPES })
    pic.node('V1', { shape: SHAPES['voltage source'], at: point(50, 110), rotate: 90 }, { style: sym })
    pic.node('R1', { shape: SHAPES['resistor'], at: point(150, 55) }, { style: sym })
    pic.node('D1', { shape: SHAPES['diode'], shapeOptions: { variant: 'led' }, at: point(240, 110), rotate: 90 }, { style: sym })
    pic.node('G1', { shape: SHAPES['ground'], at: point(50, 165), anchor: 'in' }, { style: sym })
    pic.node('G2', { shape: SHAPES['ground'], at: point(240, 165), anchor: 'in' }, { style: sym })
    wire(pic, ['V1.in', point(50, 55), 'R1.in'])
    wire(pic, ['R1.out', point(240, 55), 'D1.in'])
    wire(pic, ['V1.out', point(50, 165), point(240, 165), 'D1.out'])
    return pic.toSVG({ width: 300, height: 190 })
  }

  /** The card's Style-2 scene: typed builders + typed port Points. */
  function buildWithTyped(): string {
    const pic = picture({ shapes: SHAPES })
    pic.node('V1', circuit.voltageSource({ at: point(50, 110), rotate: 90 }), { style: sym })
    const r1 = resistor({ center: point(150, 55) })
    pic.node('R1', { shape: r1 }, { style: sym })
    pic.node('D1', circuit.diode({ at: point(240, 110), rotate: 90, variant: 'led' }), { style: sym })
    pic.node('G1', circuit.ground({ at: point(50, 165), anchor: 'in' }), { style: sym })
    pic.node('G2', circuit.ground({ at: point(240, 165), anchor: 'in' }), { style: sym })
    wire(pic, ['V1.in', point(50, 55), r1.in])
    wire(pic, [r1.out, point(240, 55), 'D1.in'])
    wire(pic, ['V1.out', point(50, 165), point(240, 165), 'D1.out'])
    return pic.toSVG({ width: 300, height: 190 })
  }

  it('both styles produce BYTE-IDENTICAL SVG — they are the same objects', () => {
    expect(buildWithTyped()).toBe(buildWithStrings())
  })
})
