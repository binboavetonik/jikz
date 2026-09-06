import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'

describe('rotateText', () => {
  it('default: node text rotates with the shape', () => {
    const svg = picture()
      .node('A', { at: point(50, 50), width: 60, height: 20, text: 'hello', rotate: 90 })
      .toSVG({ width: 120, height: 120 })
    expect(svg).toContain('rotate(90 50 50)')
  })

  it('rotateText: false keeps text upright while the shape rotates', () => {
    const svg = picture()
      .node('A', { at: point(50, 50), width: 60, height: 20, text: 'hello', rotate: 90, rotateText: false })
      .toSVG({ width: 120, height: 120 })
    expect(svg).not.toContain('rotate(90 50 50)')
    expect(svg).toContain('>hello<')
  })

  it('unrotated node: no rotation group either way', () => {
    const svg = picture()
      .node('A', { at: point(50, 50), width: 60, height: 20, text: 'hello', rotateText: false })
      .toSVG({ width: 120, height: 120 })
    expect(svg).not.toContain('rotate(')
  })

  it('moveTo/resize preserve rotateText', () => {
    const pic = picture().node('A', {
      at: point(50, 50), width: 60, height: 20, text: 'x', rotate: 45, rotateText: false,
    })
    const moved = pic.getNode('A')!.moveTo(point(80, 80))
    expect(moved.rotateText).toBe(false)
    expect(pic.getNode('A')!.resize(30, 30).rotateText).toBe(false)
  })
})
