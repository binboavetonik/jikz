import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { picture } from '../../src/picture/Picture'
import {
  registerStyle,
  hasStyle,
  registeredStyleNames,
  resolveStyle,
  parseStyleString,
} from '../../src/render/StyleMapper'
import { dashed } from '../../src/render/presets'

describe('named style registry', () => {
  it('registerStyle returns a frozen preset usable in the array form', () => {
    const brand = registerStyle('brand', { stroke: '#2563eb', strokeWidth: 2 })
    expect(Object.isFrozen(brand)).toBe(true)
    expect(brand).toMatchObject({ stroke: '#2563eb', strokeWidth: 2 })

    const svg = picture()
      .draw(circle(point(50, 50), 20), { style: [brand] })
      .toSVG({ width: 100, height: 100 })
    expect(svg).toContain('stroke="#2563eb"')
    expect(svg).toContain('stroke-width="2"')
  })

  it('tracks registered names and knows built-ins', () => {
    registerStyle('mystyle', { stroke: '#123456' })
    expect(hasStyle('mystyle')).toBe(true)
    expect(hasStyle('thick')).toBe(true)     // built-in
    expect(hasStyle('nope')).toBe(false)
    expect(registeredStyleNames()).toContain('mystyle')
  })

  it('parseStyleString resolves registered names alongside built-ins', () => {
    registerStyle('brand', { stroke: '#2563eb' })
    const result = parseStyleString('brand, thick')
    expect(result.stroke).toBe('#2563eb')
    expect(result.strokeWidth).toBe(0.8) // 'thick' built-in
  })

  it('resolveStyle flattens a recipe of names and partials', () => {
    registerStyle('brand', { stroke: '#2563eb' })
    const result = resolveStyle(['brand', { strokeWidth: 3 }])
    expect(result.stroke).toBe('#2563eb')
    expect(result.strokeWidth).toBe(3)
  })

  it('composes named styles (TikZ .style={a, b})', () => {
    registerStyle('brand', { stroke: '#2563eb', strokeWidth: 2 })
    // lowercase, so the name is reachable from parseStyleString (which lowercases)
    registerStyle('brandsoft', ['brand', dashed])
    const result = parseStyleString('brandsoft')
    expect(result.stroke).toBe('#2563eb')
    expect(result.strokeWidth).toBe(2)
    expect(result.strokeDasharray).toBe('3 3') // from `dashed`
  })

  it('re-registering a name replaces it', () => {
    registerStyle('brand', { stroke: '#111111' })
    registerStyle('brand', { stroke: '#222222' })
    expect(parseStyleString('brand').stroke).toBe('#222222')
  })

  it('registered names shadow built-ins', () => {
    registerStyle('thick', { strokeWidth: 99 })
    expect(parseStyleString('thick').strokeWidth).toBe(99)
  })

  it('throws on unknown names in recipes, listing what is known', () => {
    expect(() => resolveStyle(['no-such-style', { stroke: '#000000' }])).toThrow(
      /no-such-style.*known: .*brand/
    )
  })
})
