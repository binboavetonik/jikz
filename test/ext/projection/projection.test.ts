/** 3D → 2D projection — tikz-3dplot main coordinates. */
import { describe, it, expect } from 'vitest'
import { projection, tdplot } from '../../../src/ext/projection'
import { picture } from '../../../src/picture/Picture'

describe('projection', () => {
  it('θ = 90, φ = 0 is a side view: x right, z up, y flat', () => {
    const P = tdplot(90, 0, 10)
    expect(P.point(1, 0, 0)).toMatchObject({ x: 10, y: 0 })
    expect(P.point(0, 0, 1).y).toBeCloseTo(-10) // up on screen
    expect(P.point(0, 1, 0).y).toBeCloseTo(0)
  })

  it('θ = 0 is the top view rotated by φ', () => {
    const P = projection({ theta: 0, phi: 90 })
    expect(P.point(1, 0, 0).x).toBeCloseTo(0)
    expect(P.point(1, 0, 0).y).toBeCloseTo(1) // x → −y on paper → +y on screen
    expect(P.point(0, 0, 1).x).toBeCloseTo(0)
    expect(P.point(0, 0, 1).y).toBeCloseTo(0)
  })

  it('explicit unit vectors and the math frame', () => {
    const P = projection({ x: { x: 1, y: 0 }, y: { x: 0.5, y: 0.5 }, z: { x: 0, y: 1 }, frame: 'math', unit: 2 })
    expect(P.point([1, 1, 1])).toMatchObject({ x: 3, y: 3 })
    expect(P.point({ x: 0, y: 0, z: 1 }).y).toBe(2)
    const pic = picture({ frame: 'math', unit: 1 })
    pic.pen().moveTo(P.point(0, 0, 0)).lineTo(P.point(0, 0, 1))
    expect(pic.toSVG({ fit: true, padding: 0 })).toContain('M 0 0 L 0 -2')
  })

  it('axes are three lines from the origin', () => {
    const { x, y, z } = tdplot(70, 110, 1).axes(1)
    expect(x.end.x).toBeCloseTo(Math.cos((110 * Math.PI) / 180))
    expect(z.end.y).toBeCloseTo(-Math.sin((70 * Math.PI) / 180))
    expect(y.start.x).toBe(0)
  })
})
