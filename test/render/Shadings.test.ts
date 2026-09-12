import { describe, it, expect } from 'vitest'
import {
  axisShading,
  radialShading,
  ballShading,
  resolveShading,
} from '../../src/render/Shadings'

describe('axisShading', () => {
  it('builds a linear spec with from/to stops', () => {
    expect(axisShading('red', 'blue', 0)).toEqual({
      type: 'linear',
      angle: 0,
      stops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' },
      ],
    })
  })

  it('inserts a middle stop at 0.5 when given', () => {
    const spec = axisShading('red', 'blue', 0, 'green')
    expect(spec.stops).toHaveLength(3)
    expect(spec.stops[1]).toEqual({ offset: 0.5, color: 'green' })
  })
})

describe('radialShading', () => {
  it('builds a radial spec centered with inner→outer stops', () => {
    expect(radialShading('#ffffff', '#000000')).toEqual({
      type: 'radial',
      cx: 0.5,
      cy: 0.5,
      r: 0.5,
      stops: [
        { offset: 0, color: '#ffffff' },
        { offset: 1, color: '#000000' },
      ],
    })
  })
})

describe('ballShading', () => {
  it('offsets the focal point and adds a highlight/shadow ramp', () => {
    const spec = ballShading('#dc2626')
    expect(spec.type).toBe('radial')
    expect(spec.fx).toBe(0.35)
    expect(spec.fy).toBe(0.35)
    expect(spec.stops).toHaveLength(3)
    expect(spec.stops[0]!.color).not.toBe('#dc2626') // highlight
    expect(spec.stops[1]!.color).toBe('#dc2626')     // the color
    expect(spec.stops[2]!.color).not.toBe('#dc2626') // shadow
  })
})

describe('resolveShading', () => {
  it('prefers an explicit gradient spec', () => {
    const spec = { type: 'radial' as const, stops: [] }
    expect(resolveShading({ gradient: spec })).toBe(spec)
  })

  it('maps left/rightColor to a horizontal axis shading', () => {
    const spec = resolveShading({ leftColor: 'red', rightColor: 'blue' })
    expect(spec.type).toBe('linear')
    expect((spec as { angle: number }).angle).toBe(0)
    expect(spec.stops.map((s) => s.color)).toEqual(['red', 'blue'])
  })

  it('maps top/bottomColor to a vertical axis shading', () => {
    const spec = resolveShading({ topColor: 'red', bottomColor: 'blue' })
    expect(spec.type).toBe('linear')
    expect((spec as { angle: number }).angle).toBe(270)
    expect(spec.stops.map((s) => s.color)).toEqual(['red', 'blue'])
  })

  it('maps inner/outerColor to a radial shading', () => {
    const spec = resolveShading({ innerColor: 'white', outerColor: 'black' })
    expect(spec.type).toBe('radial')
    expect(spec.stops.map((s) => s.color)).toEqual(['white', 'black'])
  })

  it('maps ballColor to a ball shading', () => {
    const spec = resolveShading({ ballColor: '#dc2626' })
    expect(spec.type).toBe('radial')
    expect((spec as { fx?: number }).fx).toBe(0.35)
  })

  it('resolves named shadings', () => {
    expect(resolveShading({ shading: 'radial' }).type).toBe('radial')
    expect(resolveShading({ shading: 'ball' }).type).toBe('radial')
    expect(resolveShading({ shading: 'axis' }).type).toBe('linear')
  })

  it('defaults to a vertical axis shading', () => {
    const spec = resolveShading()
    expect(spec.type).toBe('linear')
    expect((spec as { angle: number }).angle).toBe(90)
  })
})
