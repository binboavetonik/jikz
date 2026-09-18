/** Edge routers — TikZ `to path` as a function. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { edge } from '../../src/node/Edge'
import { busRouter, orthogonalRouter, straightRouter } from '../../src/node/routers'
import { path } from '../../src/path/Path'

describe('edge routers', () => {
  it('built-ins produce the expected polylines', () => {
    const a = point(0, 0), b = point(100, 50)
    expect(edge(a, b, { route: straightRouter }).toSVGPath()).toBe('M 0 0 L 100 50')
    expect(edge(a, b, { route: orthogonalRouter() }).toSVGPath()).toBe('M 0 0 L 100 0 L 100 50')
    expect(edge(a, b, { route: orthogonalRouter({ first: 'vertical' }) }).toSVGPath()).toBe('M 0 0 L 0 50 L 100 50')
    expect(edge(a, b, { route: busRouter({ y: 25 }) }).toSVGPath()).toBe('M 0 0 L 0 25 L 100 25 L 100 50')
    expect(edge(a, b, { route: busRouter({ x: 60 }) }).toSVGPath()).toBe('M 0 0 L 60 0 L 60 50 L 100 50')
  })

  it('a custom router gets the resolved endpoints and drives pointAt, bounds and shorten', () => {
    const e = edge(point(0, 0), point(100, 0), {
      route: (from, to) => path().moveTo(from).lineTo(point(50, -40)).lineTo(to),
      label: { text: 'x', pos: 0.5, offset: 0 },
    })
    expect(e.bounds[1]).toBe(-40)
    expect(e.labelPoint(e.labels[0]!)).toEqual(point(50, -40)) // equal legs: midway is the apex
    const shortened = edge(point(0, 0), point(100, 0), {
      route: (from, to) => path().moveTo(from).lineTo(point(50, 0)).lineTo(to),
      shortenStart: 5,
      shortenEnd: 10,
    })
    expect(shortened.toSVGPath()).toBe('M 5 0 L 50 0 L 90 0')
  })

  it('routes through the picture, with arrows on the routed end', () => {
    const svg = picture()
      .edge(point(0, 0), point(100, 100), { route: orthogonalRouter(), arrowEnd: 'stealth' })
      .toSVG({ width: 110, height: 110 })
    expect(svg).toContain('d="M 0 0 L 100 0 L 100 100"')
    expect(svg).toContain('marker-end')
  })
})
