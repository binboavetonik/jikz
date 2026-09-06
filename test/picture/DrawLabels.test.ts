/**
 * Draw-verb labels: `pic.draw(shape, { label })` — TikZ's
 * `\draw … node[right]{…}` sugar. Labels are desugared into text items
 * at call time; placement is the shape's anchor + the placeText ray
 * math. Frame: 'screen' default (page-frame, like TikZ path nodes);
 * 'local' follows a Rotated wrapper's own frame.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { line } from '../../src/geometry/Line'
import { rect } from '../../src/geometry/Rectangle'
import { arc } from '../../src/geometry/Arc'
import { Rotated } from '../../src/geometry/Rotated'
import { placeText } from '../../src/text/placeText'
import { measureText } from '../../src/text/measureText'
import { DEFAULT_LABEL_DISTANCE } from '../../src/node/Node'

function textXY(svg: string, content: string): { x: number; y: number } {
  const m = svg.match(new RegExp(`<text[^>]*x="([\\d.-]+)" y="([\\d.-]+)"[^>]*>${content}</text>`))
  if (!m) throw new Error(`text "${content}" not found in: ${svg}`)
  return { x: parseFloat(m[1]!), y: parseFloat(m[2]!) }
}

describe('draw-verb labels', () => {
  it('label on a circle: east of the border by gap + half text width', () => {
    const svg = picture()
      .draw(circle(point(100, 100), 30), { label: { text: 'C', at: 'east' } })
      .toSVG({ width: 200, height: 200 })
    const m = measureText('C', { fontSize: 12 })
    const xy = textXY(svg, 'C')
    expect(xy.x).toBeCloseTo(130 + DEFAULT_LABEL_DISTANCE + m.width / 2, 6)
    expect(xy.y).toBeCloseTo(100, 6)
  })

  it("label on a horizontal line: 'east' anchor is the right endpoint", () => {
    // TikZ: \draw (-1.3,0) -- (1.3,0) node[right] {$\cos$}
    const svg = picture()
      .draw(line(point(0, 100), point(200, 100)), {
        label: { text: 'cos', at: 'east', distance: 6 },
      })
      .toSVG({ width: 220, height: 200 })
    const expected = placeText(point(200, 100), 'cos', {
      at: 'east',
      distance: 6,
      fontSize: 12,
    })
    const xy = textXY(svg, 'cos')
    expect(xy.x).toBeCloseTo(expected.x, 6)
    expect(xy.y).toBeCloseTo(expected.y, 6)
  })

  it("string shorthand, default placement 'north'", () => {
    const svg = picture()
      .fill(circle(point(100, 100), 30), { label: 'C' })
      .toSVG({ width: 200, height: 200 })
    const xy = textXY(svg, 'C')
    expect(xy.x).toBeCloseTo(100, 6)
    expect(xy.y).toBeLessThan(70) // above the circle border
  })

  it('multiple labels via labels[]', () => {
    const svg = picture()
      .draw(circle(point(100, 100), 30), {
        labels: [
          { text: 'N', at: 'north' },
          { text: 'S', at: 'south' },
        ],
      })
      .toSVG({ width: 200, height: 200 })
    expect(textXY(svg, 'N').y).toBeLessThan(70)
    expect(textXY(svg, 'S').y).toBeGreaterThan(130)
  })

  it("'center' label sits on the shape center", () => {
    const svg = picture()
      .draw(circle(point(100, 100), 30), { label: { text: 'C', at: 'center' } })
      .toSVG({ width: 200, height: 200 })
    expect(textXY(svg, 'C')).toEqual({ x: 100, y: 100 })
  })

  it('text anchors are rejected', () => {
    expect(() =>
      picture().draw(circle(point(0, 0), 10), { label: { text: 'x', at: 'base' } })
    ).toThrow(/text anchor/)
  })

  it('label keys never reach the SVG; shape still renders', () => {
    const svg = picture()
      .draw(circle(point(100, 100), 30), { label: 'C' })
      .toSVG({ width: 200, height: 200 })
    expect(svg).not.toContain('label=')
    expect(svg).toContain('<circle') // the shape itself
  })
})

describe('draw-verb label frame', () => {
  // rect centered (100,100), 60×20, rotated 90° → visually 20×60.
  const rotatedRect = () => new Rotated(rect(70, 90, 60, 20), 90)

  it("default 'screen': 'north' is the visual top of the rotated shape", () => {
    const svg = picture()
      .draw(rotatedRect(), { label: { text: 'x', at: 'north' } })
      .toSVG({ width: 200, height: 200 })
    const xy = textXY(svg, 'x')
    expect(xy.x).toBeCloseTo(100, 6)
    expect(xy.y).toBeLessThan(70)
  })

  it("'local': the label rides the rotation like a node label", () => {
    const svg = picture()
      .draw(rotatedRect(), { label: { text: 'x', at: 'north', frame: 'local' } })
      .toSVG({ width: 200, height: 200 })
    const xy = textXY(svg, 'x')
    expect(xy.x).toBeGreaterThan(110) // visual right side
    expect(xy.y).toBeCloseTo(100, 6)
  })

  it('plain (unrotated) geometry: local and screen coincide', () => {
    const c = circle(point(100, 100), 30)
    const screen = picture()
      .draw(c, { label: { text: 'x', at: 'north' } })
      .toSVG({ width: 200, height: 200 })
    const local = picture()
      .draw(c, { label: { text: 'x', at: 'north', frame: 'local' } })
      .toSVG({ width: 200, height: 200 })
    expect(textXY(screen, 'x')).toEqual(textXY(local, 'x'))
  })
})

describe('draw-verb path labels (pos/offset)', () => {
  it('midway on an eastbound line: left of travel = above', () => {
    const svg = picture()
      .draw(line(point(0, 100), point(200, 100)), {
        label: { text: 'L', pos: 0.5, offset: 8 },
      })
      .toSVG({ width: 220, height: 200 })
    expect(textXY(svg, 'L')).toEqual({ x: 100, y: 92 })
  })

  it('pos 0/1 sit at the endpoints; negative offset flips sides', () => {
    const svg = picture()
      .draw(line(point(0, 100), point(200, 100)), {
        labels: [
          { text: 'S', pos: 0, offset: 0 },
          { text: 'E', pos: 1, offset: 0 },
          { text: 'B', pos: 0.5, offset: -8 },
        ],
      })
      .toSVG({ width: 220, height: 200 })
    expect(textXY(svg, 'S')).toEqual({ x: 0, y: 100 })
    expect(textXY(svg, 'E')).toEqual({ x: 200, y: 100 })
    expect(textXY(svg, 'B')).toEqual({ x: 100, y: 108 }) // right of travel = below
  })

  it('default offset is 5 (Edge labelOffset default)', () => {
    const svg = picture()
      .draw(line(point(0, 100), point(200, 100)), { label: { text: 'L', pos: 0.5 } })
      .toSVG({ width: 220, height: 200 })
    expect(textXY(svg, 'L')).toEqual({ x: 100, y: 95 })
  })

  it('arc midpoint: positive offset lands radially outward', () => {
    // arc(-90°→0°) midpoint at 315°; travel is cw, left = outward
    const svg = picture()
      .draw(arc(point(0, 0), 50, -90, 0), {
        label: { text: 'a', pos: 0.5, offset: 10 },
      })
      .toSVG({ width: 100, height: 100 })
    const xy = textXY(svg, 'a')
    expect(Math.hypot(xy.x, xy.y)).toBeCloseTo(60, 4)
  })

  it('pos wins over at when both are given', () => {
    const svg = picture()
      .draw(line(point(0, 100), point(200, 100)), {
        label: { text: 'L', pos: 0.5, offset: 8, at: 'north' },
      })
      .toSVG({ width: 220, height: 200 })
    expect(textXY(svg, 'L')).toEqual({ x: 100, y: 92 })
  })

  it('circle with pos throws (angle-based pointAt); point throws too', () => {
    expect(() =>
      picture().draw(circle(point(0, 0), 10), { label: { text: 'x', pos: 0.5 } })
    ).toThrow(/angle-based/)
    expect(() =>
      picture().draw(point(0, 0), { label: { text: 'x', pos: 0.5 } })
    ).toThrow(/pointAt/)
  })
})
