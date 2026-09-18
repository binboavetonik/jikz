/** Turtle graphics and L-systems. */
import { describe, it, expect } from 'vitest'
import { turtle, lsystem, expandLSystem, LSYSTEMS } from '../../../src/ext/turtle'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'

describe('turtle', () => {
  it('starts facing up; left is counter-clockwise as seen; back, home, pen up', () => {
    const t = turtle({ start: point(10, 10) }).forward(5).right(90).forward(5).left(180).forward(10)
    expect(t.path().toSVGPath()).toBe('M 10 10 L 10 5 L 15 5 L 5 5')
    expect(t.heading).toBe(180)
    t.home().penUp().forward(3).penDown().back(3)
    expect(t.path().toSVGPath()).toBe('M 10 10 L 10 5 L 15 5 L 5 5 M 10 10 M 10 7 L 10 10')
  })

  it('frame math keeps y up', () => {
    const t = turtle({ start: point(0, 0), frame: 'math' }).forward(5)
    expect(t.position).toEqual(point(0, 5))
    const svg = picture({ frame: 'math', unit: 2 }).draw(t.path()).toSVG({ fit: true, padding: 0 })
    expect(svg).toContain('d="M 0 0 L 0 -10"')
  })

  it('push/pop restore position and heading', () => {
    const t = turtle().forward(10).push().left(90).forward(10).pop().forward(10)
    expect(t.path().toSVGPath()).toBe('M 0 0 L 0 -10 L -10 -10 M 0 -10 L 0 -20')
    expect(() => turtle().pop()).toThrow(/pop/)
  })
})

describe('lsystem', () => {
  it('expands rules and interprets the turtle alphabet', () => {
    expect(expandLSystem('F', { F: 'F+F' }, 2)).toBe('F+F+F+F')
    const { string, path } = lsystem(LSYSTEMS.kochCurve, { iterations: 1, step: 10, start: point(0, 0) })
    expect(string).toBe('F+F--F+F')
    expect(path.segments.map((s) => s.type)).toEqual(['M', 'L', 'L', 'L', 'L'])
    expect(path.endPoint!.x).toBeCloseTo(30) // four steps of 10 spanning three: the bump is the middle two
    expect(path.endPoint!.y).toBeCloseTo(0)
    // the bump goes up on screen
    expect(Math.min(...path.allPoints.map((p) => p.y))).toBeCloseTo(-10 * Math.sin(Math.PI / 3))
  })

  it('brackets branch (the plant) and f moves without drawing', () => {
    const { path } = lsystem({ axiom: 'F[+F]fF', rules: {}, angle: 90 }, { iterations: 0, step: 10, heading: 90 })
    expect(path.toSVGPath()).toBe('M 0 0 L 0 -10 L -10 -10 M 0 -10 M 0 -20 L 0 -30')
    const plant = lsystem(LSYSTEMS.plant, { iterations: 3, step: 4, heading: 65 })
    expect(plant.path.segments.length).toBeGreaterThan(50)
  })

  it('the snowflake closes on itself', () => {
    const { path } = lsystem(LSYSTEMS.kochSnowflake, { iterations: 2, step: 5 })
    expect(path.endPoint!.x).toBeCloseTo(path.startPoint!.x)
    expect(path.endPoint!.y).toBeCloseTo(path.startPoint!.y)
  })
})
