/** The renderable seam: structural outlines and self-painting objects. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import type { Paintable, CustomRenderable } from '../../src/render/Renderer'

describe('renderable seam', () => {
  it('anything with toSVGPath and bounds draws as a path with the caller style, and fits', () => {
    const chevron: CustomRenderable = {
      bounds: [0, 0, 20, 10],
      toSVGPath: () => 'M 0 0 L 20 5 L 0 10',
    }
    const svg = picture().draw(chevron, { style: { stroke: '#dc2626' } }).toSVG({ fit: true, padding: 0 })
    expect(svg).toContain('d="M 0 0 L 20 5 L 0 10"')
    expect(svg).toContain('stroke="#dc2626"')
    expect(svg).toContain('viewBox="0 0 20 10"')
  })

  it('a Paintable paints itself with the resolved style and the renderer', () => {
    const dots: Paintable = {
      bounds: [0, 0, 40, 10],
      paint: ({ target, style, renderer }) => {
        target.circle(6).attr({ cx: 5, cy: 5, fill: style.stroke })
        target.circle(6).attr({ cx: 35, cy: 5, fill: '#ffffff', stroke: style.stroke })
        renderer.renderText('2', point(20, 5), { fontSize: 8 })
      },
    }
    const svg = picture().draw(dots, { style: { stroke: '#2563eb' }, className: 'dots' }).toSVG({ width: 50, height: 20 })
    expect(svg).toMatch(/<g class="dots">/)
    expect(svg).toMatch(/<circle[^>]*cx="5"[^>]*fill="#2563eb"/)
    expect(svg).toMatch(/<circle[^>]*cx="35"[^>]*fill="#ffffff"[^>]*stroke="#2563eb"/)
    expect(svg).toContain('>2</text>')
  })
})
