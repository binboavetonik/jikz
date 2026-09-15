import { describe, it, expect } from 'vitest'
import { createSVGBuilder } from '../../src/render/SVGBuilder'

const LONG_DECIMAL = /-?\d+\.\d{7,}/

/**
 * Coordinates are rounded at the serialization boundary.
 *
 * `Math.sin`/`cos`/`pow`/`acos` are not required by ECMAScript to be
 * correctly rounded, so the last bits of a computed coordinate depend on
 * the JS engine. Emitting all 17 significant digits makes rendered output
 * machine-dependent - which this repo has already been bitten by once, in
 * the example snapshot suite - and spends a sixth of the output bytes on
 * digits far below any visible difference.
 */
describe('attribute precision', () => {
  const svg = () => createSVGBuilder()

  it('rounds long decimals in numeric attributes', () => {
    const out = svg().circle(10).attr({ cx: 59.99999999999999, cy: 110 })
    const s = out.node.attrs
    const b = svg()
    b.node.children.push(out.node)

    expect(b.toSVG({ width: 10, height: 10 })).toContain('cx="60"')
    expect(s.cy).toBe(110)
  })

  it('rounds long decimals inside path data', () => {
    const b = svg()
    b.path('M 0.1234567891234 0 L 131.42857142857142 97.99416799999999')

    const out = b.toSVG({ width: 10, height: 10 })
    expect(out).toContain('d="M 0.123457 0 L 131.428571 97.994168"')
    expect(LONG_DECIMAL.test(out)).toBe(false)
  })

  it('strips trailing zeros rather than padding to six places', () => {
    const b = svg()
    b.circle(1).attr({ cx: 59.99999999999999, cy: 2.5 })

    const out = b.toSVG({ width: 10, height: 10 })
    expect(out).toContain('cx="60"')
    expect(out).toContain('cy="2.5"')
    expect(out).not.toContain('60.000000')
  })

  it('keeps six decimal places of real precision', () => {
    const b = svg()
    b.circle(1).attr({ cx: 131.4285714285, cy: -0.500004 })

    const out = b.toSVG({ width: 10, height: 10 })
    expect(out).toContain('cx="131.428571"')
    expect(out).toContain('cy="-0.500004"')
  })

  it('collapses sub-threshold noise to zero', () => {
    const b = svg()
    b.circle(1).attr({ cx: 1e-15, cy: -1e-15 })

    const out = b.toSVG({ width: 10, height: 10 })
    expect(out).toContain('cx="0"')
    expect(out).toContain('cy="0"')
    expect(out).not.toContain('-0')
  })

  it('leaves non-numeric attributes alone', () => {
    const b = svg()
    b.circle(1).attr({ fill: '#dc2626', class: 'pt-1.2345678901', id: 'a.b.c' })

    const out = b.toSVG({ width: 10, height: 10 })
    expect(out).toContain('fill="#dc2626"')
    expect(out).toContain('id="a.b.c"')
  })

  it('does not round text content, which may be a user label', () => {
    const b = svg()
    b.text('pi = 3.14159265358979')

    expect(b.toSVG({ width: 10, height: 10 })).toContain('pi = 3.14159265358979')
  })

  it('rounds transform and viewBox too', () => {
    const b = svg()
    b.circle(1).attr({ transform: 'rotate(45.000000000000014, 1.9999999999999998, 0)' })

    const out = b.toSVG({ width: 10.000000000001, height: 10 })
    expect(out).toContain('rotate(45, 2, 0)')
    expect(out).toContain('viewBox="0 0 10 10"')
  })

  it('is byte-identical across repeated renders', () => {
    const build = () => {
      const b = svg()
      b.path(`M ${Math.sin(1) * 100} ${Math.cos(1) * 100} L ${Math.sqrt(2) * 50} 0`)
      return b.toSVG({ width: 100, height: 100 })
    }
    expect(build()).toBe(build())
    expect(LONG_DECIMAL.test(build())).toBe(false)
  })

  it('handles non-finite values without corrupting them', () => {
    const b = svg()
    b.circle(1).attr({ cx: NaN, cy: Infinity })

    const out = b.toSVG({ width: 10, height: 10 })
    expect(out).toContain('cx="NaN"')
    expect(out).toContain('cy="Infinity"')
  })
})
