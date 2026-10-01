/**
 * Math ink. Both ways of embedding a formula take their colour from
 * the PAGE unless told otherwise — KaTeX's HTML inherits CSS `color`,
 * MathJax's glyphs are `fill="currentColor"` — so on a dark-themed
 * page a formula went pale on a light node while the plain text
 * beside it stayed dark. Math now carries the colour plain text would
 * have had in its place: the text fill, else the pen, else black.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { basicShapes } from '../../src/geometry/shapes/basic'
import type { MathRenderer } from '../../src/render/MathRenderer'

const html: MathRenderer = { renderToString: (tex) => `<span class="katex">${tex}</span>` }
const svgOut: MathRenderer = { output: 'svg', renderToString: () => '<svg viewBox="0 0 1 1"><path fill="currentColor" d="M0 0"/></svg>' }

const node = (mathRenderer: MathRenderer | undefined, extra: Record<string, unknown> = {}) =>
  picture({ shapes: basicShapes, mathRenderer })
    .node('A', { at: point(50, 50), shape: 'rectangle', width: 60, height: 30, text: '$x^2$', ...extra })
    .toSVG({ width: 100, height: 100 })

/** The colour a math embedding carries, whichever kind it is. */
const inkOf = (svg: string): string | undefined =>
  svg.match(/<svg color="([^"]+)"[^>]*overflow="visible"/)?.[1] ?? svg.match(/font-size:\d+px;color:([^"]+)"/)?.[1]

describe('math takes the colour plain text would', () => {
  it('a node: the text fill, else the node stroke, else black — in both embeddings', () => {
    for (const renderer of [html, svgOut]) {
      expect(inkOf(node(renderer))).toBe('#000000')
      expect(inkOf(node(renderer, { style: { stroke: '#2563eb' } }))).toBe('#2563eb')
      expect(inkOf(node(renderer, { style: { stroke: '#2563eb' }, textStyle: { fill: '#dc2626' } }))).toBe('#dc2626')
    }
  })

  it('exactly the colour the plain text in that node has', () => {
    const plain = picture({ shapes: basicShapes })
      .node('A', { at: point(50, 50), shape: 'rectangle', width: 60, height: 30, text: 'x', style: { stroke: '#7c3aed' } })
      .toSVG({ width: 100, height: 100 })
    const plainFill = plain.match(/<text[^>]*fill="([^"]+)"/)![1]
    expect(inkOf(node(html, { style: { stroke: '#7c3aed' } }))).toBe(plainFill)
    expect(inkOf(node(svgOut, { style: { stroke: '#7c3aed' } }))).toBe(plainFill)
  })

  it('a node keeps the font size it was measured with', () => {
    expect(node(html, { textStyle: { fontSize: 22 } })).toContain('font-size:22px')
    expect(node(html)).toContain('font-size:14px')
  })

  it('an edge label: its own style, else the edge textStyle, else the pen', () => {
    const edge = (label: unknown, extra: Record<string, unknown> = {}) =>
      picture({ shapes: basicShapes, mathRenderer: svgOut })
        .node('A', { at: point(20, 50), shape: 'circle', width: 20, height: 20 })
        .node('B', { at: point(180, 50), shape: 'circle', width: 20, height: 20 })
        .edge('A', 'B', { label, ...extra } as never)
        .toSVG({ width: 200, height: 100 })
    expect(inkOf(edge('$a$'))).toBe('#000000')
    expect(inkOf(edge('$a$', { style: { stroke: '#16a34a' } }))).toBe('#16a34a')
    expect(inkOf(edge('$a$', { style: { stroke: '#16a34a' }, textStyle: { fill: '#f59e0b' } }))).toBe('#f59e0b')
    expect(inkOf(edge({ text: '$a$', style: { fill: '#0ea5e9' } }, { textStyle: { fill: '#f59e0b' } }))).toBe('#0ea5e9')
  })

  it('bare text: its fill', () => {
    const bare = (style?: Record<string, unknown>) => {
      const pic = picture({ mathRenderer: html })
      pic.text(point(50, 50), '$y$', style ? { style } : undefined)
      return pic.toSVG({ width: 100, height: 100 })
    }
    expect(inkOf(bare({ fill: '#be123c', fontSize: 18 }))).toBe('#be123c')
    expect(bare({ fill: '#be123c', fontSize: 18 })).toContain('font-size:18px')
    expect(inkOf(bare())).toBe('#000000')
  })

  it('the no-renderer fallback is that colour too, not always black', () => {
    const svg = node(undefined, { style: { stroke: '#2563eb' } })
    expect(svg).toMatch(/<text[^>]*fill="#2563eb"[^>]*font-style="italic"[^>]*>\$x\^2\$</)
  })
})
