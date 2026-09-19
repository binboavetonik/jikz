/**
 * The oracle proves the two back ends agree; these prove the agreed
 * meaning is TikZ's. Positions are read back through `resolve()` in
 * screen px (y down), so `(1,1)` in a cm frame is (37.8, -37.8).
 */
import { describe, it, expect } from 'vitest'
import { picture, allShapes, cm, type Picture } from 'jikz'
import { tikz } from '../src/index'

const U = cm(1)

function run(tex: string): Picture<typeof allShapes> {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: U })
  tikz(pic).source(tex)
  return pic
}

describe('what the statements mean', () => {
  it('y goes up', () => {
    const pic = run(String.raw`\coordinate (A) at (1,2);`)
    const a = pic.resolve('A')
    expect(a.x).toBeCloseTo(U)
    expect(a.y).toBeCloseTo(-2 * U)
  })

  it('++ moves the pen; a coordinate names where it is', () => {
    const pic = run(String.raw`\draw (1,0) -- ++(1,1) coordinate (B) -- ++(0,-1) coordinate (C);`)
    expect(pic.resolve('B').x).toBeCloseTo(2 * U)
    expect(pic.resolve('B').y).toBeCloseTo(-U)
    expect(pic.resolve('C').y).toBeCloseTo(0)
  })

  it('(A |- B) takes x from A and y from B', () => {
    const pic = run(String.raw`\coordinate (A) at (1,5); \coordinate (B) at (7,2);
\path (A |- B) coordinate (P) (A -| B) coordinate (Q);`)
    expect(pic.resolve('P').x).toBeCloseTo(U)
    expect(pic.resolve('P').y).toBeCloseTo(-2 * U)
    expect(pic.resolve('Q').x).toBeCloseTo(7 * U)
    expect(pic.resolve('Q').y).toBeCloseTo(-5 * U)
  })

  it('polar and calc coordinates land where TikZ puts them', () => {
    const pic = run(String.raw`\coordinate (A) at (0,0); \coordinate (B) at (4,0);
\path (90:2) coordinate (P) ($(A)!0.25!(B)$) coordinate (Q) ($(A)!1cm!(B)$) coordinate (R) ($(A)!0.5!90:(B)$) coordinate (S);`)
    expect(pic.resolve('P').x).toBeCloseTo(0)
    expect(pic.resolve('P').y).toBeCloseTo(-2 * U)
    expect(pic.resolve('Q').x).toBeCloseTo(U)
    expect(pic.resolve('R').x).toBeCloseTo(U)
    // B rotated 90° counter-clockwise about A is (0,4); halfway is (0,2).
    expect(pic.resolve('S').x).toBeCloseTo(0)
    expect(pic.resolve('S').y).toBeCloseTo(-2 * U)
  })

  it('a path node sits at the pen, and "right" anchors it west', () => {
    const pic = run(String.raw`\draw (0,0) -- (1,0) node[right] (n) {end};`)
    const west = pic.resolve('n.west')
    expect(west.x).toBeCloseTo(U)
    expect(west.y).toBeCloseTo(0)
  })

  it('a node between coordinates rides the segment midway', () => {
    const pic = run(String.raw`\draw (0,0) -- node (m) {mid} (2,0);`)
    expect(pic.resolve('m').x).toBeCloseTo(U)
  })

  it('positioning: right=of places border to border along x', () => {
    const pic = run(String.raw`\node[draw, minimum size=1cm] (a) at (0,0) {a};
\node[draw, minimum size=1cm, right=of a] (b) {b};`)
    expect(pic.resolve('b').y).toBeCloseTo(0)
    expect(pic.resolve('b.west').x).toBeGreaterThan(pic.resolve('a.east').x)
  })

  it('a scope shift moves its content by frame units', () => {
    const pic = run(String.raw`\begin{scope}[shift={(2,1)}] \coordinate (S) at (0,0); \end{scope}`)
    expect(pic.resolve('S').x).toBeCloseTo(2 * U)
    expect(pic.resolve('S').y).toBeCloseTo(-U)
  })

  it('foreach expands ranges with a step, tuples and count', () => {
    const pic = run(String.raw`\foreach \x [count=\i] in {0, 2, ..., 6} \coordinate (r\i) at (\x,0);
\foreach \x/\n in {1/a, 3/b} \coordinate (\n) at (\x,0);
\foreach \x in {5,...,3} \coordinate (d\x) at (\x,0);`)
    expect(pic.resolve('r1').x).toBeCloseTo(0)
    expect(pic.resolve('r3').x).toBeCloseTo(4 * U)
    expect(pic.resolve('r4').x).toBeCloseTo(6 * U)
    expect(pic.resolve('a').x).toBeCloseTo(U)
    expect(pic.resolve('b').x).toBeCloseTo(3 * U)
    expect(pic.resolve('d4').x).toBeCloseTo(4 * U)
    expect(pic.resolve('d3').x).toBeCloseTo(3 * U)
  })
})
