/**
 * Circuit extension — milestone 1: scaffold, PortedShape port base,
 * resistor symbol (ANSI zigzag + IEC box), registry integration.
 *
 * These tests double as the dogfood report for the public extension
 * seams: registerShape + shapeOptions passthrough, port interception
 * under strict anchors, rotate, anchor-based placement, labels.
 */
import { describe, it, expect } from 'vitest'
import {
  circuitShapes,
  Resistor,
  resistor,
} from '../../../src/ext/circuits'
import { AnchorError } from '../../../src/core/Anchor'
import { Node } from '../../../src/node/Node'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { SVGRenderer } from '../../../src/render/SVGRenderer'
import { allShapes } from '../../../src/geometry/shapes'
import { circuitShapes } from '../../../src/ext/circuits'
const SHAPES = { ...allShapes, ...circuitShapes }

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('circuitShapes', () => {
  it('carries a kind per symbol, none of them text-sizing', () => {
    for (const [name, kind] of Object.entries(circuitShapes)) {
      expect(kind.kindName).toBe(name)
      expect(kind.textAutoSize).toBe(false)
    }
  })

})

describe('resistor symbol', () => {
  it('has an intrinsic default size of 60×20 (including leads)', () => {
    // Node coerces unset dimensions to minWidth/minHeight (20) — the
    // symbol must treat those as "unset" and use its own default.
    const n = new Node({ shape: SHAPES['resistor'], at: point(100, 100) })
    expect(n.width).toBeCloseTo(60, 6)
    expect(n.height).toBeCloseTo(20, 6)
  })

  it('honors explicit width/height', () => {
    const n = new Node({ shape: SHAPES['resistor'], at: point(0, 0), width: 90, height: 30 })
    expect(n.width).toBeCloseTo(90, 6)
    expect(n.height).toBeCloseTo(30, 6)
  })

  it('ports: in/out sit at the lead tips (bbox edge midpoints)', () => {
    const r = resistor({ center: point(100, 50) })
    expectPt(r.anchor('in'), 70, 50, 'in')
    expectPt(r.anchor('out'), 130, 50, 'out')
    // Cardinals resolve to the same lead tips.
    expectPt(r.anchor('west'), 70, 50, 'west')
    expectPt(r.anchor('east'), 130, 50, 'east')
    expectPt(r.anchor('north'), 100, 40, 'north')
    expect(r.portNames).toEqual(['in', 'out'])
  })

  it('strict anchors: typo’d port names throw', () => {
    const r = resistor({ center: point(0, 0) })
    expect(() => r.anchor('otu')).toThrowError(AnchorError)
  })

  it('ANSI variant: lead + 6-segment zigzag + lead, peaks at ±height/2', () => {
    const r = resistor({ center: point(100, 50) })
    const d = r.toSVGPath()
    // west lead starts at the west lead tip on the center line.
    expect(d.startsWith('M 70 50 L 82 50')).toBe(true)
    // M + 8 L segments (lead-in, 5 peaks, body-end, lead-out).
    expect(d.split(' L ').length - 1).toBe(8)
    // First peak is UP (visual): y = 50 − 10.
    expect(d).toContain('L 88 40')
    // Zigzag ends back on the center line, lead continues east.
    expect(d.endsWith('L 118 50 L 130 50')).toBe(true)
    expect(r.variant).toBe('ansi')
  })

  it('IEC variant: closed rect body + leads, via shapeOptions passthrough', () => {
    const n = new Node({
      shape: SHAPES['resistor'],
      at: point(100, 50),
      shapeOptions: { variant: 'iec' },
    })
    const s = n.shape as Resistor
    expect(s.variant).toBe('iec')
    const d = s.toSVGPath()
    expect(d).toContain('Z') // closed body rect
    expect(d).toContain('M 82 40 L 118 40 L 118 60 L 82 60 Z')
    expect(d).toContain('M 70 50 L 82 50')
  })

  it('registry factory builds it by name', () => {
    const s = circuitShapes['resistor']({ center: point(0, 0) })
    expect(s).toBeInstanceOf(Resistor)
    expect(s.type).toBe('resistor')
  })

  it('moveTo/resize preserve the variant', () => {
    const r = resistor({ center: point(0, 0), variant: 'iec' })
    expect((r.moveTo(point(50, 50)) as Resistor).variant).toBe('iec')
    expect((r.resize(90, 30) as Resistor).variant).toBe('iec')
  })
})

describe('resistor + node features (dogfooding P0/P1)', () => {
  it('rotate 90: ports rotate with the symbol, bounds swap', () => {
    const n = new Node({ shape: SHAPES['resistor'], at: point(100, 100), rotate: 90 })
    expect(n.bounds).toEqual([90, 70, 110, 130])
    // 'out' (local east) rotates 90° cw → visual south lead tip.
    expectPt(n.anchor('out'), 100, 130, 'out')
    expectPt(n.anchor('in'), 100, 70, 'in')
    // Numeric anchors stay screen-absolute: east is the visual east border.
    expectPt(n.anchor(0), 110, 100, 'anchor(0)')
  })

  it('toSVGPath is rotated with the symbol', () => {
    const n = new Node({ shape: SHAPES['resistor'], at: point(100, 100), rotate: 90 })
    // West lead tip (70,100) rotates 90° cw about (100,100) → (100,70).
    expect(n.toSVGPath().startsWith('M 100 70')).toBe(true)
  })

  it('placement by port: at + anchor puts the lead tip on `at`', () => {
    const n = new Node({
      shape: SHAPES['resistor'],
      at: point(100, 50),
      anchor: 'in',
    })
    expectPt(n.anchor('in'), 100, 50, 'in')
    expectPt(n.center, 130, 50, 'center')
  })

  it('renders through SVGRenderer like any node', () => {
    const r = new SVGRenderer()
    r.renderNode(new Node({ shape: SHAPES['resistor'], at: point(100, 50), text: 'R1' }))
    const svg = r.toSVG({ width: 200, height: 100 })
    expect(svg).toContain('<path')
    expect(svg).toContain('M 70 50')
    expect(svg).toContain('>R1<')
  })
})

describe('resistor + Picture wiring', () => {
  it('edges connect ports by name; wires continue the leads', () => {
    const pic = picture({ shapes: SHAPES })
      .node('R1', { shape: SHAPES['resistor'], at: point(100, 50) })
      .node('R2', { shape: SHAPES['resistor'], at: point(100, 150), rotate: 90 })
      .edge('R1.out', 'R2.in')

    // R1.out at (130,50); R2.in (rotated 'in' = local west → visual north).
    expectPt(pic.resolve('R1.out'), 130, 50, 'R1.out')
    expectPt(pic.resolve('R2.in'), 100, 120, 'R2.in')

    const svg = pic.toSVG({ width: 240, height: 220 })
    expect(svg).toContain('<path')
  })
})
