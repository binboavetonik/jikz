/** The parser's own contract: statements, items, coordinates, options. */
import { describe, it, expect } from 'vitest'
import { parse, parseStatements, parseOptionList } from '../src/index'

const one = (tex: string) => parseStatements(tex)[0]!

describe('parseStatements', () => {
  it('consumes a statement at a time — a ";" in braces is text', () => {
    const stmts = parseStatements(String.raw`\node at (0,0) {a; b}; \draw (0,0) -- (1,1);`)
    expect(stmts).toHaveLength(2)
    expect(stmts[0]).toMatchObject({ kind: 'path', items: [{ kind: 'node', text: 'a; b' }] })
  })

  it('parses \\node as a path with a node item', () => {
    expect(one(String.raw`\node[draw] (a) at (1,2) {A};`)).toMatchObject({
      kind: 'path',
      verb: 'path',
      items: [
        {
          kind: 'node',
          name: 'a',
          options: [{ key: 'draw' }],
          at: { kind: 'cartesian', x: { value: 1 }, y: { value: 2 } },
          text: 'A',
        },
      ],
    })
  })

  it('takes node parts in any order', () => {
    expect(one(String.raw`\node (a) [draw] at (1,2) {A};`)).toMatchObject({
      items: [{ kind: 'node', name: 'a', options: [{ key: 'draw' }] }],
    })
  })

  it('reads every coordinate form', () => {
    const coords = (tex: string) =>
      (one(tex) as unknown as { items: { kind: string; coord?: unknown }[] }).items.filter((i) => i.kind === 'coord').map((i) => i.coord)
    expect(coords(String.raw`\draw (1,2) (30:1cm) (a) (a.north east) ++(1,0) +(0,1) (a |- b) (1,2 -| a);`)).toEqual([
      { kind: 'cartesian', x: { value: 1 }, y: { value: 2 } },
      { kind: 'polar', angle: 30, radius: { value: 1, unit: 'cm' } },
      { kind: 'named', name: 'a' },
      { kind: 'named', name: 'a', anchor: 'north east' },
      { kind: 'cartesian', x: { value: 1 }, y: { value: 0 }, relative: 'update' },
      { kind: 'cartesian', x: { value: 0 }, y: { value: 1 }, relative: 'keep' },
      { kind: 'perpendicular', form: '|-', a: { kind: 'named', name: 'a' }, b: { kind: 'named', name: 'b' } },
      {
        kind: 'perpendicular',
        form: '-|',
        a: { kind: 'cartesian', x: { value: 1 }, y: { value: 2 } },
        b: { kind: 'named', name: 'a' },
      },
    ])
  })

  it('reads the calc library', () => {
    const c = (one(String.raw`\draw ($(A)!0.5!(B)$) -- ($2*(A)+(1,0)$) -- ($(A)!0.5!30:(B)$) -- ($(A)!(P)!(B)$) -- ($(A)!2cm!(B)$);`) as unknown as {
      items: { coord?: { expr?: unknown } }[]
    }).items
      .filter((i) => i.coord)
      .map((i) => i.coord!.expr)
    expect(c[0]).toMatchObject({ kind: 'toward', t: 0.5 })
    expect(c[1]).toMatchObject({ kind: 'sum', terms: [{ factor: 2 }, { factor: 1 }] })
    expect(c[2]).toMatchObject({ kind: 'toward', b: { kind: 'rotateAround', angle: 30 } })
    expect(c[3]).toMatchObject({ kind: 'project' })
    expect(c[4]).toMatchObject({ kind: 'towardBy', distance: { value: 2, unit: 'cm' } })
  })

  it('reads the path operations', () => {
    const kinds = (one(
      String.raw`\draw (0,0) -- (1,0) -| (2,1) |- (3,0) .. controls (4,1) and (5,-1) .. (6,0) to[bend left] (7,0) rectangle (8,1) circle (1) ellipse (1 and 2) arc (0:90:1) grid (9,9) parabola bend (1,1) (10,0) sin (11,1) cos (12,0) node {x} coordinate (c) [red] -- cycle;`
    ) as unknown as { items: { kind: string }[] }).items.map((i) => i.kind)
    expect(kinds).toEqual([
      'coord', 'op', 'coord', 'op', 'coord', 'op', 'coord', 'controls', 'coord', 'to', 'coord', 'rectangle', 'coord',
      'circle', 'ellipse', 'arc', 'grid', 'coord', 'parabola', 'coord', 'sin', 'coord', 'cos', 'coord', 'node',
      'coordinate', 'options', 'op', 'cycle',
    ])
  })

  it('names an expression it cannot evaluate', () => {
    expect(one(String.raw`\draw (2*\x,0) -- (1,1);`)).toMatchObject({
      kind: 'unsupported',
      reason: expect.stringContaining('pgfmath'),
    })
  })

  it('recovers after an unsupported statement', () => {
    const stmts = parseStatements(String.raw`\usetikzlibrary{arrows}
\draw (0,0) -- (1,1);
\pic at (0,0) {angle};
\draw (1,1) -- (2,2);`)
    expect(stmts.map((s) => s.kind)).toEqual(['unsupported', 'path', 'unsupported', 'path'])
    expect(stmts[2]).toMatchObject({ source: String.raw`\pic at (0,0) {angle};` })
  })

  it('reports where a statement starts', () => {
    const stmts = parseStatements(`\n  \\draw (0,0) -- (1,1);\n\\node {x};`)
    expect(stmts.map((s) => s.at)).toEqual([
      { line: 2, column: 3 },
      { line: 3, column: 1 },
    ])
  })

  it('parses scopes and foreach', () => {
    const stmts = parseStatements(String.raw`\begin{scope}[shift={(1,1)}] \draw (0,0) -- (1,0); \end{scope}
\foreach \x/\y [count=\i] in {0/a, 1/b} { \node at (\x,0) {\y}; }
\foreach \x in {1,...,3} \draw (\x,0) -- (\x,1);`)
    expect(stmts[0]).toMatchObject({ kind: 'scope', options: [{ key: 'shift', value: '(1,1)' }], body: [{ kind: 'path' }] })
    expect(stmts[1]).toMatchObject({ kind: 'foreach', variables: ['x', 'y'], list: '0/a, 1/b', options: [{ key: 'count', value: '\\i' }] })
    expect(stmts[2]).toMatchObject({ kind: 'foreach', variables: ['x'], body: String.raw`\draw (\x,0) -- (\x,1);` })
  })
})

