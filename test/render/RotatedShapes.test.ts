import { describe, it, expect } from 'vitest'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { point } from '../../src/core/Point'
import { rect, rectFromCenter } from '../../src/geometry/Rectangle'
import { ellipse } from '../../src/geometry/Ellipse'
import { rotated } from '../../src/geometry/Rotated'
import { picture } from '../../src/picture/Picture'

/**
 * Regression: `Rotated` reports its BASE shape's `type` so shape-set
 * lookups and Node internals stay transparent to rotation. That made
 * the renderer's tag dispatch claim a rotated rectangle as a plain
 * Rectangle and emit `<rect x y width height>` — an axis-aligned box at
 * the origin (Rotated has no x/y), silently losing both the rotation
 * and the position. Reported 2026-09-14 from the free-body example,
 * where the block landed in the picture's top-left corner.
 */
describe('rotated shapes render through their rotated outline', () => {
  it('draws a rotated rectangle as a path, not an axis-aligned <rect>', () => {
    const r = new SVGRenderer()
    r.render(rotated(rectFromCenter(point(200, 120), 60, 40), -20))
    const svg = r.toSVG({ width: 400, height: 240 })

    expect(svg).not.toContain('<rect')
    expect(svg).toContain('<path')
    // The box stays centered on (200,120): its first corner is the
    // unrotated top-left (170,100) turned -20° about that center.
    expect(svg).toMatch(/d="M 164\.969 111\.467 /)
  })

  it('keeps an unrotated rectangle on the fast <rect> path', () => {
    const r = new SVGRenderer()
    r.render(rect(10, 20, 30, 40))
    expect(r.toSVG({ width: 100, height: 100 })).toContain('<rect')
  })

  it('rotates an ellipse instead of drawing it axis-aligned', () => {
    const r = new SVGRenderer()
    r.render(rotated(ellipse(point(50, 50), 40, 15), 30))
    const svg = r.toSVG({ width: 120, height: 120 })

    expect(svg).not.toContain('<ellipse')
    expect(svg).toContain('<path')
  })

  it('survives the picture draw verbs', () => {
    const pic = picture()
    pic.filldraw(rotated(rectFromCenter(point(100, 100), 50, 30), 45), {
      style: { fill: '#dbeafe', stroke: '#334155' },
    })
    const svg = pic.toSVG({ width: 200, height: 200 })

    expect(svg).not.toContain('<rect')
    expect(svg).toContain('fill="#dbeafe"')
  })
})
