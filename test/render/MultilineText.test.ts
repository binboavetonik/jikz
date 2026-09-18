/**
 * Multi-line text. `measureText` sizes a node for every `\n`-separated
 * line, but a newline inside `<text>` is whitespace to SVG — so a
 * two-line node used to be drawn tall and read as one line. Lines now
 * become `<tspan>`s; single-line text is emitted exactly as before.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { basicShapes } from '../../src/geometry/shapes/basic'
import { LINE_HEIGHT } from '../../src/text/measureText'
import { SVGRenderer } from '../../src/render/SVGRenderer'

const tspans = (svg: string) => [...svg.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)]

describe('multi-line text', () => {
  it('a node paints one tspan per line, centred on the node', () => {
    const svg = picture({ shapes: basicShapes })
      .node('A', { at: point(50, 50), shape: 'rectangle', text: 'one\ntwo\nthree' })
      .toSVG({ width: 100, height: 100 })
    const spans = tspans(svg)
    expect(spans.map((m) => m[2])).toEqual(['one', 'two', 'three'])
    expect(svg).not.toMatch(/>one\ntwo/)
    // The block is centred: the <text> y is one line above the centre.
    const y = Number(svg.match(/<text[^>]*\by="([\d.-]+)"/)![1])
    expect(y).toBeCloseTo(50 - 14 * LINE_HEIGHT)
    expect(spans[0]![1]).not.toContain('dy=')
    expect(spans[1]![1]).toContain(`dy="${14 * LINE_HEIGHT}"`)
    expect(spans[1]![1]).toContain('x="50"')
  })

  it('single-line text is unchanged', () => {
    const svg = picture({ shapes: basicShapes })
      .node('A', { at: point(50, 50), shape: 'rectangle', text: 'one' })
      .toSVG({ width: 100, height: 100 })
    expect(svg).not.toContain('<tspan')
    expect(svg).toMatch(/<text[^>]*>one<\/text>/)
  })

  it('bare text hangs subsequent lines below the first when not centred', () => {
    const r = new SVGRenderer()
    r.renderText('a\nb', point(10, 20), { fontSize: 10 })
    const svg = r.toSVG({ width: 100, height: 100 })
    expect(svg).toMatch(/<text[^>]*\by="20"/)
    const spans = tspans(svg)
    expect(spans).toHaveLength(2)
    expect(spans[1]![1]).toContain(`dy="${10 * LINE_HEIGHT}"`)
  })

  it('edge labels wrap too', () => {
    const svg = picture()
      .edge(point(0, 50), point(100, 50), { label: 'top\nbottom' })
      .toSVG({ width: 100, height: 100 })
    expect(tspans(svg).map((m) => m[2])).toEqual(['top', 'bottom'])
  })
})
