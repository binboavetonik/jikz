import { describe, it, expect } from 'vitest'
import { cm, mm, inch, pt, bp, length } from '../../src/core/units'
import { color, mix, parseColor, defineColor, xcolor } from '../../src/core/color'

describe('lengths', () => {
  it('convert at 96 px per inch, with TeX points', () => {
    expect(cm(1)).toBeCloseTo(37.795, 3)
    expect(mm(10)).toBeCloseTo(cm(1))
    expect(inch(1)).toBe(96)
    expect(pt(72.27)).toBeCloseTo(96)
    expect(bp(72)).toBe(96)
  })
  it('parse TikZ length strings', () => {
    expect(length('2cm')).toBeCloseTo(cm(2))
    expect(length('10 pt')).toBeCloseTo(pt(10))
    expect(length('-3mm')).toBeCloseTo(mm(-3))
    expect(length('12px')).toBe(12)
    expect(length('7')).toBe(7)
    expect(length(7)).toBe(7)
    expect(() => length('2 furlongs')).toThrow(/unknown unit/)
    expect(() => length('cm')).toThrow(/cannot parse/)
  })
})

describe('colours', () => {
  it('evaluates xcolor expressions', () => {
    expect(color('blue')).toBe('#0000ff')
    expect(color('blue!30')).toBe('#b3b3ff')
    expect(color('blue!30!black')).toBe('#00004d')
    expect(color('red!50!blue')).toBe('#800080')
    expect(color('red!50!blue!50!white')).toBe('#c080c0')
    expect(color('#2563eb')).toBe('#2563eb')
    expect(color('#fff')).toBe('#ffffff')
    expect(color('rgb(0, 128, 255)')).toBe('#0080ff')
  })
  it('mix is the operation underneath', () => {
    expect(mix('blue', 'white', 0.3)).toBe(color('blue!30'))
    expect(parseColor(xcolor.orange!)).toEqual({ r: 255, g: 128, b: 0 })
  })
  it('defineColor names a colour for later expressions', () => {
    defineColor('brand', 'blue!60!black')
    expect(color('brand!50')).toBe(mix('brand', 'white', 0.5))
    expect(() => color('nope!50')).toThrow(/cannot parse "nope"/)
    expect(() => color('blue!x')).toThrow(/percentage/)
  })
})
