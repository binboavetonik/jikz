/**
 * The oracle proves the two back ends agree; these prove the agreed
 * meaning is TikZ's. Positions are read back through `resolve()` in
 * screen px (y down), so `(1,1)` in a cm frame is (37.8, -37.8).
 */
import { describe, it, expect } from 'vitest'
import { picture, allShapes, cm, type Picture } from 'jikz'
import { tikz, tikzPicture } from '../src/index'

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

describe('a bare colour follows the verb', () => {
  it('\\draw[red] strokes red and does not fill; \\fill[red] fills', () => {
    const drawn = run(String.raw`\draw[red] (0,0) -- (1,0) -- (1,1);`).toSVG({ width: 100, height: 100 })
    expect(drawn).toContain('stroke="#ff0000"')
    expect(drawn).not.toContain('fill="#ff0000"')
    const filled = run(String.raw`\fill[red] (0,0) rectangle (1,1);`).toSVG({ width: 100, height: 100 })
    expect(filled).toContain('fill="#ff0000"')
    const both = run(String.raw`\filldraw[red] (0,0) rectangle (1,1);`).toSVG({ width: 100, height: 100 })
    expect(both).toContain('fill="#ff0000"')
    expect(both).toContain('stroke="#ff0000"')
  })
})

describe('trees (post-v1)', () => {
  const mm = (v: number) => (v / 10) * U

  it('places children as TikZ does: level distance down, siblings centred', () => {
    const pic = run(String.raw`\node (r) at (0,0) {r} child {node {a}} child {node {b}} child {node {c}};`)
    // Anonymous children are named parent-i.
    for (const n of ['r-1', 'r-2', 'r-3']) expect(() => pic.resolve(n)).not.toThrow()
    expect(pic.resolve('r-2').x).toBeCloseTo(0)
    expect(pic.resolve('r-2').y).toBeCloseTo(mm(15))
    expect(pic.resolve('r-1').x).toBeCloseTo(-mm(15))
    expect(pic.resolve('r-3').x).toBeCloseTo(mm(15))
  })

  it('reads level distance, sibling distance and level styles', () => {
    const pic = run(String.raw`\tikzset{level 1/.style={sibling distance=4cm}, level 2/.style={sibling distance=1cm}}
\node[level distance=2cm] (r) at (0,0) {r} child {node (a) {a} child {node (a1) {}} child {node (a2) {}}} child {node (b) {b}};`)
    expect(pic.resolve('a').x).toBeCloseTo(-2 * U)
    expect(pic.resolve('a').y).toBeCloseTo(2 * U)
    expect(pic.resolve('a1').x).toBeCloseTo(-2.5 * U)
    expect(pic.resolve('a1').y).toBeCloseTo(4 * U)
  })

  it('grows in any direction, and grow\' swaps the order', () => {
    const right = run(String.raw`\node[grow=right] (r) at (0,0) {r} child {node (a) {a}} child {node (b) {b}};`)
    expect(right.resolve('a').x).toBeCloseTo(mm(15))
    expect(right.resolve('a').y).toBeGreaterThan(right.resolve('b').y) // a below b on screen
    const swapped = run(String.raw`\node[grow'=right] (r) at (0,0) {r} child {node (a) {a}} child {node (b) {b}};`)
    expect(swapped.resolve('a').y).toBeLessThan(swapped.resolve('b').y)
  })

  it('leaves a slot for a missing child and draws no edge to it', () => {
    const pic = run(String.raw`\node (r) at (0,0) {r} child {node (a) {a}} child[missing] {} child {node (c) {c}};`)
    expect(pic.resolve('a').x).toBeCloseTo(-mm(15))
    expect(pic.resolve('c').x).toBeCloseTo(mm(15))
    expect(() => pic.resolve('r-2')).toThrow()
  })

  it('styles and labels the edge from parent', () => {
    const svg = run(String.raw`\node (r) at (0,0) {r} child {node {a} edge from parent[red, ->] node[right] {x}};`).toSVG({ width: 300, height: 300 })
    expect(svg).toContain('stroke="#ff0000"')
    expect(svg).toContain('marker')
    expect(svg).toContain('>x<')
  })
})

describe('pics (post-v1)', () => {
  const setup = String.raw`\coordinate (A) at (3,0); \coordinate (O) at (0,0); \coordinate (B) at (0,3);`

  it('draws the angle pic with the verb or the pic actions', () => {
    const byKeys = run(`${setup} \\pic[draw, fill=blue!20] {angle=A--O--B};`).toSVG({ width: 300, height: 300 })
    expect(byKeys).toContain('fill="#ccccff"')
    const byVerb = run(`${setup} \\draw pic {angle=A--O--B};`).toSVG({ width: 300, height: 300 })
    expect(byVerb).toContain('<path')
    expect(byVerb).not.toContain('#ccccff')
  })

  it('puts the quotes label at eccentricity × radius along the bisector', () => {
    const svg = run(`${setup} \\pic[draw, "x", angle radius=1cm, angle eccentricity=2] {angle=A--O--B};`).toSVG({ width: 300, height: 300 })
    // 2cm along 45°: (√2 cm, √2 cm) in the frame → screen (53.45, -53.45)
    const m = /<text[^>]*x="([\d.]+)"[^>]*y="(-?[\d.]+)"[^>]*>x</.exec(svg)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeCloseTo(Math.SQRT2 * U, 0)
    expect(Number(m![2])).toBeCloseTo(-Math.SQRT2 * U, 0)
  })

  it('draws the right angle marker and refuses other pics by name', () => {
    expect(run(`${setup} \\pic[draw] {right angle=A--O--B};`).toSVG({ width: 300, height: 300 })).toContain('<path')
    expect(() => run(String.raw`\pic {code={\draw (0,0) -- (1,0);}};`)).toThrow(/only the angles library/)
  })

  it('ignores \\usetikzlibrary', () => {
    expect(() => run(String.raw`\usetikzlibrary{arrows.meta, angles}`)).not.toThrow()
  })
})

