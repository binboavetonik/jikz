/**
 * Logic-gate extension — dogfoods the same public seams as ext/circuits:
 * registerShape, port interception under strict anchors, rotate,
 * anchor-based placement, and typed builders.
 */
import { describe, it, expect } from 'vitest'
import {
  registerGates,
  gatesRegistered,
  GATE_SHAPES,
  LogicGate,
  gate,
  andGate,
  notGate,
  xorGate,
  gates,
} from '../../../src/ext/gates'
import { AnchorError } from '../../../src/core/Anchor'
import { hasShape, createShape } from '../../../src/geometry/registry'
import { Node } from '../../../src/node/Node'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'

registerGates()

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('registerGates', () => {
  it('registers gate shape names in the global registry', () => {
    expect(gatesRegistered()).toBe(true)
    for (const name of GATE_SHAPES) {
      expect(hasShape(name)).toBe(true)
    }
  })

  it('is idempotent', () => {
    registerGates()
    registerGates()
    expect(hasShape('and')).toBe(true)
  })
})

describe('gate symbol', () => {
  it('has an intrinsic default size of 70×50', () => {
    const n = new Node({ shape: 'and', at: point(100, 100) })
    expect(n.width).toBeCloseTo(70, 6)
    expect(n.height).toBeCloseTo(50, 6)
  })

  it('honors explicit width/height and variant via shapeOptions', () => {
    const n = new Node({
      shape: 'and',
      at: point(0, 0),
      width: 90,
      height: 40,
      shapeOptions: { variant: 'iec' },
    })
    expect(n.width).toBeCloseTo(90, 6)
    expect(n.height).toBeCloseTo(40, 6)
    const shape = n.shape as LogicGate
    expect(shape.variant).toBe('iec')
  })

  it('exposes typed ports for two-input gates', () => {
    const g = andGate()
    expectPt(g.in1, -35, -12.5, 'in1')
    expectPt(g.in2, -35, 12.5, 'in2')
    expectPt(g.out, 35, 0, 'out')
  })

  it('exposes typed in/out ports for not/buffer', () => {
    const n = notGate()
    expectPt(n.in, -35, 0, 'in')
    expectPt(n.out, 35, 0, 'out')
  })

  it('throws AnchorError for ports that do not exist', () => {
    const g = andGate()
    expect(() => g.anchor('in')).toThrow(AnchorError)
    expect(() => g.anchor('outt')).toThrow(AnchorError)
  })
})

describe('gate geometry', () => {
  it('and/nand draw a D-shape body with two input leads', () => {
    const d = andGate().toSVGPath()
    expect(d).toContain('M -35 -12.5 L -25 -12.5')
    expect(d).toContain('M -35 12.5 L -25 12.5')
    expect(d).toContain('M -25 -25 L -25 25 L 0 25 A 25 25 0 0 1 0 -25 Z')
    expect(d).toContain('M 25 0 L 35 0') // output lead
  })

  it('or/nor draw a concave-left pointed-right body', () => {
    const d = gate('or').toSVGPath()
    expect(d).toContain('A 31.25 31.25 0 0 1 -25 25 L 25 0 Z')
  })

  it('xor/xnor add the exclusive arc', () => {
    const d = xorGate().toSVGPath()
    expect(d).toContain('M -33 -25 A 31.25 31.25 0 0 1 -33 25')
  })

  it('not/buffer draw a triangle', () => {
    const d = notGate().toSVGPath()
    expect(d).toContain('M -25 -25 L 25 0 L -25 25 Z')
  })

  it('negated gates draw a bubble at the output', () => {
    const d = notGate().toSVGPath()
    expect(d).toContain('M 35 0 A 5 5 0 1 0 25 0 A 5 5 0 1 0 35 0 Z')
  })
})

describe('gates through the picture', () => {
  it('renders gates and wires ports by name', () => {
    const pic = picture()
    pic.node('A', gates.and({ at: point(60, 40) }))
    pic.node('N', gates.not({ at: point(160, 40) }))
    pic.edge('A.out', 'N.in', { arrowEnd: 'none' })
    const svg = pic.toSVG({ width: 220, height: 80 })

    expect(svg).toContain('<path') // gate bodies + edge
    expect(svg).toContain('A 25 25 0 0 1') // AND D-shape arc
    expect(svg).toContain('A 5 5 0 1 0') // bubble present
  })

  it('createShape builds gates by name', () => {
    const g = createShape('and', { center: point(0, 0) }) as LogicGate
    expect(g.type).toBe('and')
    expectPt(g.out, 35, 0)
  })
})
