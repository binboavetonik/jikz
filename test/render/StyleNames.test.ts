/**
 * Style names as StyleSpec entries, picture-local styles, per-picture
 * arrow tips, and the unknown-name error policy.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { mergeStyles, registerStyle, styleList } from '../../src/render/StyleMapper'
import { JikzError } from '../../src/core/errors'
import { thick } from '../../src/render/presets'

describe('style names', () => {
  it('a bare string resolves to the built-in preset', () => {
    expect(mergeStyles('thick').strokeWidth).toBe(0.8)
    expect(styleList(['thick', { stroke: 'red' }])).toEqual([thick, { stroke: 'red' }])
  })

  it('an unknown name throws a JikzError with code unknown-name, listing what is known', () => {
    let err: unknown
    try {
      mergeStyles(['thick', 'nope'])
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(JikzError)
    expect((err as JikzError).code).toBe('unknown-name')
    expect((err as JikzError).message).toMatch(/"nope".*known: .*thick/)
  })

  it('picture-local styles resolve first and may name other styles', () => {
    const svg = picture({
      styles: {
        brand: { stroke: '#2563eb', strokeWidth: 2 },
        soft: ['brand', 'dashed'],
      },
    })
      .draw(circle(point(20, 20), 10), { style: 'soft' })
      .draw(circle(point(60, 20), 10), { style: ['brand', { strokeWidth: 5 }] })
      .toSVG({ width: 100, height: 40 })
    expect(svg).toMatch(/stroke="#2563eb" stroke-dasharray="3 3"[^>]*stroke-width="2"/)
    expect(svg).toMatch(/stroke="#2563eb"[^>]*stroke-width="5"/)
  })

  it('a local name shadows a registered one, only inside its picture', () => {
    registerStyle('shadowed', { stroke: '#000000' })
    const local = picture({ styles: { shadowed: { stroke: '#dc2626' } } })
      .draw(circle(point(20, 20), 10), { style: 'shadowed' })
      .toSVG({ width: 40, height: 40 })
    const global = picture()
      .draw(circle(point(20, 20), 10), { style: 'shadowed' })
      .toSVG({ width: 40, height: 40 })
    expect(local).toContain('stroke="#dc2626"')
    expect(global).toContain('stroke="#000000"')
  })

  it('scope styles and pen styles may be names too', () => {
    const pic = picture({ styles: { hot: { stroke: '#dc2626' } } })
    pic.scope({ style: 'hot' }, (s) => s.draw(circle(point(20, 20), 10)))
    pic.pen({ style: ['hot', { strokeWidth: 3 }] }).moveTo(0, 0).lineTo(10, 10)
    const svg = pic.toSVG({ width: 40, height: 40 })
    expect(svg.match(/stroke="#dc2626"/g)).toHaveLength(2)
  })

  it('a self-referencing local style is an error, not a hang', () => {
    expect(() =>
      picture({ styles: { loop: ['loop'] } })
        .draw(circle(point(0, 0), 1), { style: 'loop' })
        .toSVG({ width: 10, height: 10 })
    ).toThrow(/refers to itself/)
  })
})

describe('per-picture arrow tips', () => {
  it('a local tip resolves before the registry', () => {
    const svg = picture({
      arrowTips: {
        pennant: { filled: true, end: { d: 'M 0 0 L 10 5 L 0 5 Z', refX: 9 }, start: { d: 'M 10 0 L 0 5 L 10 5 Z', refX: 1 } },
        stealth: { filled: true, end: { d: 'M 0 0 L 10 5 Z', refX: 9 }, start: { d: 'M 10 0 L 0 5 Z', refX: 1 } },
      },
    })
      .edge(point(0, 10), point(50, 10), { arrowEnd: 'pennant' })
      .edge(point(0, 30), point(50, 30), { arrowEnd: 'stealth' })
      .toSVG({ width: 60, height: 40 })
    expect(svg).toContain('M 0 0 L 10 5 L 0 5 Z')
    expect(svg).toContain('M 0 0 L 10 5 Z') // the local override, not the built-in
    expect(svg).not.toContain('L 0 10 L 3 5')
  })
})
