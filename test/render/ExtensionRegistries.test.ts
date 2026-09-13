/**
 * Arrow tip and fill pattern registry tests: user-registered tips and
 * patterns flow through the SVG pipeline by name.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { Node } from '../../src/node/Node'
import { Edge } from '../../src/node/Edge'
import { circle } from '../../src/geometry/Circle'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import {
  registerArrowTip,
  hasArrowTip,
  registeredArrowTips,
  resolveArrowTipKind,
} from '../../src/render/ArrowTip'
import {
  registerPattern,
  getPatternDefinition,
  registeredPatternNames,
} from '../../src/render/FillPattern'
import { allShapes } from '../../src/geometry/shapes'

const SHAPES = allShapes

registerArrowTip('pennant', {
  filled: true,
  end: { d: 'M 0 0 L 10 5 L 0 5 Z', refX: 9 },
  start: { d: 'M 10 0 L 0 5 L 10 5 Z', refX: 1 },
})

registerPattern('wavy', {
  width: 12,
  height: 6,
  defaultLineWidth: 1,
  createContent: (color, lw) =>
    `<path d="M0 3 Q3 0 6 3 T12 3" fill="none" stroke="${color}" stroke-width="${lw}"/>`,
})

describe('arrow tip registry', () => {
  it('built-ins are registered', () => {
    for (const tip of [
      'stealth', 'latex', 'to', 'bar',
      'circle', 'openCircle', 'square', 'diamond', 'roundCap', 'doubleBar',
    ]) {
      expect(hasArrowTip(tip)).toBe(true)
    }
  })

  it('aliases resolve to marker kinds', () => {
    expect(resolveArrowTipKind('->')).toBe('to')
    expect(resolveArrowTipKind('<->')).toBe('to')
    expect(resolveArrowTipKind('|')).toBe('bar')
    expect(resolveArrowTipKind('||')).toBe('doubleBar')
    expect(resolveArrowTipKind('*')).toBe('circle')
    expect(resolveArrowTipKind('o')).toBe('openCircle')
    expect(resolveArrowTipKind('pennant')).toBe('pennant')
  })

  it('built-in geometric tips render through edges by name', () => {
    const a = new Node({ shape: SHAPES['circle'], at: point(40, 40), width: 30, height: 30, text: 'A' })
    const b = new Node({ shape: SHAPES['circle'], at: point(140, 40), width: 30, height: 30, text: 'B' })
    const renderer = new SVGRenderer()
    renderer.renderEdge(new Edge(a, b, { arrowEnd: 'circle' }))
    renderer.renderEdge(new Edge(a, b, { arrowEnd: 'doubleBar' }))
    const svg = renderer.toSVG({ width: 180, height: 80 })
    expect(svg).toContain('arrow-circle-')
    expect(svg).toContain('M 7.5 5 A 2.5 2.5 0 0 0 2.5 5 A 2.5 2.5 0 0 0 7.5 5 Z')
    expect(svg).toContain('arrow-doubleBar-')
    expect(svg).toContain('M 4 0 L 4 10 M 6 0 L 6 10')
    expect(svg).toContain('marker-end')
  })

  it('user tips render through edges by name', () => {
    const a = new Node({ shape: SHAPES['circle'], at: point(40, 40), width: 30, height: 30, text: 'A' })
    const b = new Node({ shape: SHAPES['circle'], at: point(140, 40), width: 30, height: 30, text: 'B' })
    const renderer = new SVGRenderer()
    renderer.renderEdge(new Edge(a, b, { arrowEnd: 'pennant' }))
    const svg = renderer.toSVG({ width: 180, height: 80 })
    expect(svg).toContain('arrow-pennant-')
    expect(svg).toContain('M 0 0 L 10 5 L 0 5 Z')
    expect(svg).toContain('marker-end')
  })

  it('registeredArrowTips includes user tips', () => {
    expect(registeredArrowTips()).toContain('pennant')
  })
})

describe('pattern registry', () => {
  it('built-ins are registered', () => {
    expect(registeredPatternNames()).toContain('grid')
    expect(getPatternDefinition('bricks')).toBeDefined()
  })

  it('user patterns render through style.fillPattern by name', () => {
    const renderer = new SVGRenderer()
    renderer.renderCircle(circle(point(50, 50), 30), {
      style: { fillPattern: { name: 'wavy', color: '#ff0000' } },
    })
    const svg = renderer.toSVG({ width: 100, height: 100 })
    expect(svg).toContain('jikz-pattern-wavy')
    expect(svg).toContain('M0 3 Q3 0 6 3 T12 3')
  })

  it('unknown patterns throw with known names', () => {
    const renderer = new SVGRenderer()
    expect(() =>
      renderer.renderCircle(circle(point(50, 50), 30), {
        style: { fillPattern: 'nope' },
      })
    ).toThrow(/Unknown fill pattern: "nope" \(known: /)
  })
})
