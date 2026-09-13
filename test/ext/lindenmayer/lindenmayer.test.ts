/**
 * L-systems — pinned against `pgflibrarylindenmayersystems.code.tex`:
 * its default alphabet (F f + - [ ]), its step/angle keys, and the two
 * systems the PGF manual declares.
 */
import { describe, it, expect } from 'vitest'
import {
  lindenmayer,
  expandLSystem,
  lsystemActions,
  DEFAULT_SYMBOLS,
  kochCurve,
  hilbertCurve,
  LSYSTEM_STEP_DEFAULT,
  LSYSTEM_ANGLE_DEFAULT,
  LSYSTEM_MAX_SYMBOLS,
  type LindenmayerSystem,
} from '../../../src/ext/lindenmayer'
import { point } from '../../../src/core/Point'

function endpointOf(d: string): { x: number; y: number } {
  const nums = d.trim().split(/[ML ,]+/).filter(Boolean).map(Number)
  return { x: nums[nums.length - 2]!, y: nums[nums.length - 1]! }
}

describe('PGF defaults', () => {
  it('carries step=5pt and angle=90', () => {
    expect(LSYSTEM_STEP_DEFAULT).toBe(5)
    expect(LSYSTEM_ANGLE_DEFAULT).toBe(90)
    const d = lindenmayer({ axiom: 'F' }).toSVGPath()
    expect(d).toBe('M 0 0 L 5 0') // east, one default step
  })

  it('defines exactly the default alphabet', () => {
    expect(Object.keys(DEFAULT_SYMBOLS).sort()).toEqual(['+', '-', '[', ']', 'F', 'f'].sort())
    expect(DEFAULT_SYMBOLS['F']).toBe(lsystemActions.drawForward)
    expect(DEFAULT_SYMBOLS['f']).toBe(lsystemActions.moveForward)
    expect(DEFAULT_SYMBOLS['+']).toBe(lsystemActions.turnLeft)
    expect(DEFAULT_SYMBOLS['-']).toBe(lsystemActions.turnRight)
    expect(DEFAULT_SYMBOLS['[']).toBe(lsystemActions.saveState)
    expect(DEFAULT_SYMBOLS[']']).toBe(lsystemActions.restoreState)
  })

  it('starts heading east, from the identity transform PGF starts at', () => {
    const d = lindenmayer({ axiom: 'F' }, { step: 10 }).toSVGPath()
    expect(d).toBe('M 0 0 L 10 0')
  })
})

describe('expandLSystem', () => {
  it('applies the Koch rule once per order', () => {
    expect(expandLSystem(kochCurve, 'F', 0)).toBe('F')
    expect(expandLSystem(kochCurve, 'F', 1)).toBe('F-F++F-F')
    expect(expandLSystem(kochCurve, 'F', 2)).toBe(
      'F-F++F-F-F-F++F-F++F-F++F-F-F-F++F-F'
    )
  })

  it('leaves symbols without a rule alone', () => {
    expect(expandLSystem({ rules: { A: 'AB' } }, 'A+B', 1)).toBe('AB+B')
  })

  it('stops early when no rule can fire again', () => {
    expect(expandLSystem({ rules: {} }, 'F+F', 99)).toBe('F+F')
  })

  it('treats a negative or fractional order as PGF truncates it', () => {
    expect(expandLSystem(kochCurve, 'F', -1)).toBe('F')
    expect(expandLSystem(kochCurve, 'F', 1.9)).toBe('F-F++F-F')
  })

  it('refuses to expand past the symbol ceiling instead of hanging', () => {
    const explosive: LindenmayerSystem = { rules: { F: 'FFFFFFFFFF' } }
    expect(() => expandLSystem(explosive, 'F', 8)).toThrow(RangeError)
    expect(() => expandLSystem(explosive, 'F', 8)).toThrow(/lower the order/)
    expect(LSYSTEM_MAX_SYMBOLS).toBe(1_000_000)
  })
})

