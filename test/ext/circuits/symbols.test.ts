/**
 * Circuit extension — milestones 2–5: passives (capacitor, inductor,
 * diode, switch), sources, ground, multi-port op-amp, wiring helpers.
 */
import { describe, it, expect } from 'vitest'
import {
  circuitShapes,
  capacitor,
  inductor,
  diode,
  createSwitch,
  voltageSource,
  currentSource,
  ground,
  opAmp,
  wire,
  junctionDot,
  OpAmp,
} from '../../../src/ext/circuits'
import { AnchorError } from '../../../src/core/Anchor'
import { Node } from '../../../src/node/Node'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { allShapes } from '../../../src/geometry/shapes'
const SHAPES = { ...allShapes, ...circuitShapes }

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('capacitor', () => {
  it('two plates + leads; ports at lead tips', () => {
    const c = capacitor({ center: point(100, 50) })
    const d = c.toSVGPath()
    expect(d).toContain('M 70 50 L 97 50') // west lead
    expect(d).toContain('M 97 41 L 97 59') // anode plate (h = 0.9·20)
    expect(d).toContain('M 103 41 L 103 59') // cathode plate
    expect(d).toContain('M 103 50 L 130 50') // east lead
    expectPt(c.anchor('in'), 70, 50, 'in')
    expectPt(c.anchor('out'), 130, 50, 'out')
  })

  it('polarized variant curves the cathode plate', () => {
    const c = capacitor({ center: point(0, 0), variant: 'polarized' })
    expect(c.toSVGPath()).toContain('A 9 9 0 0 1')
    expect(c.variant).toBe('polarized')
  })
})

describe('inductor', () => {
  it('four upward semicircle bumps between leads', () => {
    const l = inductor({ center: point(100, 50) })
    const d = l.toSVGPath()
    expect(d.startsWith('M 70 50 L 82 50')).toBe(true)
    expect(d.split(' A ').length - 1).toBe(4) // 4 bumps
    expect(d).toContain('A 4.5 4.5 0 0 1') // r = 36/8, sweep=1 → up
    expect(d.endsWith('L 130 50')).toBe(true)
    expectPt(l.anchor('in'), 70, 50, 'in')
    expectPt(l.anchor('out'), 130, 50, 'out')
  })
})

describe('diode', () => {
  it('standard: closed triangle + cathode bar + leads', () => {
    const s = diode({ center: point(100, 50) })
    const d = s.toSVGPath()
    expect(d).toContain('M 91 41 L 91 59 L 109 50 Z') // triangle
    expect(d).toContain('M 109 41 L 109 59') // bar
    expect(d).toContain('M 70 50 L 91 50')
    expect(d).toContain('M 109 50 L 130 50')
  })

  it('zener: hooked cathode bar', () => {
    const d = diode({ center: point(100, 50), variant: 'zener' }).toSVGPath()
    expect(d).toContain('M 112.6 44.6 L 109 41')
    expect(d).toContain('L 105.4 55.4')
  })

  it('led: two light arrows added', () => {
    const d = diode({ center: point(100, 50), variant: 'led' }).toSVGPath()
    // Standard triangle still present, plus 4 extra arrow strokes.
    expect(d).toContain('M 91 41 L 91 59 L 109 50 Z')
    expect(d.split('M ').length - 1).toBe(8) // 4 base + 2 shafts + 2 barbs
  })
})

describe('switch', () => {
  it('open: contact dots + angled blade', () => {
    const s = createSwitch({ center: point(100, 50) })
    const d = s.toSVGPath()
    expect(d).toContain('A 1.5 1.5') // contact dots
    expect(d).toContain('M 85 50 L 116.5 36') // blade lifted 0.7·20
    expectPt(s.anchor('in'), 70, 50, 'in')
  })

  it('closed: straight blade through', () => {
    const d = createSwitch({ center: point(100, 50), variant: 'closed' }).toSVGPath()
    expect(d).toContain('M 85 50 L 115 50')
  })
})

