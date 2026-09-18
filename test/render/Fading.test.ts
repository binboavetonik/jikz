/** Fadings — TikZ `path fading` / `scope fading` as SVG masks. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { rect } from '../../src/geometry/Rectangle'
import { circle } from '../../src/geometry/Circle'
import { normalizeFading, FADING_NAMES } from '../../src/render/Fading'

describe('fadings', () => {
  it('named fadings are pgf’s ramps', () => {
    expect(FADING_NAMES).toContain('circle with fuzzy edge')
    expect(normalizeFading('west').stops.map((s) => s.opacity)).toEqual([0, 0, 1, 1])
    expect(normalizeFading('fade out')).toMatchObject({ type: 'radial', stops: [{ offset: 0, opacity: 1 }, { offset: 1, opacity: 0 }] })
    expect(() => normalizeFading('nope' as never)).toThrow(/Unknown fading/)
  })

  it('a style fading becomes a mask def in bounding-box units, shared by equal specs', () => {
    const svg = picture()
      .fill(rect(0, 0, 100, 50), { style: { fill: '#2563eb', fading: 'east' } })
      .fill(circle(point(150, 25), 20), { style: { fill: '#dc2626', fading: 'east' } })
      .fill(circle(point(200, 25), 20), { style: { fill: '#dc2626', fading: { type: 'radial', stops: [{ offset: 0, opacity: 1 }, { offset: 1, opacity: 0.2 }] } } })
      .toSVG({ width: 240, height: 50 })
    expect(svg.match(/<mask /g)).toHaveLength(2)
    expect(svg).toMatch(/<mask id="jikz-fading-linear-0-[\w-]+" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox"/)
    expect(svg).toContain('stop-color="#ffffff" stop-opacity="0"')
    expect(svg.match(/mask="url\(#jikz-fading-linear/g)).toHaveLength(2)
    expect(svg).toMatch(/<radialGradient[^>]*>.*stop-opacity="0.2"/)
  })

  it('a scope fading masks the whole group', () => {
    const pic = picture()
    pic.scope({ fading: 'south' }, (s) => s.fill(rect(0, 0, 10, 10)).fill(rect(20, 0, 10, 10)))
    const svg = pic.toSVG({ width: 40, height: 10 })
    expect(svg).toMatch(/<g mask="url\(#jikz-fading-linear-90[\w-]*\)">/)
    expect(svg.match(/mask=/g)).toHaveLength(1)
  })
})
