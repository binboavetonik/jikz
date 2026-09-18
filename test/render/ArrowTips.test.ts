/** Parameterised and multiple arrow tips — TikZ arrows.meta. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { edge } from '../../src/node/Edge'

const marker = (svg: string, id: string) => svg.match(new RegExp(`<marker[^>]*id="${id}"[^>]*>([\\s\\S]*?)</marker>`))

describe('arrow tip specs', () => {
  it('a plain name is the classic marker, byte for byte', () => {
    const a = picture().edge(point(0, 0), point(50, 0), { arrowEnd: 'stealth' }).toSVG({ width: 60, height: 10 })
    const b = picture().edge(point(0, 0), point(50, 0), { arrowEnd: { tip: 'stealth' } }).toSVG({ width: 60, height: 10 })
    expect(a).toBe(b)
    expect(a).toContain('id="arrow-stealth-000000"')
    expect(a).toMatch(/markerWidth="6"[^>]*orient="auto"/)
  })

  it('length/width give an absolute size in user units', () => {
    const svg = picture()
      .edge(point(0, 0), point(50, 0), { arrowEnd: { tip: 'stealth', length: 12, width: 8 } })
      .toSVG({ width: 60, height: 10 })
    const m = svg.match(/<marker[^>]*>/)![0]
    expect(m).toContain('markerUnits="userSpaceOnUse"')
    expect(m).toContain('markerWidth="12"')
    expect(m).toContain('markerHeight="8"')
    expect(m).toContain('preserveAspectRatio="none"')
  })

  it('scale multiplies the stroke-relative size', () => {
    const svg = picture()
      .edge(point(0, 0), point(50, 0), { arrowEnd: { tip: 'to', scale: 2 } })
      .toSVG({ width: 60, height: 10 })
    expect(svg).toMatch(/<marker[^>]*markerHeight="12"[^>]*markerWidth="12"/)
  })

  it('open, fill and color paint the artwork', () => {
    const svg = picture()
      .edge(point(0, 0), point(50, 0), { arrowEnd: { tip: 'stealth', open: true }, style: { stroke: '#dc2626' } })
      .edge(point(0, 20), point(50, 20), { arrowEnd: { tip: 'stealth', fill: '#ffffff' }, style: { stroke: '#dc2626' } })
      .edge(point(0, 40), point(50, 40), { arrowEnd: { tip: 'stealth', color: '#2563eb' } })
      .toSVG({ width: 60, height: 50 })
    expect(marker(svg, 'arrow-stealth~o-dc2626')![1]).toMatch(/fill="none"[^>]*stroke="#dc2626"/)
    expect(marker(svg, 'arrow-stealth-dc2626-ffffff')![1]).toMatch(/fill="#ffffff"[^>]*stroke="#dc2626"/)
    expect(marker(svg, 'arrow-stealth-000000-2563eb')![1]).toContain('fill="#2563eb"')
  })

  it('several tips per end compose into one marker, first tip outermost', () => {
    const svg = picture()
      .edge(point(0, 0), point(50, 0), { arrowEnd: ['stealth', 'stealth'], arrowStart: ['bar', 'to'] })
      .toSVG({ width: 60, height: 10 })
    const end = marker(svg, 'arrow-stealth\\+stealth-000000')!
    expect(end[0]).toContain('viewBox="0 0 20 10"')
    expect(end[0]).toContain('refX="19"')
    expect(end[1]).toContain('transform="translate(10 0)"')
    const start = marker(svg, 'arrow-bar\\+to-start-000000')!
    expect(start[0]).toContain('refX="5"')
    expect(start[1]).toContain('transform="translate(10 0)"')
  })

  it('reversed swaps the artwork; sep pulls the tip back', () => {
    const svg = picture()
      .edge(point(0, 0), point(50, 0), { arrowEnd: { tip: 'to', reversed: true } })
      .edge(point(0, 20), point(50, 20), { arrowEnd: { tip: 'to', sep: 3 } })
      .toSVG({ width: 60, height: 30 })
    expect(marker(svg, 'arrow-to~r-000000')![1]).toContain('M 10 0 L 0 5 L 10 10 z')
    expect(marker(svg, 'arrow-to-000000-sep3')![0]).toContain('refX="14"')
  })

  it('the Edge reports its first tip name and the full lists', () => {
    const e = edge(point(0, 0), point(1, 1), { arrowEnd: ['latex', { tip: 'bar', sep: 2 }], arrowStart: '<-' })
    expect(e.arrowEnd).toBe('latex')
    expect(e.endTips).toHaveLength(2)
    expect(e.arrowStart).toBe('to')
    expect(edge(point(0, 0), point(1, 1)).endTips).toEqual([])
  })
})