describe('parse (a file)', () => {
  it('takes the first tikzpicture and its options', () => {
    const ast = parse(String.raw`\documentclass{article}
\begin{document}
\begin{tikzpicture}[scale=2, thick]
  \draw (0,0) -- (1,1); % a comment; with a semicolon
\end{tikzpicture}
\end{document}`)
    expect(ast.options).toEqual([{ key: 'scale', value: '2' }, { key: 'thick' }])
    expect(ast.body).toHaveLength(1)
  })
})

describe('parseOptionList', () => {
  it('splits on top-level commas and strips one level of braces', () => {
    expect(parseOptionList('draw, fill=blue!20, shift={(1,2)}, label={[red]above:$x$}, line width = 2pt')).toEqual([
      { key: 'draw' },
      { key: 'fill', value: 'blue!20' },
      { key: 'shift', value: '(1,2)' },
      { key: 'label', value: '[red]above:$x$' },
      { key: 'line width', value: '2pt' },
    ])
  })
  it('reads the quotes syntax', () => {
    expect(parseOptionList(`"a label" above, "swapped"' {below, red}`)).toEqual([
      { key: '"', quoted: { text: 'a label', swap: false, options: [{ key: 'above' }] } },
      { key: '"', quoted: { text: 'swapped', swap: true, options: [{ key: 'below' }, { key: 'red' }] } },
    ])
  })
})