describe('sources', () => {
  it('voltage source: circle + plus/minus glyphs + leads', () => {
    const v = voltageSource({ center: point(100, 50) })
    expect(v.width).toBeCloseTo(60, 6)
    expect(v.height).toBeCloseTo(36, 6)
    const d = v.toSVGPath()
    expect(d).toContain('M 70 50 L 82 50') // west lead (r = 18)
    expect(d).toContain('M 118 50 L 130 50') // east lead
    expect(d.split('A ').length - 1).toBe(2) // circle = 2 half-arcs
    expectPt(v.anchor('in'), 70, 50, 'in')
    expectPt(v.anchor('out'), 130, 50, 'out')
  })

  it('current source: circle + internal arrow', () => {
    const d = currentSource({ center: point(100, 50) }).toSVGPath()
    expect(d).toContain('M 100 59.9') // shaft bottom (ay = 0.55·18)
    expect(d).toContain('L 100 40.1') // shaft top
  })

  it('rotate 90 for vertical branches: ports follow', () => {
    const n = new Node({ shape: SHAPES['voltage source'], at: point(100, 100), rotate: 90 })
    // 'out' (local east) → visual south lead tip: height 36 → but box
    // rotates: out is at local (cx+30, cy) → rotated (cx, cy+30).
    expectPt(n.anchor('out'), 100, 130, 'out')
    expectPt(n.anchor('in'), 100, 70, 'in')
  })
})

describe('ground', () => {
  it('single in port at the north edge; three decreasing bars', () => {
    const g = ground({ center: point(100, 50) })
    expectPt(g.anchor('in'), 100, 41, 'in') // top = 50 − 18/2
    const d = g.toSVGPath()
    expect(d).toContain('M 100 41 L 100 48') // stub
    expect(d).toContain('M 88 48 L 112 48') // widest bar (w=24)
    expect(d.split('M ').length - 1).toBe(4) // stub + 3 bars
  })

  it('typo’d single-port names throw', () => {
    const g = ground({ center: point(0, 0) })
    expect(() => g.anchor('gnd')).toThrowError(AnchorError)
  })
})

describe('op amp (multi-port)', () => {
  const o = opAmp({ center: point(100, 50) })

  it('ports: − and + on the west edge, out at the east apex lead tip', () => {
    // pinOffset = 0.32·50 = 16
    expectPt(o.anchor('in-'), 70, 34, 'in-')
    expectPt(o.anchor('-'), 70, 34, '-')
    expectPt(o.anchor('in+'), 100 - 30, 66, 'in+')
    expectPt(o.anchor('+'), 70, 66, '+')
    expectPt(o.anchor('out'), 130, 50, 'out')
  })

  it('triangle body + input leads + output lead', () => {
    const d = o.toSVGPath()
    expect(d).toContain('M 80 25 L 80 75 L 120 50 Z') // triangle (body 40 wide)
    expect(d).toContain('M 70 34 L 80 34') // − input lead
    expect(d).toContain('M 70 66 L 80 66') // + input lead
    expect(d).toContain('M 120 50 L 130 50') // output lead
  })

  it('strict anchors: typo’d port throws, cardinals still work', () => {
    expect(() => o.anchor('in')).toThrowError(AnchorError) // ambiguous on op-amp
    expectPt(o.anchor('north'), 100, 25, 'north') // box cardinal
  })

  it('is a Node-usable registered shape', () => {
    const n = new Node({ shape: SHAPES['op amp'], at: point(100, 50) })
    expect(n.shape).toBeInstanceOf(OpAmp)
    expectPt(n.anchor('out'), 130, 50, 'out')
  })
})

describe('wiring helpers', () => {
  it('wire() chains endpoints with arrows OFF', () => {
    const pic = picture({ shapes: SHAPES })
      .node('R1', { shape: SHAPES['resistor'], at: point(100, 50) })
      .node('R2', { shape: SHAPES['resistor'], at: point(100, 150), rotate: 90 })
    wire(pic, ['R1.out', point(170, 50), point(170, 150), 'R2.out'])
    const svg = pic.toSVG({ width: 240, height: 220 })
    // Three wire segments, none with markers.
    expect(svg).not.toContain('marker-end')
    expect(svg).not.toContain('marker-start')
  })

  it('wire() options can override routing', () => {
    const pic = picture({ shapes: SHAPES })
      .node('A', { shape: SHAPES['resistor'], at: point(50, 50) })
      .node('B', { shape: SHAPES['resistor'], at: point(150, 120), rotate: 90 })
    wire(pic, ['A.out', 'B.in'], { routing: 'horizontal-vertical' })
    expect(pic.toSVG({ width: 200, height: 200 })).toContain('<path')
  })

  it('junctionDot is a small circle for pic.fill()', () => {
    const dot = junctionDot(point(50, 50))
    expect(dot.radius).toBe(2)
    expectPt(dot.center, 50, 50, 'center')
    const pic = picture({ shapes: SHAPES }).fill(junctionDot(point(50, 50)))
    expect(pic.toSVG({ width: 100, height: 100 })).toContain('<circle')
  })
})
