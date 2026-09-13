/**
 * Turtle — pinned against `tikzlibraryturtle.code.tex`, whose keys are
 * forward/back/left/right/home over a direction and a distance, with
 * fd/bk/lt/rt shortcuts.
 */
import { describe, it, expect } from 'vitest'
import {
  Turtle,
  turtle,
  TURTLE_DISTANCE_DEFAULT,
  TURTLE_DIRECTION_DEFAULT,
  TURTLE_TURN_DEFAULT,
} from '../../../src/ext/turtle'
import { point } from '../../../src/core/Point'

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('TikZ defaults', () => {
  it('starts a step of 1cm, in the points jikz counts in', () => {
    expect(TURTLE_DISTANCE_DEFAULT).toBeCloseTo(28.452756, 5)
    expect(turtle().distance).toBeCloseTo(TURTLE_DISTANCE_DEFAULT, 6)
  })

  it('starts facing up, which is TikZ direction=90 on a y-down canvas', () => {
    expect(TURTLE_DIRECTION_DEFAULT).toBe(-90)
    const t = turtle({ distance: 10 })
    t.forward()
    expectPt(t.position, 0, -10, 'up is negative y')
  })

  it('turns a quarter turn when given no angle', () => {
    expect(TURTLE_TURN_DEFAULT).toBe(90)
    expect(turtle().left().direction).toBe(-180)
    expect(turtle().right().direction).toBe(0)
  })
})

describe('moving', () => {
  it('walks forward along the heading and records it', () => {
    const t = turtle({ at: point(0, 0), direction: 0, distance: 10 })
    t.forward().right(90).forward()
    expectPt(t.position, 10, 10, 'after two legs')
    expect(t.path.toSVGPath()).toBe('M 0 0 L 10 0 L 10 10')
  })

  it('treats back as forward by a negative distance, as TikZ does', () => {
    const a = turtle({ direction: 0, distance: 10 }).back()
    const b = turtle({ direction: 0, distance: 10 }).forward(-10)
    expectPt(a.position, -10, 0, 'back')
    expect(a.path.toSVGPath()).toBe(b.path.toSVGPath())
  })

  it('turns left counter-clockwise on screen and right clockwise', () => {
    const t = turtle({ direction: 0 })
    expect(t.left(30).direction).toBe(-30)
    expect(t.right(30).direction).toBe(0)
    expect(t.right(45).direction).toBe(45)
  })

  it('sends home to the origin facing up, pen lifted', () => {
    const t = turtle({ at: point(50, 50), direction: 0, distance: 10 })
    t.forward().home()
    expectPt(t.position, 0, 0, 'home')
    expect(t.direction).toBe(TURTLE_DIRECTION_DEFAULT)
    expect(t.path.toSVGPath()).toBe('M 50 50 L 60 50 M 0 0')
  })

  it('closes a regular polygon after a full turn', () => {
    const t = turtle({ direction: 0, distance: 20 })
    for (let i = 0; i < 5; i++) t.forward().right(72)
    expectPt(t.position, 0, 0, 'pentagon closes')
    expect(t.direction).toBe(360)
  })
})

describe('beyond the TikZ keys', () => {
  it('jumps without drawing', () => {
    const t = turtle({ direction: 0, distance: 10 })
    t.forward().jump().forward()
    expect(t.path.toSVGPath()).toBe('M 0 0 L 10 0 M 20 0 L 30 0')
  })

  it('restores position and heading, pen up, on pop', () => {
    const t = turtle({ direction: 0, distance: 10 })
    t.forward().push().right(90).forward().pop().forward()
    expectPt(t.position, 20, 0, 'back on the trunk')
    expect(t.direction).toBe(0)
    expect(t.path.toSVGPath()).toBe('M 0 0 L 10 0 L 10 10 M 10 0 L 20 0')
  })

  it('nests the stack and reports its depth', () => {
    const t = turtle()
    expect(t.depth).toBe(0)
    t.push().push()
    expect(t.depth).toBe(2)
    t.pop()
    expect(t.depth).toBe(1)
  })

  it('ignores a pop with nothing saved', () => {
    const t = turtle({ direction: 0, distance: 10 })
    t.forward().pop()
    expectPt(t.position, 10, 0, 'unchanged')
    expect(t.path.toSVGPath()).toBe('M 0 0 L 10 0')
  })
})

describe('shortcuts', () => {
  it('fd/bk/lt/rt do what the long names do', () => {
    const short = turtle({ direction: 0, distance: 10 })
    short.fd().rt(45).bk(5).lt(20)
    const long = turtle({ direction: 0, distance: 10 })
    long.forward().right(45).back(5).left(20)
    expect(short.path.toSVGPath()).toBe(long.path.toSVGPath())
    expect(short.direction).toBe(long.direction)
  })

  it('is constructible directly as well as through the factory', () => {
    expect(new Turtle({ distance: 5 }).distance).toBe(5)
  })
})
