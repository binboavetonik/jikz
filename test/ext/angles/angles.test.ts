/** Angle marks — pinned against tikzlibraryangles.code.tex. */
import { describe, it, expect } from 'vitest'
import { angle, rightAngle, ANGLE_RADIUS, ANGLE_ECCENTRICITY } from '../../../src/ext/angles'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { mm } from '../../../src/core/units'

const O = point(100, 100), A = point(200, 100), C = point(100, 0) // C is straight up on screen

describe('angle', () => {
  it('has TikZ defaults and sweeps counter-clockwise on the page from A to C', () => {
    const a = angle(A, O, C)
    expect(ANGLE_RADIUS).toBeCloseTo(mm(5))
    expect(ANGLE_ECCENTRICITY).toBe(0.6)
    expect(a.degrees).toBeCloseTo(90)
    expect(angle(C, O, A).degrees).toBeCloseTo(270)
    expect(a.labelPoint().x).toBeCloseTo(100 + 0.6 * ANGLE_RADIUS * Math.SQRT1_2)
    expect(a.labelPoint().y).toBeLessThan(100)
  })

  it('draw strokes the arc, fill paints the wedge, filldraw both, with a label', () => {
    const arcOnly = picture().draw(angle(A, O, C, { radius: 20 })).toSVG({ width: 200, height: 200 })
    expect(arcOnly.match(/<path/g)).toHaveLength(1)
    expect(arcOnly).toMatch(/d="M 120 100 A 20 20 0 0 0 100 80"/)
    const wedge = picture().fill(angle(A, O, C, { radius: 20 })).toSVG({ width: 200, height: 200 })
    expect(wedge).toMatch(/d="M 100 100 L 120 100 A 20 20 0 0 0 100 80 Z"[^>]*stroke="none"/)
    const both = picture()
      .filldraw(angle(A, O, C, { radius: 20, label: 'α', labelStyle: { fill: '#dc2626' } }), {
        style: { stroke: '#2563eb', fill: '#dbeafe' },
      })
      .toSVG({ width: 200, height: 200 })
    expect(both.match(/<path/g)).toHaveLength(2)
    expect(both).toMatch(/<text[^>]*fill="#dc2626"[^>]*>α</)
  })

  it('right angle draws the square marker', () => {
    const svg = picture().draw(rightAngle(A, O, C, { radius: 10 })).toSVG({ width: 200, height: 200 })
    expect(svg).toContain('d="M 110 100 L 110 90 L 100 90"')
  })

  it('maps into a math-frame picture and fits', () => {
    const pic = picture({ frame: 'math', unit: 10 }).filldraw(
      angle(point(1, 0), point(0, 0), point(0, 1), { radius: 5, label: 'θ' })
    )
    const svg = pic.toSVG({ fit: true, padding: 0 })
    expect(svg).toContain('A 5 5 0 0 0 0 -5') // (5,0) sweeping up to (0,-5)
    expect(pic.contentBounds()![1]).toBeLessThan(0)
  })
})
