/**
 * Enter animations — dataviz phase 6: the keyframe builder, the
 * per-kind animations on lines, areas, bars, scatter and candles, the
 * chart-level stagger, and the view playing them once.
 */
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import { parseDuration, enterKeyframe, staggered, normalizeEnter } from '../../../src/ext/dataviz/animate'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart, type ChartOptions } from '../../../src/ext/dataviz/chart'
import { chartView } from '../../../src/ext/dataviz/view'

const at = point(50, 200)
const frame10 = (pic: ReturnType<typeof picture>) =>
  axes(pic, { at, width: 100, height: 100, x: { domain: [0, 10], exact: true }, y: { domain: [0, 10], exact: true } })

describe('keyframes', () => {
  it('parseDuration reads ms, s and numbers', () => {
    expect(parseDuration('800ms')).toBe(800)
    expect(parseDuration('0.8s')).toBe(800)
    expect(parseDuration(250)).toBe(250)
    expect(parseDuration('nope', 7)).toBe(7)
    expect(parseDuration(undefined, 3)).toBe(3)
    expect(parseDuration(-5)).toBe(0)
  })

  it('enterKeyframe starts at 0 and holds the start value through the delay', () => {
    expect(enterKeyframe('opacity', 0, 1, { enter: 'fade' })).toEqual({
      attributeName: 'opacity',
      values: '0;1',
      keyTimes: '0;1',
      calcMode: 'spline',
      keySplines: '0 0 0.2 1',
      dur: '800ms',
      begin: '0s',
      fill: 'freeze',
    })
    const held = enterKeyframe('y', 10, 4, { enter: 'grow', dur: '600ms', delay: '200ms', easing: 'linear' })
    expect(held.values).toBe('10;10;4')
    expect(held.keyTimes).toBe('0;0.25;1')
    expect(held.keySplines).toBe('0 0 1 1;0 0 1 1')
    expect(held.dur).toBe('800ms')
    expect(enterKeyframe('x', 0, 1, { enter: 'fade', easing: '0.4 0 0.2 1' }).keySplines).toBe('0.4 0 0.2 1')
  })

  it('staggered adds the series index times the stagger to the delay', () => {
    expect(staggered({ enter: 'draw' }, 0).delay).toBe('0ms')
    expect(staggered({ enter: 'draw' }, 2).delay).toBe('160ms')
    expect(staggered({ enter: 'draw', delay: '100ms', stagger: '50ms' }, 3)).toEqual({ enter: 'draw', delay: '250ms' })
    expect(normalizeEnter('fade')).toEqual({ enter: 'fade' })
  })
})

