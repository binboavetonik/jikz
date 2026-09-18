/**
 * `every` — TikZ's `every node`, `every edge`, `every path`, `every
 * label`: kind-scoped defaults on a picture and on a scope, sitting
 * under scope `style` and above the path-mode baseline.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { basicShapes } from '../../src/geometry/shapes/basic'

const nodeFill = (svg: string) => svg.match(/<g><path d="[^"]*" [^>]*fill="([^"]*)"/)![1]

describe('every', () => {
  it('every.node paints nodes, every.edge edges, every.path bare shapes', () => {
    const svg = picture({
      shapes: basicShapes,
      every: {
        node: { fill: '#dcfce7' },
        edge: { stroke: '#dc2626' },
        path: { stroke: '#2563eb', strokeWidth: 3 },
      },
    })
      .node('A', { at: point(20, 20), shape: 'circle', width: 20, height: 20 })
      .node('B', { at: point(120, 20), shape: 'circle', width: 20, height: 20 })
      .edge('A', 'B')
      .draw(circle(point(60, 80), 10))
      .toSVG({ width: 160, height: 100 })
    expect(nodeFill(svg)).toBe('#dcfce7')
    expect(svg).toMatch(/<path d="M 30 20 L 110 20"[^>]*stroke="#dc2626"/)
    expect(svg).toMatch(/<circle[^>]*stroke="#2563eb"[^>]*stroke-width="3"/)
  })

  it('an item’s own style wins over every, and every wins over the mode baseline', () => {
    const svg = picture({ every: { path: { stroke: '#2563eb' } } })
      .draw(circle(point(20, 20), 10))
      .draw(circle(point(60, 20), 10), { style: { stroke: '#dc2626' } })
      .toSVG({ width: 100, height: 40 })
    expect(svg).toMatch(/cx="20"[^>]*|stroke="#2563eb"/)
    expect(svg.match(/stroke="#2563eb"/g)).toHaveLength(1)
    expect(svg.match(/stroke="#dc2626"/g)).toHaveLength(1)
  })

  it('a scope’s every stacks on the picture’s, and scope style beats both', () => {
    const pic = picture({ every: { path: { stroke: '#2563eb', strokeWidth: 2 } } })
    pic.scope({ every: { path: { strokeWidth: 4 } } }, (s) => s.draw(circle(point(20, 20), 10)))
    pic.scope({ style: { stroke: '#16a34a' }, every: { path: { stroke: '#dc2626' } } }, (s) =>
      s.draw(circle(point(60, 20), 10))
    )
    const svg = pic.toSVG({ width: 100, height: 40 })
    expect(svg).toMatch(/stroke="#2563eb"[^>]*stroke-width="4"/)
    expect(svg).toMatch(/stroke="#16a34a"[^>]*stroke-width="2"/)
  })

  it('every.text sets label, node text and bare text defaults', () => {
    const svg = picture({ shapes: basicShapes, every: { text: { fontSize: 9, fill: '#64748b' } } })
      .node('A', { at: point(40, 40), shape: 'rectangle', text: 'A', labels: [{ text: 'L', at: 'north' }] })
      .text(point(40, 90), 'bare')
      .text(point(40, 95), 'own', { style: { fontSize: 20 } })
      .toSVG({ width: 100, height: 120 })
    expect(svg.match(/font-size="9"/g)!.length).toBe(3) // node text, label, bare
    expect(svg).toContain('font-size="20"')
    expect(svg.match(/fill="#64748b"/g)!.length).toBe(4)
  })

  it('every may name styles', () => {
    const svg = picture({
      styles: { hot: { stroke: '#dc2626' } },
      every: { path: ['hot', 'thick'] },
    })
      .draw(circle(point(20, 20), 10))
      .toSVG({ width: 40, height: 40 })
    expect(svg).toMatch(/stroke="#dc2626"[^>]*stroke-width="0.8"/)
  })
})
