/**
 * Fadings — pinned against `pgflibraryfadings.code.tex`, whose four
 * axial fadings hold opacity for a quarter of the span and whose
 * radial ones sit on a 100bp canvas with the circle edge at 25bp of a
 * 50bp shading.
 */
import { describe, it, expect } from 'vitest'
import {
  fadings,
  axialFading,
  circleFading,
  ringFading,
  FADE_OPAQUE,
  FADE_TRANSPARENT,
} from '../../../src/ext/fadings'
import type { LinearGradientSpec, RadialGradientSpec } from '../../../src/render/Gradient'
import { picture } from '../../../src/picture/Picture'
import { rect } from '../../../src/geometry/Rectangle'
import { circle } from '../../../src/geometry/Circle'
import { point } from '../../../src/core/Point'

const offsets = (f: { gradient: { stops: { offset: number; color: string }[] } }) =>
  f.gradient.stops.map((s) => s.offset)
const colors = (f: { gradient: { stops: { offset: number; color: string }[] } }) =>
  f.gradient.stops.map((s) => s.color)

describe('PGF transparency colors', () => {
  it('reads pgftransparent!0 as opaque white and !100 as transparent black', () => {
    expect(FADE_OPAQUE).toBe('#ffffff')
    expect(FADE_TRANSPARENT).toBe('#000000')
  })
})

describe('axial fadings', () => {
  it('holds opacity for a quarter, ramps a half, holds transparency for a quarter', () => {
    // color(0bp)=!0 color(25bp)=!0 color(75bp)=!100 color(100bp)=!100
    expect(offsets(fadings.east)).toEqual([0, 0.25, 0.75, 1])
    expect(colors(fadings.east)).toEqual([
      FADE_OPAQUE,
      FADE_OPAQUE,
      FADE_TRANSPARENT,
      FADE_TRANSPARENT,
    ])
  })

  it('points each of the four at the side it names', () => {
    const angle = (f: { gradient: unknown }) => (f.gradient as LinearGradientSpec).angle
    expect(angle(fadings.east)).toBe(0)
    expect(angle(fadings.north)).toBe(90)
    expect(angle(fadings.west)).toBe(180)
    expect(angle(fadings.south)).toBe(270)
  })

  it('fades towards the named side, not away from it', () => {
    // east: opaque at the west edge, gone by the east one.
    const svg = picture()
      .fill(rect(0, 0, 100, 50), { style: { fill: '#000', fading: fadings.east } })
      .toSVG({ width: 100, height: 50 })
    const grad = svg.match(/<linearGradient[^>]*x1="([\d.]+)%"[^>]*x2="([\d.]+)%"/)!
    expect(Number(grad[1])).toBe(0) // offset 0 — the opaque stop — sits west
    expect(Number(grad[2])).toBe(100)
  })

  it('is what fading angle produces for an arbitrary direction', () => {
    expect(axialFading(45).gradient).toMatchObject({ type: 'linear', angle: 45 })
    expect(offsets(axialFading(45))).toEqual([0, 0.25, 0.75, 1])
  })
})

describe('circular fadings', () => {
  it('places the fuzzy band inside an edge at half the shading radius', () => {
    // 22.5bp / 21.25bp / 20bp of 50bp, with the edge at 25bp.
    expect(offsets(fadings['circle with fuzzy edge 10 percent'])).toEqual([0, 0.45, 0.5, 1])
    expect(offsets(fadings['circle with fuzzy edge 15 percent'])).toEqual([0, 0.425, 0.5, 1])
    expect(offsets(fadings['circle with fuzzy edge 20 percent'])).toEqual([0, 0.4, 0.5, 1])
  })

  it('is opaque in the middle and transparent past the rim', () => {
    expect(colors(circleFading(10))).toEqual([
      FADE_OPAQUE,
      FADE_OPAQUE,
      FADE_TRANSPARENT,
      FADE_TRANSPARENT,
    ])
    expect((circleFading(10).gradient as RadialGradientSpec).type).toBe('radial')
  })

  it('peaks the ring halfway across the band the disc would have faded', () => {
    // color(21.25bp)=!100 color(23.125bp)=!0 color(25bp)=!100
    expect(offsets(fadings['fuzzy ring 15 percent'])).toEqual([0, 0.425, 0.4625, 0.5, 1])
    expect(colors(ringFading(15))).toEqual([
      FADE_TRANSPARENT,
      FADE_TRANSPARENT,
      FADE_OPAQUE,
      FADE_TRANSPARENT,
      FADE_TRANSPARENT,
    ])
  })

  it('clamps a nonsense percentage instead of inverting the band', () => {
    expect(offsets(circleFading(0))).toEqual([0, 0.5, 0.5, 1])
    expect(offsets(circleFading(100))).toEqual([0, 0, 0.5, 1])
    expect(offsets(circleFading(-20))).toEqual([0, 0.5, 0.5, 1])
    expect(offsets(circleFading(400))).toEqual([0, 0, 0.5, 1])
  })
})

describe('rendering', () => {
  it('builds a mask fitted to the element, TikZ fit fading=true', () => {
    const svg = picture()
      .fill(rect(0, 0, 100, 50), { style: { fill: '#2563eb', fading: fadings.east } })
      .toSVG({ width: 100, height: 50 })
    expect(svg).toContain('maskContentUnits="objectBoundingBox"')
    expect(svg).toMatch(/<rect[^>]*height="1"[^>]*width="1"[^>]*x="0"[^>]*y="0"/)
    expect(svg).toMatch(/<rect[^>]*mask="url\(#jikz-fading-/)
  })

  it('builds each distinct fading once and shares it', () => {
    const pic = picture()
    for (let i = 0; i < 4; i++) {
      pic.fill(rect(i * 30, 0, 20, 20), { style: { fading: fadings.east } })
    }
    pic.fill(rect(0, 40, 20, 20), { style: { fading: fadings.west } })
    const svg = pic.toSVG({ width: 140, height: 70 })
    expect(svg.match(/<mask /g)).toHaveLength(2)
    expect(svg.match(/mask="url\(#/g)).toHaveLength(5)
  })

  it('puts a scope fading on the group, like scope clip', () => {
    const svg = picture()
      .scope({ fading: circleFading(20) }, (s) => {
        s.fill(circle(point(40, 40), 30), { style: { fill: '#dc2626' } })
        s.fill(rect(0, 0, 20, 20), { style: { fill: '#2563eb' } })
      })
      .toSVG({ width: 90, height: 90 })
    expect(svg).toMatch(/<g[^>]*mask="url\(#jikz-fading-/)
    // The members are not individually masked — the group is.
    expect(svg.match(/mask="url\(#/g)).toHaveLength(1)
  })

  it('leaves a path alone when no fading is set', () => {
    const svg = picture()
      .fill(rect(0, 0, 10, 10), { style: { fill: '#000' } })
      .toSVG({ width: 10, height: 10 })
    expect(svg).not.toContain('mask')
  })

  it('composes with a gradient fill — a faded shading', () => {
    const svg = picture()
      .fill(rect(0, 0, 100, 50), {
        style: {
          gradient: { type: 'linear', angle: 0, stops: [
            { offset: 0, color: '#2563eb' },
            { offset: 1, color: '#7c3aed' },
          ] },
          fading: fadings.south,
        },
      })
      .toSVG({ width: 100, height: 50 })
    expect(svg).toMatch(/fill="url\(#jikz-gradient-/)
    expect(svg).toMatch(/mask="url\(#jikz-fading-/)
    expect(svg.match(/<linearGradient /g)).toHaveLength(2) // the fill and the mask
  })
})