describe('series enter animations', () => {
  it('a line draws itself in: pathLength 1, unit dash, dashoffset 1 → 0; its marks fade', () => {
    const pic = picture()
    frame10(pic).line([[0, 0], [10, 10]], { enter: 'draw', marks: 'o' })
    const svg = pic.toSVG({ width: 200, height: 220 })
    const line = svg.match(/<path class="jikz-series[^>]*d="M 50 200 L 150 100"[^>]*>(.*?)<\/path>/)!
    expect(line[0]).toMatch(/pathLength="1"/)
    expect(line[0]).toMatch(/stroke-dasharray="1"/)
    expect(line[1]).toBe(
      '<animate attributeName="stroke-dashoffset" begin="0s" calcMode="spline" dur="800ms" fill="freeze" keySplines="0 0 0.2 1" keyTimes="0;1" values="1;0"/>'
    )
    expect(svg).toMatch(/data-index="0"[^>]*><animate attributeName="opacity"[^>]*values="0;1"/)
  })

  it('a dashed line falls back to a fade; a plain call has no animation', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.line([[0, 0], [10, 10]], { enter: 'draw', style: { dash: 'dashed' } })
    frame.line([[0, 1], [10, 9]])
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).not.toContain('pathLength')
    expect(svg).toMatch(/stroke-dasharray="3 3"[^>]*><animate attributeName="opacity"/)
    expect(svg.match(/<animate/g)).toHaveLength(1)
  })

  it('bars grow from the baseline, y and height together, or fade', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.bars([[2, 4], [5, -2]], { enter: { enter: 'grow', dur: '500ms' }, baseline: 0 })
    frame.bars([[8, 3]], { enter: 'fade' })
    const svg = pic.toSVG({ width: 200, height: 220 })
    const bars = svg.match(/<rect[^>]*>(.*?)<\/rect>/g)!
    expect(bars[0]).toContain('attributeName="y" begin="0s" calcMode="spline" dur="500ms" fill="freeze" keySplines="0 0 0.2 1" keyTimes="0;1" values="200;160"')
    expect(bars[0]).toContain('attributeName="height"')
    expect(bars[0]).toContain('values="0;40"')
    // A negative bar keeps its top at the baseline and grows down.
    expect(bars[1]).toContain('values="200;200"')
    expect(bars[1]).toContain('values="0;20"')
    expect(bars[2]).toContain('attributeName="opacity"')
  })

  it('an area fades its fill to its own opacity while its edge draws; scatter and candles fade', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.area([[0, 2], [10, 4]], { enter: 'draw' })
    frame.scatter([[5, 5]], { enter: 'fade' })
    frame.candlestick([[7, 3, 6, 2, 5]], { enter: 'draw', width: 4 })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toMatch(/stroke="none"[^>]*><animate attributeName="fill-opacity"[^>]*values="0;0.25"/)
    expect(svg).toMatch(/pathLength="1"[^>]*><animate attributeName="stroke-dashoffset"/)
    expect(svg).toMatch(/A 4 4[^>]*><animate attributeName="opacity"/)
    expect(svg.match(/data-series="series-2"[^>]*><animate attributeName="opacity"/g)).toHaveLength(2)
  })

  it('chart() staggers a chart-level enter; a series enter overrides', () => {
    const spec: ChartOptions = {
      at,
      width: 100,
      height: 100,
      series: [
        { data: [[0, 0], [1, 1]], id: 'a' },
        { data: [[0, 0], [1, 1]], id: 'b' },
        { data: [[0, 0], [1, 1]], id: 'c', enter: 'fade' },
      ],
      enter: { enter: 'draw', stagger: '100ms', dur: '400ms' },
    }
    const pic = picture()
    chart(pic, spec)
    const svg = pic.toSVG({ width: 200, height: 220 })
    const anims = svg.match(/<animate[^>]*>/g)!
    expect(anims).toHaveLength(3)
    expect(anims[0]).toContain('attributeName="stroke-dashoffset"')
    expect(anims[0]).toContain('dur="400ms"')
    expect(anims[0]).toContain('values="1;0"')
    expect(anims[1]).toContain('dur="500ms"')
    expect(anims[1]).toContain('keyTimes="0;0.2;1"')
    expect(anims[1]).toContain('values="1;1;0"')
    expect(anims[2]).toContain('attributeName="opacity"')
    expect(anims[2]).toContain('dur="800ms"')
  })

  it('the static output IS the final state: strip the animations and the plain chart remains', () => {
    const spec: ChartOptions = {
      at,
      width: 100,
      height: 100,
      x: { categories: ['a', 'b', 'c'] },
      series: [
        { data: [['a', 3], ['b', 5], ['c', 2]], kind: 'bar', enter: 'grow' },
        { data: [['a', 1], ['b', 4], ['c', 3]], kind: 'area', marks: 'o' },
        { data: [['a', 2], ['b', 2], ['c', 4]], style: { dash: 'dashed' } },
        { data: [[0, 1, 2, 0, 1]], kind: 'candlestick' },
      ],
      enter: 'draw',
    }
    const animated = picture()
    chart(animated, spec)
    const plain = picture()
    chart(plain, { ...spec, enter: undefined, series: spec.series.map(({ enter: _e, ...s }) => s) })
    const stripped = animated
      .toSVG({ width: 200, height: 220 })
      .replace(/<animate [^>]*\/>/g, '')
      .replace(/ pathLength="1"| stroke-dasharray="1"| stroke-dashoffset="0"/g, '')
      // An element that had children closes with a tag; empty, it self-closes.
      .replace(/><\/(rect|path|line)>/g, '/>')
    expect(stripped).toBe(plain.toSVG({ width: 200, height: 220 }))
  })

  it('the view plays the entrance once: not on zoom, not on update unless asked', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const spec: ChartOptions = {
      at,
      width: 100,
      height: 100,
      series: [{ data: [[0, 0], [10, 10]], id: 'a' }],
      enter: 'draw',
    }
    const view = chartView(container, spec)
    expect(view.svg.querySelector('animate')).not.toBeNull()
    view.setDomain([2, 4])
    expect(view.svg.querySelector('animate')).toBeNull()
    view.resetZoom()
    expect(view.svg.querySelector('animate')).toBeNull()
    // Streaming: an update is not an entrance…
    view.update({ ...spec, series: [{ data: [[0, 1], [10, 9]], id: 'a' }] })
    expect(view.svg.querySelector('animate')).toBeNull()
    // …unless the caller says this one is.
    view.update({ ...spec, series: [{ data: [[0, 2], [10, 8]], id: 'a' }] }, { enter: true })
    expect(view.svg.querySelector('animate')).not.toBeNull()
    view.destroy()
  })
})
