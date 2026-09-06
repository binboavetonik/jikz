/**
 * placeText + Picture.text placement — TikZ `\node[<dir>] at <p> {…}`
 * for bare text: directional placement (compass/alias/angle) with a
 * point-to-border distance, reusing Node.labelPoint's ray math.
 */
import { describe, it, expect } from 'vitest'
import { placeText } from '../../src/text/placeText'
import { measureText } from '../../src/text/measureText'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { DEFAULT_LABEL_DISTANCE } from '../../src/node/Node'

const REF = point(100, 100)

function extent(text: string, fontSize: number) {
  return measureText(text, { fontSize })
}

describe('placeText', () => {
  it('default (no at) centers on the reference point', () => {
    expect(placeText(REF, 'X')).toEqual(point(100, 100))
    expect(placeText(REF, 'X', { at: 'center' })).toEqual(point(100, 100))
  })

  it('math labels measure as their TeX body, delimiters stripped', () => {
    // '$\\cos$' estimates as '\cos', not '$\\cos$' — placement gaps
    // approximate the visible content, not the markup.
    const withMath = placeText(REF, '$\\cos$', { at: 'east', fontSize: 12 })
    const bodyOnly = placeText(REF, '\\cos', { at: 'east', fontSize: 12 })
    expect(withMath).toEqual(bodyOnly)
  })

  it('east: text left border sits `distance` right of the point', () => {
    const { width } = extent('X', 12)
    const c = placeText(REF, 'X', { at: 'east', fontSize: 12 })
    expect(c.x).toBeCloseTo(100 + DEFAULT_LABEL_DISTANCE + width / 2, 6)
    expect(c.y).toBeCloseTo(100, 6)
  })

  it('north: text top border sits `distance` above the point', () => {
    const { height } = extent('X', 12)
    const c = placeText(REF, 'X', { at: 'north', fontSize: 12 })
    expect(c.x).toBeCloseTo(100, 6)
    expect(c.y).toBeCloseTo(100 - DEFAULT_LABEL_DISTANCE - height / 2, 6)
  })

  it('south east: diagonal push splits along the ray', () => {
    const { width, height } = extent('X', 12)
    const c = placeText(REF, 'X', { at: 'south east', fontSize: 12, distance: 10 })
    const diag = Math.SQRT1_2
    const halfAlongRay = (diag * width + diag * height) / 2
    expect(c.x).toBeCloseTo(100 + diag * (10 + halfAlongRay), 6)
    expect(c.y).toBeCloseTo(100 + diag * (10 + halfAlongRay), 6)
  })

  it('aliases and numeric angles work (screen convention: 90 = south)', () => {
    expect(placeText(REF, 'X', { at: 'ne' }).y).toBeLessThan(100)
    expect(placeText(REF, 'X', { at: 90 }).y).toBeGreaterThan(100)
    expect(placeText(REF, 'X', { at: 270 }).y).toBeLessThan(100)
  })

  it('distance=0 puts the text border exactly on the point', () => {
    const { width } = extent('hello', 12)
    const c = placeText(REF, 'hello', { at: 'east', distance: 0, fontSize: 12 })
    expect(c.x - width / 2).toBeCloseTo(100, 6)
  })

  it('text anchors are rejected, unknown specs throw AnchorError', () => {
    expect(() => placeText(REF, 'X', { at: 'base' })).toThrow(/text anchor/)
    expect(() => placeText(REF, 'X', { at: 'nowhere' })).toThrow()
  })
})

describe('Picture.text with placement', () => {
  function textXY(svg: string, content: string): { x: number; y: number } {
    const m = svg.match(new RegExp(`<text[^>]*x="([\\d.-]+)" y="([\\d.-]+)"[^>]*>${content}</text>`))
    if (!m) throw new Error(`text "${content}" not found in: ${svg}`)
    return { x: parseFloat(m[1]!), y: parseFloat(m[2]!) }
  }

  it('no placement: centered on the point (unchanged behavior)', () => {
    const svg = picture().text(REF, 'X').toSVG({ width: 200, height: 200 })
    expect(textXY(svg, 'X')).toEqual({ x: 100, y: 100 })
  })

  it('placement moves the render point like placeText', () => {
    const svg = picture()
      .text(REF, 'X', { at: 'east', distance: 10, fontSize: 12 })
      .toSVG({ width: 200, height: 200 })
    const xy = textXY(svg, 'X')
    const expected = placeText(REF, 'X', { at: 'east', distance: 10, fontSize: 12 })
    expect(xy.x).toBeCloseTo(expected.x, 6)
    expect(xy.y).toBeCloseTo(expected.y, 6)
  })

  it('placement keys never leak into SVG attributes', () => {
    const svg = picture()
      .text(REF, 'X', { at: 'south east', distance: 4 })
      .toSVG({ width: 200, height: 200 })
    expect(svg).not.toContain('distance=')
    expect(svg).toContain('text-anchor="middle"')
  })

  it('all four compass quadrants place on the right side of the point', () => {
    const svg = picture()
      .text(REF, 'ne', { at: 'north east' })
      .text(REF, 'nw', { at: 'north west' })
      .text(REF, 'se', { at: 'south east' })
      .text(REF, 'sw', { at: 'south west' })
      .toSVG({ width: 200, height: 200 })
    expect(textXY(svg, 'ne')).toMatchObject({})
    const [ne, nw, se, sw] = ['ne', 'nw', 'se', 'sw'].map((c) => textXY(svg, c))
    expect(ne!.x).toBeGreaterThan(100)
    expect(ne!.y).toBeLessThan(100)
    expect(nw!.x).toBeLessThan(100)
    expect(nw!.y).toBeLessThan(100)
    expect(se!.x).toBeGreaterThan(100)
    expect(se!.y).toBeGreaterThan(100)
    expect(sw!.x).toBeLessThan(100)
    expect(sw!.y).toBeGreaterThan(100)
  })
})
