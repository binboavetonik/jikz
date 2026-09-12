import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { parsePathData, pathFromSVG } from '../../src/path/svgPath'

describe('parsePathData', () => {
  it('parses M/L/Z', () => {
    const segs = parsePathData('M 10 20 L 30 40 L 50 60 Z')
    expect(segs.map((s) => s.type)).toEqual(['M', 'L', 'L', 'Z'])
    expect(segs[0]!.points[0]).toEqual(point(10, 20))
    expect(segs[1]!.points[0]).toEqual(point(30, 40))
  })

  it('parses relative commands', () => {
    const segs = parsePathData('m 10 0 l 5 5')
    expect(segs[0]!.points[0]).toEqual(point(10, 0))
    expect(segs[1]!.points[0]).toEqual(point(15, 5))
  })

  it('normalizes H/V to L using the current point', () => {
    const segs = parsePathData('M 10 20 H 40 V 60')
    expect(segs.map((s) => s.type)).toEqual(['M', 'L', 'L'])
    expect(segs[1]!.points[0]).toEqual(point(40, 20))
    expect(segs[2]!.points[0]).toEqual(point(40, 60))
  })

  it('converts extra M pairs to implicit L', () => {
    const segs = parsePathData('M 10 10 20 20 30 30')
    expect(segs.map((s) => s.type)).toEqual(['M', 'L', 'L'])
    expect(segs[2]!.points[0]).toEqual(point(30, 30))
  })

  it('reflects S into C from the previous cubic control point', () => {
    const segs = parsePathData('M 0 0 C 10 0 20 10 30 10 S 50 -10 60 0')
    expect(segs.map((s) => s.type)).toEqual(['M', 'C', 'C'])
    // S cp1 = 2*end − prev cp2 = 2*(30,10) − (20,10) = (40,10)
    const s = segs[2]!
    expect(s.points[0]).toEqual(point(40, 10))
    expect(s.points[2]).toEqual(point(60, 0))
  })

  it('reflects T into Q from the previous quadratic control point', () => {
    const segs = parsePathData('M 0 0 Q 10 10 20 0 T 40 0')
    expect(segs.map((s) => s.type)).toEqual(['M', 'Q', 'Q'])
    // T cp = 2*(20,0) − (10,10) = (30,-10)
    const t = segs[2]!
    expect(t.points[0]).toEqual(point(30, -10))
    expect(t.points[1]).toEqual(point(40, 0))
  })

  it('parses arcs including packed flags', () => {
    const segs = parsePathData('M 0 0 A 5 5 0 0110 20')
    const a = segs[1]!
    expect(a.type).toBe('A')
    expect(a.rx).toBe(5)
    expect(a.ry).toBe(5)
    expect(a.rotation).toBe(0)
    expect(a.largeArc).toBe(false)
    expect(a.sweep).toBe(true)
    expect(a.points[0]).toEqual(point(10, 20))
  })

  it('parses sign-separated, decimal, and exponent numbers', () => {
    const segs = parsePathData('M10-20 L.5.5 L1e2 0')
    expect(segs[0]!.points[0]).toEqual(point(10, -20))
    expect(segs[1]!.points[0]).toEqual(point(0.5, 0.5))
    expect(segs[2]!.points[0]).toEqual(point(100, 0))
  })

  it('handles comma and whitespace separators', () => {
    const segs = parsePathData('M10,20 L 30, 40')
    expect(segs[0]!.points[0]).toEqual(point(10, 20))
    expect(segs[1]!.points[0]).toEqual(point(30, 40))
  })
})

describe('pathFromSVG', () => {
  it('round-trips its own toSVGPath output', () => {
    const p = pathFromSVG('M 0 0 L 100 0 C 100 50, 50 50, 50 100 A 30 30 0 1 1 10 90 Z')
    const again = pathFromSVG(p.toSVGPath())
    expect(again.toSVGPath()).toBe(p.toSVGPath())
    expect(again.length).toBeCloseTo(p.length, 6)
  })

  it('produces a measurable, transformable, drawable Path', () => {
    const p = pathFromSVG('M 0 0 L 100 0')
    expect(p.length).toBeCloseTo(100, 6)
    expect(p.translate(5, 0).toSVGPath()).toContain('M 5 0')
  })
})
