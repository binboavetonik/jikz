/** `roundedCorners` — TikZ `rounded corners=<inset>` on any path; `clip` as a shape. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { polygon } from '../../src/geometry/Polygon'
import { rect } from '../../src/geometry/Rectangle'
import { circle } from '../../src/geometry/Circle'
import { path } from '../../src/path/Path'
import { roundCorners } from '../../src/path/PathOperations'
import { basicShapes } from '../../src/geometry/shapes/basic'

describe('roundCorners', () => {
  it('replaces a square’s corners with arcs of the inset radius', () => {
    const p = path().moveTo(point(0, 0)).lineTo(point(100, 0)).lineTo(point(100, 100)).lineTo(point(0, 100)).close()
    const r = roundCorners(p, 10)
    const d = r.toSVGPath()
    expect(d.match(/ A /g)).toHaveLength(4)
    // Right angle: tangent length = radius = inset.
    expect(d).toContain('A 10 10 0 0 1')
    expect(d).toContain('L 90 0')
    expect(d.startsWith('M 10 0')).toBe(true)
  })

  it('caps the inset at half the shorter adjacent segment', () => {
    const p = path().moveTo(point(0, 0)).lineTo(point(10, 0)).lineTo(point(10, 100))
    const d = roundCorners(p, 40).toSVGPath()
    expect(d).toContain('L 5 0') // 10-long segment → tangent 5
  })

  it('leaves curves and collinear points alone', () => {
    const curved = path().moveTo(point(0, 0)).curveTo(point(10, 0), point(20, 0), point(30, 0)).lineTo(point(60, 0))
    expect(roundCorners(curved, 5).toSVGPath()).toBe(curved.toSVGPath())
    const straight = path().moveTo(point(0, 0)).lineTo(point(10, 0)).lineTo(point(20, 0))
    expect(roundCorners(straight, 5).toSVGPath()).not.toContain(' A ')
  })

  it('renders through the style key on polygons, nodes and rectangles', () => {
    const svg = picture({ shapes: basicShapes })
      .draw(polygon([point(0, 0), point(40, 0), point(40, 40), point(0, 40)]), { style: { roundedCorners: 6 } })
      .draw(rect(60, 0, 40, 40), { style: { roundedCorners: 6 } })
      .node('A', { at: point(140, 20), shape: 'rectangle', width: 40, height: 40, style: 'rounded' })
      .toSVG({ width: 200, height: 40 })
    expect(svg.match(/ A 6 6 /g)!.length).toBeGreaterThanOrEqual(4)
    expect(svg).toMatch(/<rect[^>]*rx="6"[^>]*ry="6"/)
    expect(svg).toMatch(/A 4 4 /) // the `rounded` preset on the node outline
  })
})

describe('clip', () => {
  it('any shape clips: the clipPath carries its outline', () => {
    const svg = picture()
      .fill(rect(0, 0, 100, 100), { style: { clip: circle(point(50, 50), 30) } })
      .toSVG({ width: 100, height: 100 })
    expect(svg).toMatch(/<clipPath id="jikz-clip-0"><path d="M 20 50 A 30 30/)
    expect(svg).toContain('clip-path="url(#jikz-clip-0)"')
  })
})
