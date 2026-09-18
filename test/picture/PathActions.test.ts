/** preaction/postaction, path picture, use as bounding box, even odd rule, pen shorten. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { rect } from '../../src/geometry/Rectangle'
import { basicShapes } from '../../src/geometry/shapes/basic'

describe('preactions and postactions', () => {
  it('paint the outline again before/after with only what the action says', () => {
    const svg = picture()
      .draw(circle(point(50, 50), 20), {
        style: { stroke: '#000000' },
        preactions: [{ stroke: '#fde68a', strokeWidth: 8 }],
        postactions: [{ fill: '#dc2626', fillOpacity: 0.2 }],
      })
      .toSVG({ width: 100, height: 100 })
    const circles = [...svg.matchAll(/<circle[^>]*>/g)].map((m) => m[0])
    expect(circles).toHaveLength(3)
    expect(circles[0]).toMatch(/fill="none"[^>]*stroke="#fde68a"[^>]*stroke-width="8"/)
    expect(circles[1]).toMatch(/stroke="#000000"/)
    expect(circles[2]).toMatch(/fill="#dc2626"[^>]*fill-opacity="0.2"[^>]*stroke="none"/)
  })

  it('work on nodes and edges, and may name styles', () => {
    const svg = picture({ shapes: basicShapes, styles: { halo: { stroke: '#bfdbfe', strokeWidth: 6 } } })
      .node('A', { at: point(30, 30), shape: 'circle', width: 20, height: 20, preactions: ['halo'] })
      .edge(point(60, 30), point(90, 30), { preactions: ['halo'] })
      .toSVG({ width: 100, height: 60 })
    expect(svg.match(/stroke="#bfdbfe"/g)).toHaveLength(2)
    expect(svg.indexOf('stroke="#bfdbfe"')).toBeLessThan(svg.indexOf('<g>'))
  })
})

describe('path picture', () => {
  it('draws inside the shape, clipped, between fill and stroke', () => {
    const svg = picture()
      .filldraw(circle(point(50, 50), 30), {
        style: { fill: '#f1f5f9', stroke: '#0f172a' },
        pathPicture: (inside) => inside.draw(rect(0, 0, 100, 100), { style: { stroke: '#dc2626' } }),
      })
      .toSVG({ width: 100, height: 100 })
    expect(svg).toContain('<clipPath')
    const fill = svg.indexOf('fill="#f1f5f9"')
    const inner = svg.indexOf('stroke="#dc2626"')
    const stroke = svg.indexOf('stroke="#0f172a"')
    expect(fill).toBeLessThan(inner)
    expect(inner).toBeLessThan(stroke)
    expect(svg).toMatch(/<g clip-path="url\(#jikz-clip-\d+\)">/)
  })
})

describe('use as bounding box', () => {
  it('restricts fit to the flagged items', () => {
    const svg = picture()
      .path(rect(0, 0, 50, 50), { useAsBoundingBox: true })
      .draw(circle(point(200, 200), 30))
      .toSVG({ fit: true, padding: 0 })
    expect(svg).toContain('viewBox="0 0 50 50"')
  })
})

describe('fill rule and pen shorten', () => {
  it('fillRule reaches the attribute', () => {
    const svg = picture().fill(rect(0, 0, 10, 10), { style: { fillRule: 'evenodd' } }).toSVG({ width: 10, height: 10 })
    expect(svg).toContain('fill-rule="evenodd"')
  })

  it('shortenStart/shortenEnd trim a pen statement', () => {
    const pic = picture()
    pic.pen({ shortenStart: 5, shortenEnd: 10 }).moveTo(0, 0).lineTo(100, 0).lineTo(100, 50)
    expect(pic.toSVG({ width: 110, height: 60 })).toContain('M 5 0 L 100 0 L 100 40')
  })
})