describe('decorations (post-v1)', () => {
  it('decorate replaces the path by its decoration, in screen space', () => {
    const plain = run(String.raw`\draw (0,0) -- (3,0);`).toSVG({ width: 300, height: 300 })
    const snake = run(String.raw`\draw[decorate, decoration={snake, amplitude=1mm}] (0,0) -- (3,0);`).toSVG({ width: 300, height: 300 })
    expect(snake).not.toBe(plain)
    expect(snake.length).toBeGreaterThan(plain.length * 3) // many samples along the wave
  })

  it('a brace bulges up in the math frame, and mirror flips it', () => {
    const above = run(String.raw`\draw[decorate, decoration={brace, amplitude=10pt}] (0,0) -- (3,0);`).toSVG({ width: 300, height: 300 })
    const below = run(String.raw`\draw[decorate, decoration={brace, amplitude=10pt, mirror}] (0,0) -- (3,0);`).toSVG({ width: 300, height: 300 })
    // Every y of the path data: TikZ's brace on an eastward span bulges up (screen y negative).
    const ys = (svg: string) => {
      const d = /d="([^"]+)"/.exec(svg)![1]!
      return [...d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]))
    }
    expect(Math.min(...ys(above))).toBeLessThan(-5)
    expect(Math.max(...ys(below))).toBeGreaterThan(5)
  })

  it('keeps path nodes in place on a decorated path', () => {
    const pic = run(String.raw`\draw[decorate, decoration=brace] (0,0) -- (2,0) node[midway, above] (m) {x};`)
    expect(pic.resolve('m').x).toBeCloseTo(U)
  })

  it('postaction markings keep the path and add the arrow', () => {
    const svg = run(String.raw`\draw[postaction={decorate, decoration={markings, mark=at position 0.5 with {\arrow{>}}}}] (0,0) -- (3,0);`).toSVG({ width: 300, height: 300 })
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('refuses what it cannot decorate, by name', () => {
    expect(() => run(String.raw`\draw[decorate, decoration=snake] (0,0) circle (1);`)).toThrow(/"circle" on a decorated path/)
    expect(() => run(String.raw`\draw[decorate, decoration={markings, mark=at position 0.5 with {\node {x};}}] (0,0) -- (1,0);`)).toThrow(/only "at position/)
  })
})

describe('circuitikz (post-v1)', () => {
  it('places the bipole at the midpoint, rotated along the segment, wired at its ports', () => {
    const pic = run(String.raw`\draw (0,0) to[R, name=R1] (2,0) to[C, name=C1] (2,-2);`)
    expect(pic.resolve('R1').x).toBeCloseTo(U)
    expect(pic.resolve('R1').y).toBeCloseTo(0)
    expect(pic.resolve('R1.in').x).toBeLessThan(pic.resolve('R1.out').x)
    // C1 runs downward: its `in` port is at the top.
    expect(pic.resolve('C1').x).toBeCloseTo(2 * U)
    expect(pic.resolve('C1.in').y).toBeLessThan(pic.resolve('C1.out').y)
    const svg = pic.toSVG({ width: 300, height: 300 })
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(4) // wires + symbols
  })

  it('names anonymous bipoles, puts l= labels north and l_= south', () => {
    const pic = run(String.raw`\draw (0,0) to[R, l=$R$] (2,0) to[C, l_=$C$] (4,0);`)
    const svg = pic.toSVG({ width: 300, height: 300 })
    expect(svg).toContain('$R$')
    expect(svg).toContain('$C$')
    expect(() => pic.resolve('tikz-1.in')).not.toThrow()
  })

  it('short is a wire, open a gap, and terminals are dots', () => {
    const shorted = run(String.raw`\draw (0,0) to[short, *-o] (2,0);`).toSVG({ width: 300, height: 300 })
    expect((shorted.match(/<circle/g) ?? []).length + (shorted.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(3)
    const open = run(String.raw`\draw (0,0) to[open] (2,0);`).toSVG({ width: 300, height: 300 })
    expect(open).not.toContain('<path')
  })

  it('lowers ground and op amp nodes with their ports', () => {
    const pic = run(String.raw`\node[ground] (g) at (0,0) {}; \node[op amp] (a) at (3,0) {}; \draw (a.out) -- (5,0);`)
    expect(pic.resolve('g.in').x).toBeCloseTo(0)
    expect(pic.resolve('g.in').y).toBeCloseTo(0)
    expect(pic.resolve('a.out').x).toBeGreaterThan(pic.resolve('a.-').x)
  })

  it('reads the circuitikz environment and refuses v= annotations by name', () => {
    expect(() => tikzPicture.source(String.raw`\begin{circuitikz} \draw (0,0) to[R] (2,0); \end{circuitikz}`)).not.toThrow()
    expect(() => run(String.raw`\draw (0,0) to[R, v=$v$] (2,0);`)).toThrow(/voltage and current annotations/)
  })
})
