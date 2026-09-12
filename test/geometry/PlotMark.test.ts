import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import {
  plot,
  plotFromCoords,
  plotFromPoints,
} from '../../src/geometry/Plot'
import {
  PLOT_MARK_NAMES,
  plotMarkPath,
  plotMarkFilled,
} from '../../src/geometry/PlotMark'
import { SVGRenderer } from '../../src/render/SVGRenderer'

describe('PlotMark', () => {
  it('produces path data for every canonical mark', () => {
    for (const name of PLOT_MARK_NAMES) {
      const d = plotMarkPath(name)
      expect(d, name).toBeTruthy()
      expect(d.startsWith('M '), name).toBe(true)
    }
  })

  it('returns empty string for none and unknown names', () => {
    expect(plotMarkPath('none')).toBe('')
    expect(plotMarkPath('does-not-exist')).toBe('')
  })

  it('normalizes TikZ alias spellings', () => {
    expect(plotMarkPath('*')).toBe(plotMarkPath('asterisk'))
    expect(plotMarkPath('+')).toBe(plotMarkPath('plus'))
    expect(plotMarkPath('x')).toBe(plotMarkPath('cross'))
    expect(plotMarkPath('X')).toBe(plotMarkPath('cross'))
    expect(plotMarkPath('o')).toBe(plotMarkPath('circle'))
  })

  it('flags filled marks', () => {
    expect(plotMarkFilled('circleFilled')).toBe(true)
    expect(plotMarkFilled('squareFilled')).toBe(true)
    expect(plotMarkFilled('circle')).toBe(false)
    expect(plotMarkFilled('oplus')).toBe(false)
    expect(plotMarkFilled('asterisk')).toBe(false)
  })

  it('scales path data by size', () => {
    // A 10px circle spans ±5, a 4px circle spans ±2.
    expect(plotMarkPath('circle', 10)).toContain('5 0')
    expect(plotMarkPath('circle', 4)).toContain('2 0')
  })

  it('threads marks through plot factories', () => {
    expect(plotFromPoints([point(0, 0)], false, { name: 'circle' }).marks?.name).toBe('circle')
    expect(plotFromCoords([[0, 0]], false, { name: 'cross' }).marks?.name).toBe('cross')
    expect(plot(x => x, { domain: [0, 1], marks: { name: 'square' } }).marks?.name).toBe('square')
  })
})

describe('PlotMark rendering', () => {
  it('emits a marker path per point, translated to the point', () => {
    const renderer = new SVGRenderer()
    const p = plotFromPoints([point(10, 10), point(20, 30)], false, {
      name: 'circle',
      size: 6,
    })
    renderer.renderPlot(p)
    const svg = renderer.toSVG({ width: 40, height: 40 })

    expect(svg).toContain('translate(10 10)')
    expect(svg).toContain('translate(20 30)')
    // circle path with r = 3
    expect(svg).toContain('M 3 0 A 3 3 0 1 0 -3 0 A 3 3 0 1 0 3 0 Z')
    // open marks stroke the plot color
    expect(svg).toContain('fill="none"')
  })

  it('fills *Filled marks and strokes open marks', () => {
    const renderer = new SVGRenderer()
    renderer.renderPlot(plotFromPoints([point(5, 5)], false, { name: 'squareFilled' }))
    renderer.renderPlot(plotFromPoints([point(15, 5)], false, { name: 'plus' }))
    const svg = renderer.toSVG({ width: 30, height: 15 })

    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('fill="none"')
    expect(svg).toContain('stroke="#000000"')
  })

  it('honours the every option', () => {
    const renderer = new SVGRenderer()
    const p = plotFromPoints(
      [point(0, 0), point(1, 0), point(2, 0), point(3, 0)],
      false,
      { name: 'circle', every: 2 }
    )
    renderer.renderPlot(p)
    const svg = renderer.toSVG({ width: 10, height: 5 })

    // every=2 → indices 0 and 2 only
    expect(svg).toContain('translate(0 0)')
    expect(svg).toContain('translate(2 0)')
    expect(svg).not.toContain('translate(1 0)')
    expect(svg).not.toContain('translate(3 0)')
  })
})
