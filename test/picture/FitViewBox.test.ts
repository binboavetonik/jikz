/**
 * Auto-fit viewBox: `{ fit: true, padding }` sizes the viewport from
 * content bounds (TikZ's auto-sizing) instead of a fixed `0 0 w h`.
 * Covers negative coordinates, text estimates, edges with control
 * points, canvas-transform composition, and error cases.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { line } from '../../src/geometry/Line'
import { Transform } from '../../src/core/Transform'
import { measureText } from '../../src/text/measureText'

function viewBoxOf(svg: string): number[] {
  const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/)
  if (!m) throw new Error(`no viewBox in: ${svg.slice(0, 200)}`)
  return [1, 2, 3, 4].map((i) => parseFloat(m[i]!))
}

describe('fit viewBox', () => {
  it('sizes to content with default padding 4', () => {
    const svg = picture()
      .draw(circle(point(50, 60), 20))
      .toSVG({ fit: true })
    // circle bounds: [30,40,70,80] → padded: [26,36] size 48×48
    expect(viewBoxOf(svg)).toEqual([26, 36, 48, 48])
    expect(svg).toContain('width="48"')
    expect(svg).toContain('height="48"')
  })

  it('handles negative coordinates (unit-circle style scenes)', () => {
    const svg = picture()
      .draw(line(point(-130, 0), point(130, 0)))
      .draw(line(point(0, -130), point(0, 130)))
      .toSVG({ fit: true, padding: 0 })
    expect(viewBoxOf(svg)).toEqual([-130, -130, 260, 260])
  })

  it('includes measured text boxes (incl. placed labels)', () => {
    const pic = picture()
    pic.draw(circle(point(0, 0), 50))
    pic.text(point(50, 0), 'R', { at: 'east', distance: 4, style: { fontSize: 12 } })
    const svg = pic.toSVG({ fit: true, padding: 0 })
    const [, , w] = viewBoxOf(svg)
    const m = measureText('R', { fontSize: 12 })
    // rightmost content = label center (50 + 4 + w/2) + w/2
    expect(w).toBeCloseTo(-(-50) + 50 + 4 + m.width, 4)
  })

  it('includes edge control points (bent edges bulge)', () => {
    const straight = picture()
      .edge(point(0, 0), point(100, 0), { arrowEnd: 'none' })
      .toSVG({ fit: true, padding: 0 })
    const bent = picture()
      .edge(point(0, 0), point(100, 0), { arrowEnd: 'none', bendAngle: 45 })
      .toSVG({ fit: true, padding: 0 })
    const [, , , hStraight] = viewBoxOf(straight)
    const [, , , hBent] = viewBoxOf(bent)
    expect(hStraight).toBeCloseTo(0, 6)
    expect(hBent).toBeGreaterThan(10) // control points pulled off-axis
  })

  it('composes with the canvas transform', () => {
    const svg = picture({ transform: Transform.translation(160, 160) })
      .draw(circle(point(0, 0), 100))
      .toSVG({ fit: true, padding: 0 })
    // user-space [-100..100] translated → [60..260]
    expect(viewBoxOf(svg)).toEqual([60, 60, 200, 200])
    expect(svg).toContain('matrix(1 0 0 1 160 160)')
  })

  it('fixed viewBox keeps working and keeps 0 origin', () => {
    const svg = picture()
      .draw(circle(point(50, 50), 10))
      .toSVG({ width: 120, height: 80 })
    expect(viewBoxOf(svg)).toEqual([0, 0, 120, 80])
  })

  it('fit on an empty picture throws a clear error', () => {
    expect(() => picture().toSVG({ fit: true })).toThrow(/at least one item/)
  })

  it('fit beats stray width/height (documented precedence)', () => {
    const svg = picture()
      .draw(circle(point(50, 60), 20))
      .toSVG({ fit: true, width: 999, height: 999, padding: 4 })
    expect(viewBoxOf(svg)).toEqual([26, 36, 48, 48])
  })
})
