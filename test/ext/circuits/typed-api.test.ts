/**
 * Typed programmer-facing circuit API: circuit.* option builders and
 * typed port accessors — compile-time-checked alternatives to string
 * shape names and string port specs. Both produce/consume the same
 * objects as the string path; these tests pin their equivalence.
 */
import { describe, it, expect } from 'vitest'
import {
  circuit,
  circuitShapes,
  resistor,
  opAmp,
  ground,
  Resistor,
  OpAmp,
  TWO_TERMINAL_PORTS,
  OPAMP_PORTS,
  GROUND_PORTS,
  CIRCUIT_PORTS,
} from '../../../src/ext/circuits'
import { Node } from '../../../src/node/Node'
import { picture } from '../../../src/picture/Picture'
import { edge } from '../../../src/node/Edge'
import { point } from '../../../src/core/Point'
import { allShapes } from '../../../src/geometry/shapes'
const SHAPES = { ...allShapes, ...circuitShapes }

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('circuit.* option builders', () => {
  it('produce NodeOptions with the right shape + shapeOptions', () => {
    const opts = circuit.resistor({ at: point(50, 50), rotate: 90, variant: 'iec' })
    expect(opts.shape).toBe(circuitShapes['resistor'])
    expect(opts.shapeOptions).toEqual({ variant: 'iec' })
    expect(opts.rotate).toBe(90)
    expect(opts.at).toEqual(point(50, 50))
  })

  it('omit shapeOptions when no variant is given', () => {
    expect(circuit.inductor({ at: point(0, 0) }).shapeOptions).toBeUndefined()
    expect(circuit.opAmp().shapeOptions).toBeUndefined()
  })

  it('all nine symbols have builders (including switch, a JS keyword)', () => {
    expect(circuit.resistor().shape).toBe(circuitShapes['resistor'])
    expect(circuit.capacitor().shape).toBe(circuitShapes['capacitor'])
    expect(circuit.inductor().shape).toBe(circuitShapes['inductor'])
    expect(circuit.diode().shape).toBe(circuitShapes['diode'])
    expect(circuit.switch().shape).toBe(circuitShapes['switch'])
    expect(circuit.voltageSource().shape).toBe(circuitShapes['voltage source'])
    expect(circuit.currentSource().shape).toBe(circuitShapes['current source'])
    expect(circuit.ground().shape).toBe(circuitShapes['ground'])
    expect(circuit.opAmp().shape).toBe(circuitShapes['op amp'])
  })

  it('variant passthrough: capacitor/diode/switch', () => {
    expect(circuit.capacitor({ variant: 'polarized' }).shapeOptions).toEqual({
      variant: 'polarized',
    })
    expect(circuit.diode({ variant: 'led' }).shapeOptions).toEqual({ variant: 'led' })
    expect(circuit.switch({ variant: 'closed' }).shapeOptions).toEqual({
      variant: 'closed',
    })
  })

  it('builders compose with Picture.node exactly like hand-written options', () => {
    const viaBuilder = picture({ shapes: SHAPES }).node('R1', circuit.resistor({ at: point(100, 50), variant: 'iec' }))
    const viaStrings = picture({ shapes: SHAPES }).node('R1', {
      shape: SHAPES['resistor'],
      at: point(100, 50),
      shapeOptions: { variant: 'iec' },
    })
    const a = viaBuilder.getNode('R1')!.shape as Resistor
    const b = viaStrings.getNode('R1')!.shape as Resistor
    expect(a.variant).toBe('iec')
    expect(a.toSVGPath()).toBe(b.toSVGPath())
  })
})

describe('typed port accessors', () => {
  it('port-name constants mirror the runtime port tables', () => {
    expect([...resistor({ center: point(0, 0) }).portNames].sort()).toEqual(
      [...TWO_TERMINAL_PORTS].sort()
    )
    expect([...opAmp({ center: point(0, 0) }).portNames].sort()).toEqual(
      [...OPAMP_PORTS].sort()
    )
    expect([...ground({ center: point(0, 0) }).portNames].sort()).toEqual(
      [...GROUND_PORTS].sort()
    )
    // the union covers every port name
    expect([...CIRCUIT_PORTS].sort()).toEqual(
      [...new Set([...TWO_TERMINAL_PORTS, ...OPAMP_PORTS, ...GROUND_PORTS])].sort()
    )
  })

  it('two-terminal symbols expose .in / .out as Points', () => {
    const r = resistor({ center: point(100, 50) })
    expectPt(r.in, 70, 50, 'in')
    expectPt(r.out, 130, 50, 'out')
    // Same points as the string path.
    expectPt(r.in, r.anchor('in').x, r.anchor('in').y, 'in === anchor(in)')
  })

  it('op-amp exposes .minus / .plus / .out', () => {
    const u = opAmp({ center: point(200, 120) })
    expect(u).toBeInstanceOf(OpAmp)
    expectPt(u.minus, 170, 104, 'minus')
    expectPt(u.plus, 170, 136, 'plus')
    expectPt(u.out, 230, 120, 'out')
  })

  it('ground exposes .in', () => {
    const g = ground({ center: point(60, 180) })
    expectPt(g.in, 60, 171, 'in')
  })

  it('edges between typed ports need no strings at all', () => {
    const u = opAmp({ center: point(200, 120) })
    const r = resistor({ center: point(95, 104) })
    const e = edge(r.out, u.minus, { arrowEnd: 'none' })
    expectPt(e.from, 125, 104, 'from R.out')
    expectPt(e.to, 170, 104, 'to U.minus')
  })

  it('typed instances still work as Node shapes (mixed workflow)', () => {
    const u = opAmp({ center: point(200, 120) })
    const pic = picture({ shapes: SHAPES }).node('U1', { shape: u })
    // String resolution against the same instance also works.
    expectPt(pic.resolve('U1.out'), 230, 120, 'U1.out')
    // …and the node's shape IS the typed instance.
    expect((pic.getNode('U1') as Node).shape).toBe(u)
  })
})
