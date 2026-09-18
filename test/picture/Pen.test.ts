/**
 * Pen — the fluent TikZ path statement: `\draw (a) -- (b) node[right]{x}
 * -- cycle` as a chain. Segments draw one path; labels hang on the pen
 * (at) or ride the last segment (pos); expansion happens at render
 * time in registration order.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { placeText } from '../../src/text/placeText'

function textXY(svg: string, content: string): { x: number; y: number } {
  const m = svg.match(new RegExp(`<text[^>]*x="([\\d.-]+)" y="([\\d.-]+)"[^>]*>${content}</text>`))
  if (!m) throw new Error(`text "${content}" not found in: ${svg}`)
  return { x: parseFloat(m[1]!), y: parseFloat(m[2]!) }
}

describe('pen path geometry', () => {
  it('segments compile to one stroked path', () => {
    const pic = picture()
    pic.pen().moveTo(10, 10).lineTo(110, 10).lineTo(point(110, 60)).close()
    const out = pic.toSVG({ width: 200, height: 100 })
    expect(out).toContain('M 10 10 L 110 10 L 110 60 Z')
    expect(out).toContain('stroke="#000000"')
  })

  it('first lineTo acts as moveTo (TikZ implicit move)', () => {
    const pic = picture()
    pic.pen().lineTo(10, 10).lineTo(50, 10)
    expect(pic.toSVG({ width: 100, height: 50 })).toContain('M 10 10 L 50 10')
  })

  it('horizontalTo / verticalTo / lineBy', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).horizontalTo(40).verticalTo(30).lineBy(-10, 10)
    expect(pic.toSVG({ width: 100, height: 100 })).toContain(
      'M 0 0 L 40 0 L 40 30 L 30 40'
    )
  })

  it('fill mode fills instead of stroking', () => {
    const pic = picture()
    pic.pen({ mode: 'fill', style: { fill: '#c0392b' } })
      .moveTo(0, 0)
      .lineTo(10, 0)
      .lineTo(10, 10)
      .close()
    const svg = pic.toSVG({ width: 20, height: 20 })
    expect(svg).toContain('fill="#c0392b"')
  })

  it('to() is the TikZ -- alias', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).to(20, 0).to(point(20, 20))
    expect(pic.toSVG({ width: 30, height: 30 })).toContain('M 0 0 L 20 0 L 20 20')
  })

  it('hvTo / vhTo draw corner operations (TikZ -| and |-)', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).hvTo(40, 30)
    pic.pen().moveTo(0, 0).vhTo(point(40, 30))
    const svg = pic.toSVG({ width: 50, height: 40 })
    expect(svg).toContain('M 0 0 L 40 0 L 40 30')
    expect(svg).toContain('M 0 0 L 0 30 L 40 30')
  })

  it('curveTo / smoothCurveTo / quadraticTo compile Bézier segments', () => {
    const pic = picture()
    pic.pen()
      .moveTo(0, 0)
      .curveTo(point(0, 50), point(50, 50), point(50, 0))
      .smoothCurveTo(point(100, -50), point(100, 0))
      .quadraticTo(point(150, 50), point(150, 0))
    const svg = pic.toSVG({ width: 200, height: 100 })
    expect(svg).toContain('M 0 0 C 0 50, 50 50, 50 0')
    // smooth cp1 reflects the previous cp2 across the pen position
    expect(svg).toContain('C 50 -50, 100 -50, 100 0')
    expect(svg).toContain('Q 150 50, 150 0')
  })

  it('through / bendTo compile cubic segments ending at the target', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).through(point(50, -20), point(100, 0))
    pic.pen().moveTo(0, 50).bendTo(point(100, 50), 30)
    const svg = pic.toSVG({ width: 120, height: 80 })
    // `through` passes THROUGH its point: two cubics joined there.
    expect(svg).toMatch(
      /M 0 0 C [\d.]+ [\d.-]+, [\d.]+ [\d.-]+, 50 -20 C [\d.]+ [\d.-]+, [\d.]+ [\d.-]+, 100 0/
    )
    expect(svg).toMatch(/M 0 50 C [\d.]+ [\d.-]+, [\d.]+ [\d.-]+, 100 50/)
  })

  it('bendTo bends the same way as to({ bend }) and as an edge', () => {
    const a = picture()
    a.pen().moveTo(0, 50).bendTo(point(100, 50), 30)
    const b = picture()
    b.pen().moveTo(0, 50).to(point(100, 50), { bend: 30 })
    const svgA = a.toSVG({ width: 120, height: 80 })
    const svgB = b.toSVG({ width: 120, height: 80 })
    expect(svgA).toBe(svgB)
    // Positive bend is LEFT of travel; heading east on screen that is up.
    const cp = svgA.match(/C ([\d.]+) ([\d.-]+),/)!
    expect(Number(cp[2])).toBeLessThan(50)
  })

  it('to() without options is a straight segment (TikZ --)', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).to(point(100, 0)).to(100, 50)
    const svg = pic.toSVG({ width: 120, height: 80 })
    expect(svg).toContain('M 0 0 L 100 0 L 100 50')
  })

  it('to() with out/in compiles a cubic segment', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).to(point(100, 0), { out: 90, in: 90 })
    const svg = pic.toSVG({ width: 120, height: 80 })
    // out: 90 = down from start → cp1 (0, 40); in: 90 = arrive heading south → cp2 (100, -40)
    expect(svg).toMatch(/M 0 0 C [^ ]+ 40, [^ ]+ -40, 100 0/)
  })

  it('to() with bend left curves left of travel', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).to(point(100, 0), { bend: 'left' })
    const svg = pic.toSVG({ width: 120, height: 80 })
    expect(svg).toMatch(/M 0 0 C [\d.]+ [\d.-]+, [\d.]+ [\d.-]+, 100 0/)
    // left of east travel = up: the first control point has negative y
    const m = svg.match(/M 0 0 C ([\d.-]+) ([\d.-]+),/)
    expect(parseFloat(m![2]!)).toBeLessThan(0)
  })

  it('to() as first verb with no options acts as moveTo', () => {
    const pic = picture()
    pic.pen().to(10, 10).to(50, 10)
    expect(pic.toSVG({ width: 60, height: 20 })).toContain('M 10 10 L 50 10')
  })

  it('curved to() requires a pen position', () => {
    expect(() => picture().pen().to(point(10, 10), { out: 0 })).toThrow(/pen position/)
  })

  it('pos label rides a curved to() segment by arc length', () => {
    const pic = picture()
    pic.pen()
      .moveTo(0, 100)
      .to(point(100, 0), { bend: 'left' })
      .label('m', { pos: 0.5, offset: 0 })
    const svg = pic.toSVG({ width: 120, height: 120 })
    expect(svg).toContain('>m</text>')
    // midpoint of a 30°-bent segment sits left of the straight chord
    const xy = textXY(svg, 'm')
    expect(xy.x).toBeLessThan(50)
    expect(xy.y).toBeLessThan(50)
  })

  it('arcTo / circularArcTo compile SVG arc segments', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).arcTo(30, 20, 0, false, true, point(60, 0))
    pic.pen().moveTo(0, 50).circularArcTo(25, false, true, point(50, 50))
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(svg).toContain('M 0 0 A 30 20 0 0 1 60 0')
    expect(svg).toContain('M 0 50 A 25 25 0 0 1 50 50')
  })
})

describe('pen labels', () => {
  it('at-labels hang on the current pen position via placeText', () => {
    const pic = picture()
    pic.pen().moveTo(50, 50).label('A', { at: 'south east', distance: 4, style: { fontSize: 12 } })
    const xy = textXY(pic.toSVG({ width: 100, height: 100 }), 'A')
    const expected = placeText(point(50, 50), 'A', {
      at: 'south east',
      distance: 4,
      fontSize: 12,
    })
    expect(xy.x).toBeCloseTo(expected.x, 6)
    expect(xy.y).toBeCloseTo(expected.y, 6)
  })

  it('pos labels ride the segment just drawn (left of travel)', () => {
    const pic = picture()
    pic.pen().moveTo(0, 100).lineTo(200, 100).label('c', { pos: 0.5, offset: 8 })
    expect(textXY(pic.toSVG({ width: 220, height: 200 }), 'c')).toEqual({ x: 100, y: 92 })
  })

  it('pos label after close() rides the closing segment', () => {
    const pic = picture()
    pic.pen()
      .moveTo(0, 0)
      .lineTo(100, 0)
      .close()
      .label('x', { pos: 0.5, offset: 0 })
    // closing segment: (100,0) → (0,0); midpoint (50, 0)
    expect(textXY(pic.toSVG({ width: 100, height: 50 }), 'x')).toEqual({ x: 50, y: 0 })
  })

  it('pos label rides a curve segment by arc length (offset 0)', () => {
    const pic = picture()
    // symmetric cubic: midpoint lands on the axis of symmetry
    pic.pen()
      .moveTo(0, 0)
      .curveTo(point(0, 100), point(100, 100), point(100, 0))
      .label('m', { pos: 0.5, offset: 0 })
    expect(textXY(pic.toSVG({ width: 120, height: 120 }), 'm')).toEqual({ x: 50, y: 75 })
  })

  it('pos label on a corner operation spans both legs (elbow at 0.5)', () => {
    const pic = picture()
    pic.pen().moveTo(0, 0).hvTo(100, 100).label('k', { pos: 0.5, offset: 0 })
    // total length 200; arc-length midpoint is the elbow (100, 0)
    expect(textXY(pic.toSVG({ width: 120, height: 120 }), 'k')).toEqual({ x: 100, y: 0 })
  })

  it('pos label rides an arc segment by arc length (apex at 0.5)', () => {
    const pic = picture()
    // semicircle (0,50) → (100,50), sweep=true bulges up: apex (50, 0)
    pic.pen()
      .moveTo(0, 50)
      .circularArcTo(50, false, true, point(100, 50))
      .label('a', { pos: 0.5, offset: 0 })
    const xy = textXY(pic.toSVG({ width: 120, height: 80 }), 'a')
    expect(xy.x).toBeCloseTo(50, 9)
    expect(xy.y).toBeCloseTo(0, 9)
  })

  it('pos label on an arc: offset pushes left of travel (radially outward)', () => {
    const pic = picture()
    // at the apex the pen travels east → left is north (up)
    pic.pen()
      .moveTo(0, 50)
      .circularArcTo(50, false, true, point(100, 50))
      .label('a', { pos: 0.5, offset: 8 })
    const xy = textXY(pic.toSVG({ width: 120, height: 80 }), 'a')
    expect(xy.x).toBeCloseTo(50, 9)
    expect(xy.y).toBeCloseTo(-8, 9)
  })

  it('fit viewBox covers an arc bulge', () => {
    const pic = picture()
    pic.pen().moveTo(0, 50).circularArcTo(50, false, true, point(100, 50))
    const svg = pic.toSVG({ fit: true, padding: 0 })
    // bulge apex is (50, 0); chord ends at y=50 → viewBox starts at y=0
    expect(svg).toMatch(/viewBox="0 0 100 50/)
  })

  it('a moveTo-only pen emits no path item but keeps its labels', () => {
    const pic = picture()
    pic.pen().moveTo(50, 50).label('L')
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(svg).not.toContain('<path')
    expect(svg).toContain('>L<')
  })

  it('label before any pen position throws; pos without segment throws', () => {
    const pic = picture()
    expect(() => pic.pen().label('A')).toThrow(/moveTo/)
    expect(() => pic.pen().moveTo(0, 0).label('A', { pos: 0.5 })).toThrow(/segment/)
  })

  it('labels do not move the pen', () => {
    const p = picture().pen()
    p.moveTo(10, 10).label('A')
    expect(p.position).toEqual(point(10, 10))
  })
})

describe('pen in the picture', () => {
  it('expands at render time, in registration order', () => {
    const pic = picture()
    pic.text(point(0, 0), 'before', { style: { fontSize: 10 } })
    const pen = pic.pen()
    pic.text(point(0, 0), 'after', { style: { fontSize: 10 } })
    // mutate the pen AFTER registering other items — expansion is lazy
    pen.moveTo(0, 0).lineTo(50, 0).label('mid', { pos: 1 })
    const svg = pic.toSVG({ width: 100, height: 50 })
    const iBefore = svg.indexOf('>before<')
    const iPath = svg.indexOf('M 0 0 L 50 0')
    const iMid = svg.indexOf('>mid<')
    const iAfter = svg.indexOf('>after<')
    expect(iBefore).toBeLessThan(iPath)
    expect(iPath).toBeLessThan(iMid)
    expect(iMid).toBeLessThan(iAfter)
  })

  it('fit viewBox covers the pen path and its labels', () => {
    const pic = picture()
    pic.pen()
      .moveTo(-50, 0)
      .lineTo(50, 0)
      .label('E', { at: 'east', distance: 4, style: { fontSize: 12 } })
    const svg = pic.toSVG({ fit: true, padding: 0 })
    expect(svg).toMatch(/viewBox="-5\d/)
    expect(svg).not.toContain('matrix(')
  })
})

describe('pen coordinates (TikZ coordinate (A))', () => {
  it('coordinate() names the pen position; names resolve in later statements', () => {
    const pic = picture()
    pic.pen().moveTo(10, 20).coordinate('A').lineTo(80, 20).coordinate('B')
    // a second pen statement references the names — \draw (A) -- (B)
    pic.pen({ style: { stroke: '#dc2626' } }).moveTo('A').lineTo('B')
    const svg = pic.toSVG({ width: 100, height: 40 })
    expect(svg.match(/M 10 20 L 80 20/g)!.length).toBe(2)
    expect(svg).toContain('stroke="#dc2626"')
  })

  it('coordinates resolve as edge endpoints and via pic.resolve', () => {
    const pic = picture()
    pic.pen().moveTo(30, 40).coordinate('P')
    expect(pic.resolve('P')).toEqual(point(30, 40))
    expect(pic.resolve('P.north')).toEqual(point(30, 40)) // zero-size node
    pic.edge('P', point(80, 40))
    const svg = pic.toSVG({ width: 100, height: 60 })
    expect(svg).toContain('30 40')
  })

  it('pic.coordinate(name, at) names a point without a pen', () => {
    const pic = picture()
    pic.coordinate('O', point(0, 0))
    pic.pen().moveTo('O').lineTo(10, 0)
    expect(pic.toSVG({ width: 20, height: 20 })).toContain('M 0 0 L 10 0')
  })

  it('duplicate names throw — against nodes and coordinates alike', () => {
    const pic = picture()
    pic.coordinate('A', point(0, 0))
    expect(() => pic.coordinate('A', point(1, 1))).toThrow(/already exists/)
    expect(() => pic.node('A', { at: point(0, 0) })).toThrow(/already exists/)
    expect(() => pic.pen().moveTo(0, 0).coordinate('A')).toThrow(/already exists/)
  })

  it('coordinate() needs a pen position and a picture', () => {
    expect(() => picture().pen().coordinate('A')).toThrow(/moveTo/)
  })
})

describe('pen push — mid-statement restyling', () => {
  it('compiles each styling run to its own path item', () => {
    const pic = picture()
    pic.pen({ style: { stroke: '#64748b', dash: 'dashed' } })
      .moveTo(0, 10).lineTo(100, 10)
      .push({ style: { stroke: '#dc2626', strokeWidth: 2 } })
      .lineTo(200, 10)
    const svg = pic.toSVG({ width: 220, height: 20 })
    // run 1: dashed grey
    expect(svg).toMatch(/<path[^>]*d="M 0 10 L 100 10"[^>]*stroke="#64748b"/)
    // run 2: red, thicker, and the dash INHERITS from run 1
    expect(svg).toMatch(/<path[^>]*d="M 100 10 L 200 10"[^>]*stroke="#dc2626"[^>]*stroke-width="2"/)
    expect(svg).toMatch(/d="M 100 10 L 200 10"[^>]*stroke-dasharray/)
  })

  it('push can switch the path mode', () => {
    const pic = picture()
    pic.pen()
      .moveTo(0, 0).lineTo(50, 0)
      .push({ mode: 'fill', style: { fill: '#c0392b' } })
      .lineTo(50, 50).lineTo(0, 50).close()
    const svg = pic.toSVG({ width: 60, height: 60 })
    expect(svg).toMatch(/<path[^>]*d="M 0 0 L 50 0"[^>]*stroke="#000000"/)
    expect(svg).toMatch(/<path[^>]*d="M 50 0 L 50 50 L 0 50 Z"[^>]*fill="#c0392b"/)
  })

  it('push does not move the pen; untouched pushes emit nothing', () => {
    const pic = picture()
    const pen = pic.pen()
    pen.moveTo(10, 10).push({ style: { stroke: '#123456' } })
    expect(pen.position).toEqual(point(10, 10))
    // no segments drawn in either run → no path items at all
    expect(pic.toSVG({ width: 20, height: 20 })).not.toContain('<path')
  })

  it('close() after push() cycles to the push point', () => {
    const pic = picture()
    pic.pen()
      .moveTo(0, 0).lineTo(100, 0)
      .push({ mode: 'fill' })
      .lineTo(100, 50).lineTo(0, 50)
      .close()
      .label('c', { pos: 0.5, offset: 0 })
    const svg = pic.toSVG({ width: 120, height: 60 })
    expect(svg).toContain('M 100 0 L 100 50 L 0 50 Z')
    // closing segment (0,50) → push point (100,0); midpoint (50, 25)
    expect(textXY(svg, 'c')).toEqual({ x: 50, y: 25 })
  })
})
