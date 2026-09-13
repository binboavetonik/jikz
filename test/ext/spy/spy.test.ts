/**
 * Spy — pinned against `tikzlibraryspy.code.tex`, whose \spy emits an
 * outline carrying the inverse lens transform, an inset replaying the
 * scope's box under the lens, and optionally a line joining them.
 */
import { describe, it, expect } from 'vitest'
import {
  spy,
  SPY_MAGNIFICATION_DEFAULT,
  SPY_SIZE_DEFAULT,
  SPY_VERY_THIN,
  SPY_THIN,
  SPY_THICK,
} from '../../../src/ext/spy'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { rect } from '../../../src/geometry/Rectangle'
import { circle } from '../../../src/geometry/Circle'
import { Circle } from '../../../src/geometry/Circle'
import { Rectangle } from '../../../src/geometry/Rectangle'
import { allShapes } from '../../../src/geometry/shapes'

function drawn() {
  const pic = picture({ shapes: allShapes })
  pic.fill(rect(10, 10, 160, 100), { style: { fill: '#e2e8f0' } })
  pic.draw(circle(point(120, 50), 8))
  return pic
}

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('PGF defaults', () => {
  it('uses the named line widths spy using outlines reaches for', () => {
    expect(SPY_VERY_THIN).toBe(0.2)
    expect(SPY_THIN).toBe(0.4)
    expect(SPY_THICK).toBe(0.8)
  })

  it('supplies a magnification and size, which TikZ does not', () => {
    expect(SPY_MAGNIFICATION_DEFAULT).toBe(3)
    expect(SPY_SIZE_DEFAULT).toBe(60)
    const s = spy(drawn(), { on: point(120, 50), at: point(260, 60) })
    expect(s.magnification).toBe(3)
    expect(s.in.width).toBe(60)
  })
})

describe('the lens relationship', () => {
  it('outlines size / magnification on the original', () => {
    // TikZ gets this by inverting the lens onto the spy-on node.
    const s = spy(drawn(), { on: point(120, 50), at: point(260, 60), magnification: 4, size: 80 })
    expect(s.on.width).toBe(20)
    expect(s.on.height).toBe(20)
    expect(s.in.width).toBe(80)
    expectPt((s.on as Rectangle).center, 120, 50, 'on centre')
    expectPt((s.in as Rectangle).center, 260, 60, 'in centre')
  })

  it('carries the spied point to the inset centre', () => {
    const s = spy(drawn(), { on: point(120, 50), at: point(260, 60), magnification: 4, size: 80 })
    expectPt(s.transform.apply(point(120, 50)), 260, 60, 'spied point')
  })

  it('scales by the magnification about that point', () => {
    const s = spy(drawn(), { on: point(100, 100), at: point(0, 0), magnification: 2, size: 40 })
    // A point 10 to the right of `on` lands 20 to the right of `at`.
    expectPt(s.transform.apply(point(110, 100)), 20, 0, 'offset point')
    expectPt(s.transform.apply(point(100, 110)), 0, 20, 'offset point')
  })

  it('takes width and height separately, like TikZ width/height', () => {
    const s = spy(drawn(), {
      on: point(120, 50),
      at: point(260, 60),
      magnification: 2,
      width: 100,
      height: 40,
    })
    expect(s.in.width).toBe(100)
    expect(s.in.height).toBe(40)
    expect(s.on.width).toBe(50)
    expect(s.on.height).toBe(20)
  })
})

