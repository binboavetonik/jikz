/** decorations.shapes and decorations.footprints as marks along a path. */
import { describe, it, expect } from 'vitest'
import { shapesAlongPath, footprints, FOOT_ARTWORK } from '../../src/path/PathShapes'
import { line } from '../../src/geometry/Line'
import { point } from '../../src/core/Point'
import { picture } from '../../src/picture/Picture'

describe('shapesAlongPath', () => {
  it('places one shape every sep px from start to end', () => {
    const mp = shapesAlongPath(line(point(0, 0), point(100, 0)), { shape: { plotMark: 'square', size: 4 }, sep: 25 })
    expect(mp.marks.map((m) => m.point.x)).toEqual([0, 25, 50, 75, 100])
    const trimmed = shapesAlongPath(line(point(0, 0), point(100, 0)), { shape: 'stealth', sep: 25, trim: true })
    expect(trimmed.marks.map((m) => m.point.x)).toEqual([25, 50, 75])
    expect(trimmed.marks[0]!.angle).toBe(0)
  })
})

describe('footprints', () => {
  it('alternates sides every half stride, toed out', () => {
    const mp = footprints(line(point(0, 0), point(120, 0)), { stride: 60, sep: 8, angle: 10 })
    const xs = mp.marks.map((m) => m.point.x).sort((a, b) => a - b)
    expect(xs).toEqual([0, 30, 60, 90, 120])
    const left = mp.marks.filter((m) => m.refY > 0)
    const right = mp.marks.filter((m) => m.refY < 0)
    expect(left.length).toBe(3)
    expect(right.length).toBe(2)
    expect(left[0]!.d).not.toBe(right[0]!.d) // pre-rotated ±angle
    expect(Object.keys(FOOT_ARTWORK)).toEqual(['human', 'bird', 'gnome'])
  })

  it('renders through a draw verb as a path plus glyphs', () => {
    const svg = picture().draw(footprints(line(point(0, 20), point(100, 20)), { foot: 'bird' })).toSVG({ width: 100, height: 40 })
    expect(svg).toContain('d="M 0 20 L 100 20"')
    expect(svg.match(/<path/g)!.length).toBeGreaterThan(3)
  })
})
