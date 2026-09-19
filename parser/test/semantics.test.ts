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

describe('styles and scope state (M3)', () => {
  it('expands /.style with #1, /.append style, and \\tikzstyle', () => {
    const pic = run(String.raw`\tikzset{box/.style={draw, minimum size=1cm}, tint/.style={fill=#1!20}}
\tikzset{box/.append style={inner sep=0pt}}
\tikzstyle{old}=[circle]
\node[box, tint=blue] (a) at (0,0) {a};
\node[old] (b) at (3,0) {b};`)
    const svg = pic.toSVG({ width: 400, height: 400 })
    expect(svg).toContain('#ccccff') // blue!20 as the fill
    expect(pic.resolve('a.east').x - pic.resolve('a.west').x).toBeCloseTo(U) // minimum size, inner sep 0
    // `old` is a circle: the border is equally far in every direction.
    const b = pic.resolve('b')
    expect(pic.resolve('b.north').distanceTo(b)).toBeCloseTo(pic.resolve('b.east').distanceTo(b))
  })

  it('applies every node before the node\'s own options, per scope', () => {
    const pic = run(String.raw`\tikzset{every node/.style={minimum size=2cm}}
\node[draw] (a) at (0,0) {a};
\begin{scope}[every node/.style={minimum size=1cm}]
  \node[draw] (b) at (5,0) {b};
  \node[draw, minimum size=3cm] (c) at (10,0) {c};
\end{scope}
\node[draw] (d) at (15,0) {d};`)
    const width = (n: string) => pic.resolve(`${n}.east`).x - pic.resolve(`${n}.west`).x
    expect(width('a')).toBeCloseTo(2 * U)
    expect(width('b')).toBeCloseTo(U)
    expect(width('c')).toBeCloseTo(3 * U)
    expect(width('d')).toBeCloseTo(2 * U)
  })

  it('>= sets what -> means, and node distance what right=of means', () => {
    const pic = run(String.raw`\tikzset{>=stealth, node distance=3cm}
\node[draw, minimum size=1cm] (a) at (0,0) {a};
\node[draw, minimum size=1cm, right=of a] (b) {b};
\draw[->] (a) -- (b);`)
    expect(pic.resolve('b.west').x - pic.resolve('a.east').x).toBeCloseTo(3 * U)
    const svg = pic.toSVG({ width: 400, height: 400 })
    expect(svg).toMatch(/marker/)
    const plain = run(String.raw`\node[draw, minimum size=1cm] (a) at (0,0) {a};
\node[draw, minimum size=1cm, right=of a] (b) {b};
\draw[->] (a) -- (b);`).toSVG({ width: 400, height: 400 })
    expect(plain).not.toBe(svg)
  })

  it('lowers edge items from the coordinate before them, with loops', () => {
    const pic = run(String.raw`\node[draw, circle] (p) at (0,0) {p};
\node[draw, circle] (q) at (3,0) {q};
\path[->] (p) edge[bend left] node[above] {x} (q) edge[loop above] (p);`)
    const svg = pic.toSVG({ width: 400, height: 400 })
    expect(svg).toContain('>x<')
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('shifts a placed node by xshift/yshift and above=<length>', () => {
    const pic = run(String.raw`\node[xshift=1cm, yshift=-2cm] (a) at (0,0) {a};
\node[above=1cm, anchor=south] (b) at (0,0) {b};`)
    expect(pic.resolve('a').x).toBeCloseTo(U)
    expect(pic.resolve('a').y).toBeCloseTo(2 * U)
    expect(pic.resolve('b.south').y).toBeCloseTo(-U)
  })

  it('shades with a gradient and fills with a pattern', () => {
    const svg = run(String.raw`\shade[left color=red, right color=blue] (0,0) rectangle (1,1);
\draw[pattern=dots, pattern color=blue] (2,0) rectangle (3,1);`).toSVG({ width: 400, height: 400 })
    expect(svg).toContain('linearGradient')
    expect(svg).toContain('jikz-pattern')
  })

  it('names the nearest known key on a typo', () => {
    expect(() => run(String.raw`\node[minimum sze=1cm] at (0,0) {x};`)).toThrow(/did you mean "minimum size"/)
  })

  it('keeps styles across template calls on one picture', () => {
    const pic = picture({ shapes: allShapes, frame: 'math', unit: U })
    const t = tikz(pic)
    t`\tikzset{big/.style={minimum size=2cm}}`
    t`\node[draw, big] (a) at (0,0) {a};`
    expect(pic.resolve('a.east').x - pic.resolve('a.west').x).toBeCloseTo(2 * U)
  })
})

describe('the pen position (M4)', () => {
  it('+(dx,dy) measures from the pen without moving it', () => {
    const pic = run(String.raw`\draw (1,1) -- +(1,0) coordinate (P) -- +(0,1) coordinate (Q);`)
    expect(pic.resolve('P').x).toBeCloseTo(2 * U)
    expect(pic.resolve('Q').x).toBeCloseTo(U)
    expect(pic.resolve('Q').y).toBeCloseTo(-2 * U)
  })

  it('+(dx,dy) works from a named point and after cycle', () => {
    const pic = run(String.raw`\coordinate (A) at (3,3);
\draw (A) -- +(1,0) coordinate (P);
\draw (0,0) -- (1,0) -- (1,1) -- cycle -- +(0.5,0) coordinate (R);`)
    expect(pic.resolve('P').x).toBeCloseTo(4 * U)
    expect(pic.resolve('R').x).toBeCloseTo(0.5 * U)
    expect(pic.resolve('R').y).toBeCloseTo(0)
  })

  it('plot coordinates draws the polyline, and -- plot joins it', () => {
    const svg = run(String.raw`\draw (0,0) -- plot coordinates {(1,1) (2,0)};`).toSVG({ width: 200, height: 200 })
    expect(svg).toMatch(/d="M[^"]*L[^"]*L/)
  })
})
