/** The pen's TikZ path operations: rectangle, circle, ellipse, arc, grid, parabola, sin/cos, node. */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { basicShapes } from '../../src/geometry/shapes/basic'

const d = (svg: string) => [...svg.matchAll(/<path d="([^"]*)"/g)].map((m) => m[1])

describe('pen path operations', () => {
  it('rectangle draws a closed box and parks the pen at the corner', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).rectangle(40, 20).lineTo(60, 20)
    const svg = pic.toSVG({ width: 100, height: 40 })
    expect(d(svg)[0]).toBe('M 0 0 L 40 0 L 40 20 L 0 20 Z M 40 20 L 60 20')
  })

  it('circle and ellipse sit on the pen and leave it there', () => {
    const pic = picture()
    pic.pen().moveTo(50, 50).circle(10).lineTo(80, 50)
    pic.pen().moveTo(10, 10).ellipse(8, 4)
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(d(svg)[0]).toBe('M 50 50 M 60 50 A 10 10 0 0 1 40 50 A 10 10 0 0 1 60 50 Z M 50 50 L 80 50')
    expect(d(svg)[1]).toBe('M 10 10 M 18 10 A 8 4 0 0 1 2 10 A 8 4 0 0 1 18 10 Z')
  })

  it('arc uses TikZ center-form angles and moves the pen to the end', () => {
    const pic = picture()
    // Screen frame: 0°→90° clockwise from (30,20) around (20,20).
    pic.pen().moveTo(30, 20).arc({ start: 0, end: 90, radius: 10 }).lineTo(50, 50)
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(d(svg)[0]).toBe('M 30 20 A 10 10 0 0 1 20 30 L 50 50')
    // delta and the positional form agree
    const a = picture(); a.pen().moveTo(30, 20).arc({ start: 0, delta: -90, radius: 10 })
    const b = picture(); b.pen().moveTo(30, 20).arc(0, -90, 10)
    expect(a.toSVG({ width: 100, height: 100 })).toBe(b.toSVG({ width: 100, height: 100 }))
    expect(d(a.toSVG({ width: 100, height: 100 }))[0]).toBe('M 30 20 A 10 10 0 0 0 20 10')
  })

  it('arc in the math frame is counter-clockwise, as TikZ writes it', () => {
    const pic = picture({ frame: 'math', unit: 10 })
    pic.pen().moveTo(1, 0).arc({ start: 0, end: 90, radius: 1 })
    // (10,0) → top of the circle at (0,-10), counter-clockwise on screen (sweep 0).
    expect(d(pic.toSVG({ fit: true }))[0]).toBe('M 10 0 A 10 10 0 0 0 0 -10')
  })

  it('grid rules the box at every step and parks the pen at the corner', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).grid(20, 10, { step: 10 }).lineTo(30, 10)
    const path = d(pic.toSVG({ width: 40, height: 20 }))[0]!
    expect(path).toContain('M 0 0 L 0 10 M 10 0 L 10 10 M 20 0 L 20 10')
    expect(path).toContain('M 0 0 L 20 0 M 0 10 L 20 10')
    expect(path.endsWith('M 20 10 L 30 10')).toBe(true)
  })

  it('parabola: vertex at the pen, or through a bend', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).parabola(point(20, 40))
    pic.pen().moveTo(0, 40).parabola(point(40, 40), { bend: point(20, 0) })
    const svg = pic.toSVG({ width: 50, height: 50 })
    expect(d(svg)[0]).toBe('M 0 0 Q 10 0, 20 40')
    expect(d(svg)[1]).toBe('M 0 40 Q 10 0, 20 0 Q 30 0, 40 40')
  })

  it('sin and cos are quarter waves in the box to the end point', () => {
    const pic = picture()
    pic.pen().moveTo(0, 10).sin(point(10, 0)).cos(point(20, 10))
    const path = d(pic.toSVG({ width: 30, height: 20 }))[0]!
    expect(path).toBe('M 0 10 C 3.6 4.345, 6.4 0, 10 0 C 13.6 0, 16.4 5.655, 20 10')
  })

  it('node registers a real named node at the pen or at pos, painted after the path', () => {
    const pic = picture({ shapes: basicShapes })
    pic.pen().moveTo(0, 0).lineTo(100, 0).node('mid', { pos: 0.5, shape: 'circle', width: 20, height: 20, text: 'm' })
      .lineTo(100, 50).node('end', { shape: 'rectangle', text: 'e' })
    expect(pic.resolve('mid')).toEqual(point(50, 0))
    expect(pic.resolve('end')).toEqual(point(100, 50))
    const svg = pic.toSVG({ fit: true })
    expect(svg.indexOf('L 100 50')).toBeLessThan(svg.indexOf('>m<'))
    pic.edge('mid', 'end')
  })

  it('node in the math frame lands where the pen is', () => {
    const pic = picture({ shapes: basicShapes, frame: 'math', unit: 10 })
    pic.pen().moveTo(1, 2).node('P', { shape: 'circle' })
    expect(pic.resolve('P')).toEqual(point(10, -20))
  })
})
