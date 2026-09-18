/** spy — a clipped, magnified replay of the picture. */
import { describe, it, expect } from 'vitest'
import { spy } from '../../../src/ext/spy'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { circle } from '../../../src/geometry/Circle'

describe('spy', () => {
  it('replays what was drawn, scaled about `on` into a clipped lens at `in`, with outlines', () => {
    const pic = picture().fill(circle(point(50, 50), 5), { style: { fill: '#dc2626' } })
    spy(pic, { on: point(50, 50), in: point(200, 50), magnification: 4, size: 60 })
    pic.fill(circle(point(50, 80), 5), { style: { fill: '#2563eb' } }) // after the spy: not replayed
    const svg = pic.toSVG({ width: 260, height: 100 })
    // the clip is the region in scope coordinates; the transform carries it onto the lens
    expect(svg).toMatch(/<clipPath id="jikz-clip-0"><path d="M 42.5 50 A 7.5 7.5/)
    // the replayed red disc, inside a clipped, transformed group
    // translate(in) ∘ scale(4) ∘ translate(−on): e = 200 − 4·50 = 0, f = 50 − 4·50 = −150
    expect(svg).toContain('<g clip-path="url(#jikz-clip-0)" transform="matrix(4 0 0 4 0 -150)">')
    expect(svg.match(/fill="#dc2626"/g)).toHaveLength(2)
    expect(svg.match(/fill="#2563eb"/g)).toHaveLength(1)
    // outlines: the region (r 7.5) and the lens (r 30), and the connection
    expect(svg).toMatch(/<circle cx="50" cy="50"[^>]*r="7.5"[^>]*stroke-width="0.2"/)
    expect(svg).toMatch(/<circle cx="200" cy="50"[^>]*r="30"[^>]*stroke-width="0.8"/)
    expect(svg).toMatch(/<line[^>]*x1="57.5"[^>]*x2="170"/)
  })

  it('lens transform maps `on` to `in`', () => {
    const pic = picture()
    spy(pic, { on: point(10, 20), in: point(100, 200), magnification: 2, size: 40, connect: false, shape: 'rectangle' })
    const svg = pic.toSVG({ width: 300, height: 300 })
    // translate(in) ∘ scale(m) ∘ translate(-on): e = 100 - 2·10 = 80, f = 200 - 2·20 = 160
    expect(svg).toContain('transform="matrix(2 0 0 2 80 160)"')
    expect(svg).toMatch(/<rect[^>]*height="40"[^>]*width="40"[^>]*x="80"[^>]*y="180"/) // the lens outline
    expect(svg).toMatch(/<clipPath[^>]*><path d="M 0 10 L 20 10 L 20 30 L 0 30 Z"/) // the region, in scope space
    expect(svg).not.toContain('<line')
  })

  it('fit stops at the lens, not at the magnified content', () => {
    const pic = picture().fill(circle(point(50, 50), 5))
    spy(pic, { on: point(50, 50), in: point(200, 50), magnification: 4, size: 60, connect: false })
    const b = pic.contentBounds()!
    expect(b[2]).toBeCloseTo(230) // lens right edge, not 4× the disc
    expect(b[1]).toBeCloseTo(20)
  })

  it('works in a math-frame picture', () => {
    const pic = picture({ frame: 'math', unit: 10 }).fill(circle(point(1, 1), 0.2))
    spy(pic, { on: point(1, 1), in: point(5, 1), magnification: 2, size: 20 })
    const svg = pic.toSVG({ fit: true })
    expect(svg).toContain('transform="matrix(2 0 0 2 30 10)"') // in=(50,-10), on=(10,-10)
  })
})
