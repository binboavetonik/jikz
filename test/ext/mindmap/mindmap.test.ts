/** mindmap — concepts by level, fanned children, connection bars. */
import { describe, it, expect } from 'vitest'
import { mindmap, connectionBar, CONCEPT_LEVELS } from '../../../src/ext/mindmap'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { cm } from '../../../src/core/units'

describe('mindmap', () => {
  it('sizes concepts by level and fans children out', () => {
    expect(CONCEPT_LEVELS[0]!.size).toBeCloseTo(cm(4))
    expect(CONCEPT_LEVELS[1]!.distance).toBeCloseTo(cm(5))
    const pic = picture()
    const names = mindmap(pic, {
      text: 'root', color: '#dc2626',
      children: [
        { text: 'a', color: '#2563eb', children: [{ text: 'a1' }, { text: 'a2' }] },
        { text: 'b' },
      ],
    }, { at: point(0, 0), scale: 0.1 })
    expect(names).toEqual(['root', 'a', 'a1', 'a2', 'b'])
    expect(pic.getNode('root')!.width).toBeCloseTo(cm(4) * 0.1)
    expect(pic.getNode('a')!.width).toBeCloseTo(cm(2.25) * 0.1)
    // two root children: opposite each other, one level distance out
    expect(pic.resolve('a').distanceTo(point(0, 0))).toBeCloseTo(cm(5) * 0.1)
    expect(pic.resolve('b').distanceTo(point(0, 0))).toBeCloseTo(cm(5) * 0.1)
    expect(pic.resolve('a').add(pic.resolve('b')).length).toBeCloseTo(0)
    // grandchildren fan ±30° about a's outward direction, at the level-2 distance
    expect(pic.resolve('a1').distanceTo(pic.resolve('a'))).toBeCloseTo(cm(2.9) * 0.1)
    const svg = pic.toSVG({ fit: true })
    expect(svg.match(/<linearGradient/g)).toHaveLength(4) // one bar per child
    expect(svg).toContain('stop-color="#dc2626"')
    expect(svg).toContain('stop-color="#2563eb"')
    // bars paint under the concepts
    expect(svg.indexOf('<linearGradient')).toBeLessThan(svg.indexOf('>root<'))
  })

  it('connectionBar spans the two circles and carries the gradient', () => {
    const { path, gradient } = connectionBar({ center: point(0, 0), radius: 20 }, { center: point(100, 0), radius: 10 }, { from: '#000', to: '#fff' })
    const xs = path.allPoints.map((p) => p.x)
    expect(Math.min(...xs)).toBeGreaterThan(15)
    expect(Math.max(...xs)).toBeLessThan(95)
    expect(gradient.stops[0]!.color).toBe('#000')
    expect(path.isClosed).toBe(true)
  })
})