describe('replaying the content', () => {
  it('puts the picture back inside a clipped, transformed scope', () => {
    const pic = drawn()
    const before = pic.items.length
    spy(pic, { on: point(120, 50), at: point(260, 60), magnification: 4, size: 80 })

    const scopes = pic.items.filter((i) => i.kind === 'scope')
    expect(scopes).toHaveLength(1)
    const inner = (scopes[0] as { scope: { items: unknown[]; options: Record<string, unknown> } }).scope
    expect(inner.items).toHaveLength(before)
    expect(inner.options.clip).toBeDefined()
    expect(inner.options.transform).toBeDefined()
  })

  it('magnifies only what was there first — not its own output', () => {
    // Otherwise the inset would contain its own frame, and recursively.
    const pic = drawn()
    const before = pic.items.length
    spy(pic, { on: point(120, 50), at: point(260, 60) })
    const scope = pic.items.find((i) => i.kind === 'scope')!
    const inner = (scope as { scope: { items: unknown[] } }).scope
    expect(inner.items).toHaveLength(before)
    expect(inner.items.some((i) => (i as { kind: string }).kind === 'scope')).toBe(false)
  })

  it('replays a picture holding named nodes', () => {
    // The reason adopt() exists: node() refuses a duplicate name, so a
    // replay that went back through the drawing verbs would throw here.
    const pic = picture({ shapes: allShapes })
    pic.node('a', { at: point(60, 60), shape: 'circle', width: 24, text: 'A' })
    pic.node('b', { at: point(120, 60), shape: 'circle', width: 24, text: 'B' })
    pic.edge('a', 'b')
    expect(() => spy(pic, { on: point(90, 60), at: point(240, 60) })).not.toThrow()
    const svg = pic.toSVG({ width: 300, height: 130 })
    // Both states appear twice: once on the original, once magnified.
    expect(svg.match(/>A</g)).toHaveLength(2)
    expect(svg.match(/>B</g)).toHaveLength(2)
  })

  it('takes an explicit content list', () => {
    const source = drawn()
    const target = picture({ shapes: allShapes })
    spy(target, { on: point(120, 50), at: point(60, 60), content: source.items })
    const scope = target.items.find((i) => i.kind === 'scope')!
    expect((scope as { scope: { items: unknown[] } }).scope.items).toHaveLength(source.items.length)
  })

  it('shows nothing when there is nothing drawn yet', () => {
    const pic = picture()
    const s = spy(pic, { on: point(0, 0), at: point(50, 50) })
    const scope = pic.items.find((i) => i.kind === 'scope')!
    expect((scope as { scope: { items: unknown[] } }).scope.items).toHaveLength(0)
    expect(s.magnification).toBe(SPY_MAGNIFICATION_DEFAULT)
  })
})

describe('rendering', () => {
  it('draws outline, replay, then frame, in that order', () => {
    const pic = drawn()
    spy(pic, { on: point(120, 50), at: point(260, 60), magnification: 4, size: 80 })
    const svg = pic.toSVG({ width: 320, height: 130 })
    const outline = svg.indexOf(`stroke-width="${SPY_VERY_THIN}"`)
    const group = svg.indexOf('<g clip-path')
    const frame = svg.indexOf(`stroke-width="${SPY_THICK}"`)
    expect(outline).toBeGreaterThan(-1)
    expect(group).toBeGreaterThan(outline)
    expect(frame).toBeGreaterThan(group)
  })

  it('clips a circular lens to a disc', () => {
    const pic = drawn()
    const s = spy(pic, {
      on: point(120, 50),
      at: point(260, 60),
      magnification: 4,
      size: 80,
      lens: 'circle',
    })
    expect(s.on).toBeInstanceOf(Circle)
    expect(s.in).toBeInstanceOf(Circle)
    expect((s.in as Circle).radius).toBe(40)
    expect((s.on as Circle).radius).toBe(10)
    expect(pic.toSVG({ width: 320, height: 130 })).toContain('<clipPath')
  })

  it('joins the two at their borders when connect spies is on', () => {
    const pic = drawn()
    const s = spy(pic, {
      on: point(120, 50),
      at: point(260, 60),
      magnification: 4,
      size: 80,
      connect: true,
    })
    const svg = pic.toSVG({ width: 320, height: 130 })
    const l = svg.match(/<line[^>]*x1="([\d.]+)"[^>]*x2="([\d.]+)"/)!
    // Right edge of the outline to left edge of the inset, not centre to centre.
    expect(Number(l[1])).toBeCloseTo(s.on.bounds[2], 6)
    expect(Number(l[2])).toBeCloseTo(s.in.bounds[0], 6)
    expect(svg).toContain(`stroke-width="${SPY_THIN}"`)
  })

  it('draws no connection unless asked', () => {
    const pic = drawn()
    spy(pic, { on: point(120, 50), at: point(260, 60) })
    expect(pic.toSVG({ width: 320, height: 130 })).not.toContain('<line')
  })

  it('takes style overrides for both nodes', () => {
    const pic = drawn()
    spy(pic, {
      on: point(120, 50),
      at: point(260, 60),
      onStyle: { stroke: '#dc2626', strokeWidth: 1.5 },
      inStyle: { stroke: '#2563eb', strokeWidth: 2 },
    })
    const svg = pic.toSVG({ width: 320, height: 130 })
    expect(svg).toContain('#dc2626')
    expect(svg).toContain('#2563eb')
  })
})
