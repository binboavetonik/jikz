/**
 * Defs ids are document-wide. A clip path or a text path named by a
 * per-picture counter (`jikz-clip-0`) collides as soon as two
 * pictures share a page, and `url(#…)` resolves to the first one —
 * the second picture is then clipped by the first one's shape. Found
 * with two charts on one page; the ids are content-derived now.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { rect } from '../../src/geometry/Rectangle'
import { circle } from '../../src/geometry/Circle'
import { path } from '../../src/path/Path'
import { textAlongPath } from '../../src/path/TextPath'

const clipIdOf = (svg: string) => svg.match(/<clipPath id="([^"]+)"/)![1]!
const clipped = (shape: Parameters<ReturnType<typeof picture>['scope']>[0]['clip']) => {
  const pic = picture()
  pic.scope({ clip: shape }, (s) => s.draw(circle(point(50, 50), 40)))
  return pic.toSVG({ width: 100, height: 100 })
}

describe('defs ids are named by content', () => {
  it('two pictures with different clips get different ids; the same clip the same id', () => {
    const a = clipped(rect(0, 0, 50, 50))
    const b = clipped(rect(10, 10, 80, 20))
    const a2 = clipped(rect(0, 0, 50, 50))
    expect(clipIdOf(a)).toMatch(/^jikz-clip-[0-9a-z]+$/)
    expect(clipIdOf(a)).not.toBe(clipIdOf(b))
    expect(clipIdOf(a)).toBe(clipIdOf(a2))
    // Each picture references its own.
    expect(a).toContain(`clip-path="url(#${clipIdOf(a)})"`)
    expect(b).toContain(`clip-path="url(#${clipIdOf(b)})"`)
  })

  it('equal clips in one picture share one definition', () => {
    const pic = picture()
    pic.scope({ clip: rect(0, 0, 50, 50) }, (s) => s.draw(circle(point(20, 20), 30)))
    pic.scope({ clip: rect(0, 0, 50, 50) }, (s) => s.draw(circle(point(30, 30), 30)))
    pic.scope({ clip: rect(5, 5, 50, 50) }, (s) => s.draw(circle(point(30, 30), 30)))
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(svg.match(/<clipPath /g)).toHaveLength(2)
    expect(svg.match(/clip-path="url\(#jikz-clip-/g)).toHaveLength(3)
  })

  it('text paths are named by their guide too', () => {
    const along = (x: number) => {
      const pic = picture()
      pic.draw(textAlongPath(path().moveTo(point(0, 50)).lineTo(point(x, 50)), 'hello'))
      return pic.toSVG({ width: 200, height: 100 }).match(/href="#(jikz-textpath-[0-9a-z]+)"/)![1]
    }
    expect(along(100)).not.toBe(along(150))
    expect(along(100)).toBe(along(100))
  })
})
