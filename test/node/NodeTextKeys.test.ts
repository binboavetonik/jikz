/** textWidth (wrap), align, node textStyle for measurement, pins, alias, sloped. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { node } from '../../src/node/Node'
import { line } from '../../src/geometry/Line'
import { basicShapes } from '../../src/geometry/shapes/basic'
import { wrapText } from '../../src/text/wrapText'

const tspans = (svg: string) => [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1])

describe('text width and align', () => {
  it('wrapText fills lines greedily and keeps \\n breaks', () => {
    expect(wrapText('aa bb cc dd', 30, { fontSize: 14 }).length).toBeGreaterThan(1)
    expect(wrapText('one\ntwo', 1000)).toEqual(['one', 'two'])
    expect(wrapText('averyveryverylongword x', 20)).toEqual(['averyveryverylongword', 'x'])
  })

  it('a wrapped node renders one tspan per line, aligned as asked', () => {
    const text = 'the quick brown fox jumps'
    const centred = picture({ shapes: basicShapes })
      .node('A', { at: point(100, 100), shape: 'rectangle', text, textWidth: 70 })
      .toSVG({ width: 200, height: 200 })
    const left = picture({ shapes: basicShapes })
      .node('A', { at: point(100, 100), shape: 'rectangle', text, textWidth: 70, align: 'left' })
      .toSVG({ width: 200, height: 200 })
    expect(tspans(centred).length).toBeGreaterThan(1)
    expect(centred).toMatch(/<text[^>]*text-anchor="middle"/)
    expect(left).toMatch(/<text[^>]*text-anchor="start"/)
    const x = Number(left.match(/<tspan x="([\d.]+)"/)![1])
    expect(x).toBeLessThan(100)
  })

  it('the node measures with its own textStyle, so a big font gets a big box', () => {
    const small = node({ text: 'Hello', shape: basicShapes.rectangle })
    const big = node({ text: 'Hello', shape: basicShapes.rectangle, textStyle: { fontSize: 28 } })
    expect(big.width).toBeGreaterThan(small.width)
    expect(big.height).toBeGreaterThan(small.height)
    const svg = picture({ shapes: basicShapes })
      .node('A', { at: point(50, 50), shape: 'rectangle', text: 'Hello', textStyle: { fontSize: 28, fill: '#dc2626' } })
      .toSVG({ width: 200, height: 100 })
    expect(svg).toMatch(/<text[^>]*fill="#dc2626"[^>]*font-size="28"/)
  })
})

describe('pins', () => {
  it('a pin is a label plus a thin line from the border', () => {
    const svg = picture({ shapes: basicShapes })
      .node('A', {
        at: point(100, 100),
        shape: 'circle',
        width: 40,
        height: 40,
        pins: [{ text: 'east pin', at: 'east' }, { text: 'up', at: 'north', edge: { stroke: '#dc2626' } }],
      })
      .toSVG({ width: 200, height: 200 })
    expect(svg).toContain('>east pin<')
    // the default pin edge is help-lines grey and thin; the second is red
    expect(svg).toMatch(/<line[^>]*stroke="#9ca3af"[^>]*stroke-width="0.6"/)
    expect(svg).toMatch(/<line[^>]*stroke="#dc2626"/)
    // the grey line starts on the east border (x = 120)
    expect(svg).toMatch(/<line[^>]*x1="120"[^>]*y1="100"/)
  })
})

describe('alias', () => {
  it('registers extra names for the same node', () => {
    const pic = picture({ shapes: basicShapes })
      .node('long name', { at: point(10, 10), alias: ['ln', 'L'] })
      .edge('ln', point(50, 50))
    expect(pic.resolve('L')).toEqual(pic.resolve('long name'))
    expect(() => pic.node('other', { alias: 'ln' })).toThrow(/alias "ln" already exists/)
  })
})

describe('sloped labels', () => {
  it('rotate along the tangent on edges, pens and draw verbs, kept readable', () => {
    const pic = picture()
      .edge(point(0, 0), point(100, 100), { label: { text: 'e', sloped: true } })
      .draw(line(point(0, 100), point(100, 0)), { label: { text: 'd', pos: 0.5, sloped: true } })
    pic.pen().moveTo(100, 0).lineTo(0, 0).label('p', { pos: 0.5, sloped: true })
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(svg).toMatch(/<text[^>]*transform="rotate\(45 [\d.]+ [\d.]+\)"[^>]*>e</)
    expect(svg).toMatch(/<text[^>]*transform="rotate\(-45 [\d.]+ [\d.]+\)"[^>]*>d</)
    // westward travel would be upside down (180°); it is flipped to 0,
    // and a zero rotation emits no transform at all.
    expect(svg).toMatch(/<text(?:(?!transform)[^>])*>p</)
  })
})
