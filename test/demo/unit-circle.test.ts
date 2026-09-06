/**
 * Smoke test mirroring the demo/index.html 'unit-circle-derivative'
 * card — same scene code, compiled headless via toSVG. Guards the
 * example users copy.
 *
 * The card ports a Beamer TikZ slide (derivative of sine): TikZ polar
 * (θ:r) is math-convention (y up, ccw); jikz is screen-convention
 * (y down, cw) — so (θ:r) maps to polar(-θ, r) and TikZ arc(0:θ:1) maps
 * to arc(o, r, 0, -θ, true).
 */
import { describe, it, expect } from 'vitest'
import {
  picture,
  point,
  origin,
  polar,
  circle,
  line,
  arc,
} from '../../src/index'

const THETA = 50
const AXIS = 130
const R = 100

/** TikZ (deg:r) math-convention polar → jikz screen-convention point. */
const P = (deg: number, r: number) => polar(-deg, r)

function build(): string {
  const pic = picture()

  pic.draw(line(point(-AXIS, 0), point(AXIS, 0)), {
    label: { text: '$\\cos$', at: 'east', distance: 6, options: { fontSize: 13 } },
  })
  pic.draw(line(point(0, AXIS), point(0, -AXIS)), {
    label: { text: '$\\sin$', at: 'north', distance: 6, options: { fontSize: 13 } },
  })

  pic.draw(circle(origin, R), { style: { strokeWidth: 2 } })

  const dots = [
    { at: point(R, 0), label: '1', place: 'south east' },
    { at: point(-R, 0), label: '-1', place: 'south west' },
    { at: point(0, R), label: '-1', place: 'south west' },
    { at: point(0, -R), label: '1', place: 'north west' },
  ] as const
  for (const { at, label, place } of dots) {
    pic.fill(circle(at, 1.5), {
      label: { text: label, at: place, distance: 4, options: { fontSize: 11 } },
    })
  }

  pic.draw(line(origin, P(THETA, R)))

  pic.pen({ mode: 'fill', style: { fill: '#c0392b', fillOpacity: 0.85 } })
    .moveTo(origin)
    .lineTo(P(THETA, R))
    .lineTo(point(R, 0))
    .close()

  pic.draw(arc(origin, R, 0, -THETA, true))

  pic.text(P(THETA / 2, 30), 'h', { fontSize: 13 })

  return pic.toSVG({ fit: true, padding: 8 })
}

describe('demo card: unit circle (derivative of sine)', () => {
  it('polar mapping matches TikZ (θ:1)', () => {
    // TikZ (50:1) = (cos50°, sin50°) with y up = (cos50°, -sin50°) on screen
    const tip = P(THETA, R)
    expect(tip.x).toBeCloseTo(Math.cos((THETA * Math.PI) / 180) * R, 6)
    expect(tip.y).toBeCloseTo(-Math.sin((THETA * Math.PI) / 180) * R, 6)
  })

  it('angle arc starts at (1,0) and sweeps θ like arc(0:θ:1)', () => {
    const a = arc(origin, R, 0, -THETA, true)
    expect(a.start.x).toBeCloseTo(R, 6)
    expect(a.start.y).toBeCloseTo(0, 6)
    expect(a.end.x).toBeCloseTo(P(THETA, R).x, 6)
    expect(a.end.y).toBeCloseTo(P(THETA, R).y, 6)
    expect(a.sweep).toBeCloseTo(THETA, 6)
  })

  it('scene renders: wedge fill, arc command, labels, translation', () => {
    const svg = build()
    expect(svg).toContain('A ') // elliptical-arc command (unit circle + angle arc)
    expect(svg).toContain('#c0392b') // wedge fill
    expect(svg).toContain('>h<') // angle label
    expect(svg).toContain('$\\cos$') // math fallback text (no KaTeX in node)
    // fit: viewBox auto-sized from content — negative origin, no 0 0 320 320
    expect(svg).toMatch(/viewBox="-/) 
    expect(svg).not.toContain('matrix(') // no manual centering transform
    // four cardinal dots
    expect(svg.split('<circle').length - 1).toBe(1 + 4) // unit circle + dots
  })

  it('dot labels hang on the fill call, placed south-east of their points', () => {
    const svg = build()
    // '1' label of the (1,0) dot: placed south-east → right and below
    const m = svg.match(/<text[^>]*x="([\d.-]+)" y="([\d.-]+)"[^>]*>1<\/text>/)
    expect(m).toBeTruthy()
    expect(parseFloat(m![1]!)).toBeGreaterThan(R + 4) // east of the dot
    expect(parseFloat(m![2]!)).toBeGreaterThan(4) // and below the axis
    // label keys are consumed by Picture, never rendered
    expect(svg).not.toContain('label=')
  })
})
