import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { path } from '../../src/path/Path'
import {
  MarkedPath,
  markPath,
} from '../../src/path/MarkedPath'
import { picture } from '../../src/picture/Picture'
import { registerArrowTip } from '../../src/render/ArrowTip'
import { isMarkedPath } from '../../src/render/Renderer'

const straight = () => path().moveTo(point(0, 0)).lineTo(point(100, 0))

describe('markPath', () => {
  it('returns a MarkedPath wrapping the base path', () => {
    const base = straight()
    const mp = markPath(base, { mark: 'stealth', at: 0.5 })
    expect(mp).toBeInstanceOf(MarkedPath)
    expect(mp.path).toBe(base)
    expect(mp.toSVGPath()).toBe(base.toSVGPath())
    expect(mp.bounds).toEqual(base.bounds)
  })

  it('places a single mark at the default position 0.5', () => {
    const mp = markPath(straight(), { mark: 'stealth' })
    expect(mp.marks).toHaveLength(1)
    expect(mp.marks[0]!.point.x).toBeCloseTo(50)
    expect(mp.marks[0]!.point.y).toBeCloseTo(0)
  })

  it('rotates arrow tips with the tangent', () => {
    const up = path().moveTo(point(0, 0)).lineTo(point(0, 100))
    const mp = markPath(up, { mark: 'stealth', at: 0.5 })
    expect(mp.marks[0]!.angle).toBeCloseTo(90) // screen convention: down is +90
  })

  it('keeps plot marks upright', () => {
    const up = path().moveTo(point(0, 0)).lineTo(point(0, 100))
    const mp = markPath(up, { mark: { plotMark: 'cross' }, at: 0.5 })
    expect(mp.marks[0]!.angle).toBe(0)
  })

  it('expands `at` lists and `between`/`step` ranges', () => {
    const mp = markPath(straight(), { mark: 'to', at: [0.25, 0.75] })
    expect(mp.marks.map((m) => m.point.x)).toEqual([25, 75])

    const rep = markPath(straight(), { mark: 'bar', between: [0, 1], step: 0.25 })
    expect(rep.marks.map((m) => Math.round(m.point.x))).toEqual([0, 25, 50, 75, 100])
  })

  it('combines multiple specs in order', () => {
    const mp = markPath(
      straight(),
      { mark: 'stealth', at: 0.5 },
      { mark: { plotMark: 'plus' }, at: [0.25, 0.75] }
    )
    expect(mp.marks).toHaveLength(3)
  })

  it('resolves names present in both namespaces as arrow tips', () => {
    // 'circle' is both an arrow tip and a plot mark — the tip wins.
    const mp = markPath(straight(), { mark: 'circle', at: 0.5 })
    expect(mp.marks[0]!.refY).toBe(5) // arrow-tip artwork box
    const forced = markPath(straight(), { mark: { plotMark: 'circle' }, at: 0.5 })
    expect(forced.marks[0]!.refY).toBe(0) // plot marks center on the origin
  })

  it('accepts custom artwork', () => {
    const mp = markPath(straight(), {
      mark: { d: 'M 0 0 L 8 4 L 0 8 Z', refX: 4, refY: 4, rotate: false },
      at: 0.5,
    })
    expect(mp.marks[0]!.d).toBe('M 0 0 L 8 4 L 0 8 Z')
    expect(mp.marks[0]!.angle).toBe(0)
    expect(mp.marks[0]!.filled).toBe(true)
  })

  it('accepts user-registered arrow tips', () => {
    registerArrowTip('pennant', {
      filled: true,
      end: { d: 'M 0 0 L 10 5 L 0 10 Z', refX: 9 },
      start: { d: 'M 10 0 L 0 5 L 10 10 Z', refX: 1 },
    })
    const mp = markPath(straight(), { mark: 'pennant', at: 0.5 })
    expect(mp.marks[0]!.d).toBe('M 0 0 L 10 5 L 0 10 Z')
  })

  it('throws on unknown mark names, listing both namespaces', () => {
    expect(() => markPath(straight(), { mark: 'nope' })).toThrow(/Unknown mark: "nope"/)
  })

  it('throws on a non-positive step', () => {
    expect(() =>
      markPath(straight(), { mark: 'to', between: [0, 1], step: 0 })
    ).toThrow(/step/)
  })
})

describe('isMarkedPath', () => {
  it('recognizes MarkedPath via the kind tag', () => {
    const mp = markPath(straight(), { mark: 'to' })
    expect(isMarkedPath(mp)).toBe(true)
    expect(isMarkedPath(straight())).toBe(false)
  })
})

describe('MarkedPath rendering', () => {
  it('paints the base path plus one element per mark', () => {
    const svg = picture()
      .draw(markPath(straight(), { mark: 'stealth', at: [0.25, 0.5, 0.75] }))
      .toSVG({ width: 120, height: 40 })

    // Base path + 3 mark paths = 4 <path> elements.
    const pathCount = (svg.match(/<path\b/g) ?? []).length
    expect(pathCount).toBe(4)
    // Marks are placed by transform at their positions along the line.
    expect(svg).toContain('translate(25 0)')
    expect(svg).toContain('translate(50 0)')
    expect(svg).toContain('translate(75 0)')
  })

  it('marks inherit the path stroke color', () => {
    const svg = picture()
      .draw(markPath(straight(), { mark: 'stealth', at: 0.5 }), {
        style: { stroke: '#ff0000' },
      })
      .toSVG({ width: 120, height: 40 })
    // Filled tips take the stroke color as fill.
    expect(svg).toContain('fill="#ff0000"')
  })

  it('applies mark scale in the transform', () => {
    const svg = picture()
      .draw(markPath(straight(), { mark: 'stealth', at: 0.5, scale: 2 }))
      .toSVG({ width: 120, height: 40 })
    expect(svg).toContain('scale(2)')
  })
})
