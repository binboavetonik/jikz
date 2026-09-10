// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'

const PULSE = {
  attributeName: 'opacity',
  values: '1;0.35;1',
  dur: '1.2s',
  repeatCount: 'indefinite',
} as const

describe('mount() with SMIL animation', () => {
  it('creates a live <animate> child on the animated element', () => {
    const host = document.createElement('div')
    const svg = picture()
      .draw(circle(point(10, 10), 5), { animate: PULSE })
      .mount(host, { width: 40, height: 40 })

    const anim = svg.querySelector('animate')
    expect(anim).not.toBeNull()
    expect(anim!.getAttribute('attributeName')).toBe('opacity')
    expect(anim!.getAttribute('values')).toBe('1;0.35;1')
    expect(anim!.parentElement!.tagName).toBe('circle')
  })

  it('keeps text content alongside an <animate> child', () => {
    const host = document.createElement('div')
    const svg = picture()
      .text(point(0, 0), 'hello', { animate: PULSE })
      .mount(host, { width: 40, height: 40 })

    const text = svg.querySelector('text')!
    expect(text.textContent).toBe('hello')
    expect(text.querySelector('animate')).not.toBeNull()
  })
})
