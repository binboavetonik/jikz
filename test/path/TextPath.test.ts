import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { path, circlePath } from '../../src/path/Path'
import { TextPath, textAlongPath } from '../../src/path/TextPath'
import { isTextPath } from '../../src/render/Renderer'
import { picture } from '../../src/picture/Picture'

const straight = () => path().moveTo(point(0, 0)).lineTo(point(200, 0))

describe('textAlongPath', () => {
  it('returns a TextPath carrying the guide path unchanged by default', () => {
    const base = straight()
    const tp = textAlongPath(base, 'hello')
    expect(tp).toBeInstanceOf(TextPath)
    expect(tp.path).toBe(base)
    expect(tp.text).toBe('hello')
    expect(tp.toSVGPath()).toBe(base.toSVGPath())
    expect(tp.bounds).toEqual(base.bounds)
  })

  it('reverses the guide for side: right (arcs included, via resampling)', () => {
    // A circle guide: Path.reverse would drop the arc segments, so
    // side 'right' must resample instead.
    const guide = circlePath(point(100, 100), 50)
    const tp = textAlongPath(guide, 'round', { side: 'right' })
    expect(tp.path.segments.length).toBeGreaterThan(50)
    const first = tp.path.startPoint!
    const orig = guide.startPoint!
    expect(first.x).toBeCloseTo(orig.x, 0)
    expect(first.y).toBeCloseTo(orig.y, 0)
  })
})

describe('isTextPath', () => {
  it('recognizes TextPath via the kind tag', () => {
    expect(isTextPath(textAlongPath(straight(), 'x'))).toBe(true)
    expect(isTextPath(straight())).toBe(false)
  })
})

describe('TextPath rendering', () => {
  it('defines the guide in <defs> and rides it with <textPath>', () => {
    const svg = picture()
      .draw(textAlongPath(straight(), 'hello world'))
      .toSVG({ width: 220, height: 40 })

    expect(svg).toContain('<defs>')
    expect(svg).toMatch(/<path[^>]*id="jikz-textpath-0"/)
    expect(svg).toContain('href="#jikz-textpath-0"')
    expect(svg).toContain('startOffset="0%"')
    expect(svg).toContain('>hello world</textPath>')
    // The guide path itself is never painted outside defs.
    const pathsOutsideDefs = svg.split('</defs>')[1]!
    expect(pathsOutsideDefs).not.toContain('M 0 0 L 200 0')
  })

  it('derives startOffset from anchor when not given', () => {
    const svg = picture()
      .draw(textAlongPath(straight(), 'centered', { anchor: 'middle' }))
      .toSVG({ width: 220, height: 40 })
    expect(svg).toContain('startOffset="50%"')
    expect(svg).toContain('text-anchor="middle"')
  })

  it('honors an explicit startOffset', () => {
    const svg = picture()
      .draw(textAlongPath(straight(), 'tail', { startOffset: 0.75, anchor: 'end' }))
      .toSVG({ width: 220, height: 40 })
    expect(svg).toContain('startOffset="75%"')
    expect(svg).toContain('text-anchor="end"')
  })

  it('takes the text color from the resolved stroke', () => {
    const svg = picture()
      .draw(textAlongPath(straight(), 'red'), { style: { stroke: '#cc0000' } })
      .toSVG({ width: 220, height: 40 })
    expect(svg).toContain('fill="#cc0000"')
  })

  it('prefers the TextPath color option over the stroke', () => {
    const svg = picture()
      .draw(textAlongPath(straight(), 'blue', { color: '#0000cc' }), {
        style: { stroke: '#cc0000' },
      })
      .toSVG({ width: 220, height: 40 })
    expect(svg).toContain('fill="#0000cc"')
  })

  it('escapes text content', () => {
    const svg = picture()
      .draw(textAlongPath(straight(), 'a < b & "c"'))
      .toSVG({ width: 220, height: 40 })
    expect(svg).toContain('a &lt; b &amp; &quot;c&quot;')
  })
})