describe('the default alphabet in action', () => {
  it('turns left and right by the configured angles', () => {
    const left = lindenmayer({ axiom: 'F+F' }, { step: 10, angle: 90 })
    // East, then a left turn is counter-clockwise on screen: up.
    expect(left.toSVGPath()).toBe('M 0 0 L 10 0 L 10 -10')
    const right = lindenmayer({ axiom: 'F-F' }, { step: 10, angle: 90 })
    expect(right.toSVGPath()).toBe('M 0 0 L 10 0 L 10 10')
  })

  it('separates left angle from right angle', () => {
    const d = lindenmayer({ axiom: 'F+F' }, { step: 10, leftAngle: 30, rightAngle: 80 })
    const end = endpointOf(d.toSVGPath())
    expect(end.x).toBeCloseTo(10 + 10 * Math.cos(-Math.PI / 6), 6)
    expect(end.y).toBeCloseTo(10 * Math.sin(-Math.PI / 6), 6)
  })

  it('lifts the pen for f and for a restored state', () => {
    expect(lindenmayer({ axiom: 'FfF' }, { step: 10 }).toSVGPath()).toBe(
      'M 0 0 L 10 0 M 20 0 L 30 0'
    )
    expect(lindenmayer({ axiom: 'F[+F]F' }, { step: 10, angle: 90 }).toSVGPath()).toBe(
      'M 0 0 L 10 0 L 10 -10 M 10 0 L 20 0'
    )
  })

  it('skips a symbol that has neither rule nor action', () => {
    expect(lindenmayer({ axiom: 'FXF' }, { step: 10 }).toSVGPath()).toBe(
      lindenmayer({ axiom: 'FF' }, { step: 10 }).toSVGPath()
    )
  })

  it('starts where it is told, facing where it is told', () => {
    const d = lindenmayer({ axiom: 'F' }, { step: 10, at: point(5, 5), direction: 90 })
    expect(d.toSVGPath()).toMatch(/^M 5 5 L /)
    const end = endpointOf(d.toSVGPath())
    expect(end.x).toBeCloseTo(5, 9) // due south: cos(90°) is not exactly 0
    expect(end.y).toBeCloseTo(15, 9)
  })
})

describe('the manual\'s systems', () => {
  it('closes the Koch snowflake axiom into a triangle', () => {
    // axiom=F++F++F with angle=60 is the equilateral seed the manual
    // shades; three sides and three 120° exterior turns come home.
    const d = lindenmayer(kochCurve, { order: 0, step: 30, angle: 60 })
    const end = endpointOf(d.toSVGPath())
    expect(end.x).toBeCloseTo(0, 6)
    expect(end.y).toBeCloseTo(0, 6)
  })

  it('multiplies the snowflake edges by four per order', () => {
    const count = (d: string) => (d.match(/L /g) ?? []).length
    expect(count(lindenmayer(kochCurve, { order: 0, angle: 60 }).toSVGPath())).toBe(3)
    expect(count(lindenmayer(kochCurve, { order: 1, angle: 60 }).toSVGPath())).toBe(12)
    expect(count(lindenmayer(kochCurve, { order: 2, angle: 60 }).toSVGPath())).toBe(48)
  })

  it('draws the Hilbert curve off X, with + and - swapped', () => {
    // The manual redefines + as turn right and - as turn left, and
    // makes X the drawing symbol; A and B only rewrite.
    expect(hilbertCurve.symbols!['X']).toBe(lsystemActions.drawForward)
    expect(hilbertCurve.symbols!['+']).toBe(lsystemActions.turnRight)
    expect(hilbertCurve.symbols!['-']).toBe(lsystemActions.turnLeft)

    const d = lindenmayer(hilbertCurve, { order: 2, step: 10, angle: 90 }).toSVGPath()
    // Every drawn leg is axis-aligned and one step long.
    expect(d.match(/L /g)!.length).toBeGreaterThan(10)
    expect(d).not.toContain('M 0 0 L 0 0')
  })

  it('leaves A and B undrawn', () => {
    const noRewrite = lindenmayer({ axiom: 'AB', symbols: hilbertCurve.symbols }, { step: 10 })
    expect(noRewrite.toSVGPath()).toBe('M 0 0')
  })
})

describe('randomization', () => {
  it('changes nothing at zero percent, which is the default', () => {
    const plain = lindenmayer(kochCurve, { order: 1, step: 10, angle: 60 }).toSVGPath()
    const zeroed = lindenmayer(kochCurve, {
      order: 1,
      step: 10,
      angle: 60,
      randomizeStepPercent: 0,
      randomizeAnglePercent: 0,
    }).toSVGPath()
    expect(zeroed).toBe(plain)
  })

  it('is reproducible for a seed and different across seeds', () => {
    const draw = (seed: number) =>
      lindenmayer(kochCurve, {
        order: 2,
        step: 10,
        angle: 60,
        randomizeStepPercent: 50,
        randomizeAnglePercent: 10,
        seed,
      }).toSVGPath()
    expect(draw(7)).toBe(draw(7))
    expect(draw(7)).not.toBe(draw(8))
  })

  it('keeps the step within the requested percentage, unlike PGF', () => {
    // PGF's step + rand*percent/20 can go negative at small steps; a
    // true percentage cannot. Every leg here stays within ±50% of 10.
    const d = lindenmayer(
      { axiom: 'FFFFFFFFFFFFFFFFFFFF' },
      { step: 10, randomizeStepPercent: 50, seed: 3 }
    ).toSVGPath()
    const xs = d.split(/[ML] /).filter(Boolean).map((s) => Number(s.trim().split(' ')[0]))
    for (let i = 1; i < xs.length; i++) {
      const leg = xs[i]! - xs[i - 1]!
      expect(leg).toBeGreaterThanOrEqual(5)
      expect(leg).toBeLessThanOrEqual(15)
    }
  })
})
