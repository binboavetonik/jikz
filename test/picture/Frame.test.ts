/**
 * `frame: 'math'` — a picture written in TikZ's frame (y up,
 * counter-clockwise, unit-scaled) whose geometry is screen space.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { rel } from '../../src/picture/Frame'
import { point, polar } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { rect } from '../../src/geometry/Rectangle'
import { arc } from '../../src/geometry/Arc'
import { plot } from '../../src/geometry/Plot'
import { basicShapes } from '../../src/geometry/shapes/basic'

describe('math frame', () => {
  const pic = () => picture({ shapes: basicShapes, frame: 'math', unit: 10 })

  it('maps node, coordinate and text positions: y up, unit scaled', () => {
    const p = pic()
      .node('A', { at: point(1, 2), shape: 'circle', width: 10, height: 10 })
      .coordinate('P', point(-1, 0.5))
    expect(p.resolve('A')).toEqual(point(10, -20))
    expect(p.resolve('P')).toEqual(point(-10, -5))
    expect(p.point(3, 4)).toEqual(point(30, -40))
    expect(p.length(2)).toBe(20)
  })

  it('numeric anchors are counter-clockwise: A.90 is the top', () => {
    const p = pic().node('A', { at: point(0, 0), shape: 'circle', width: 20, height: 20 })
    expect(p.resolve('A.90').y).toBeCloseTo(-10)
    expect(p.resolve('A.north').y).toBeCloseTo(-10)
    expect(p.resolve('A.0').x).toBeCloseTo(10)
    expect(p.resolve('A.180').x).toBeCloseTo(-10)
  })

  it('label and pin angles are frame angles', () => {
    const p = pic().node('A', {
      at: point(0, 0), shape: 'circle', width: 20, height: 20,
      labels: [{ text: 'L', at: 90 }], pins: [{ text: 'P', at: 90 }],
    })
    const ys = [...p.toSVG({ fit: true }).matchAll(/<text[^>]*y="([-\d.]+)"/g)].map((m) => Number(m[1]))
    for (const y of ys) expect(y).toBeLessThan(-10) // both above the node
  })

  it('polar() reads as TikZ (θ:r) once mapped', () => {
    const p = pic().coordinate('Q', polar(90, 1))
    expect(p.resolve('Q').x).toBeCloseTo(0)
    expect(p.resolve('Q').y).toBeCloseTo(-10) // up
  })

  it('edge out/in angles and node rotate are frame angles', () => {
    const p = pic()
      .node('A', { at: point(0, 0), shape: 'rectangle', width: 10, height: 10, rotate: 90 })
      .edge(point(0, 0), point(5, 0), { out: 90, in: 90 })
    const e = (p.items[1] as { edge: import('../../src/node/Edge').Edge }).edge
    // Leaving upward (screen 270°): the first control point has smaller y.
    expect(e.controlPoints[0].y).toBeLessThan(0)
    expect(p.getNode('A')!.rotate).toBe(-90)
  })

  it('draw verbs map shapes; unmappable ones say so', () => {
    const p = pic()
      .draw(circle(point(1, 1), 0.5))
      .fill(rect(0, 0, 2, 1))
      .draw(arc(point(0, 0), 1, 0, 90))
    const svg = p.toSVG({ width: 100, height: 100 })
    expect(svg).toMatch(/<circle cx="10" cy="-10"[^>]*r="5"/)
    expect(svg).toMatch(/<rect[^>]*height="10"[^>]*width="20"[^>]*x="0" y="-10"/)
    // The quarter arc from (10,0) sweeps to the top (0,-10), counter-clockwise on screen.
    expect(svg).toMatch(/M 10 0 A 10 10 0 0 0 0 -10|M 10 0 A 10 10 0 0 0 [\d.e-]+ -10/)
    expect(() => pic().draw(plot((x) => x, { domain: [0, 1] }))).toThrow(/cannot be mapped/)
  })

  it('the pen writes frame coordinates, relative steps and angles', () => {
    const p = pic()
    p.pen().moveTo(0, 0).lineTo(1, 1).lineTo(rel(1, 0)).to(rel(0, -1), { out: 90, in: 180 })
    const svg = p.toSVG({ width: 100, height: 100 })
    expect(svg).toContain('M 0 0 L 10 -10 L 20 -10 C')
    // out=90 (up in the frame) → first control point above the start (20,-10).
    const cp = svg.match(/C ([\d.-]+) ([\d.-]+),/)!
    expect(Number(cp[2])).toBeLessThan(-10)
  })

  it('the default frame is the identity: rel() works there too', () => {
    const p = picture()
    p.pen().moveTo(10, 10).lineTo(rel(5, 5))
    expect(p.toSVG({ width: 20, height: 20 })).toContain('M 10 10 L 15 15')
    expect(p.point(3, 4)).toEqual(point(3, 4))
  })
})
