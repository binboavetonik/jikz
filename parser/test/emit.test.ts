/** The eject path prints deterministic, readable TypeScript. */
import { describe, it, expect } from 'vitest'
import { convert } from '../src/index'

describe('emit', () => {
  it('prints the typed API with TikZ numbers', () => {
    const { code } = convert(String.raw`\begin{tikzpicture}
  \coordinate (A) at (0,0);
  \node[draw, circle, fill=blue!20] (b) at (2,1) {B};
  \draw[thick, ->] (A) -- node[above] {f} (b);
  \draw (0,0) -- ++(1,0) arc (0:90:1) -- cycle;
  \draw ($(A)!0.5!(b)$) circle [radius=0.1];
  \begin{scope}[shift={(3,0)}, rotate=45]
    \fill[red] (0,0) rectangle (1,1);
  \end{scope}
  \usetikzlibrary{calc}
\end{tikzpicture}`)
    expect(code).toMatchInlineSnapshot(`
      "import { Transform, allShapes, cm, picture, point, rel } from '@ozan.e/jikz'

      export function build() {
        const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
        /** A named point, in the picture's frame coordinates. */
        const ref = (spec: string) => pic.frame.unmap(pic.resolve(spec))

        // \\coordinate (A) at (0,0);
        pic.coordinate('A', point(0, 0))

        // \\node[draw, circle, fill=blue!20] (b) at (2,1) {B};
        pic.node('b', { at: point(2, 1), text: 'B', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, { fill: '#ccccff' }] })

        // \\draw[thick, ->] (A) -- node[above] {f} (b);
        pic.edge('A', 'b', { arrowEnd: 'to', style: ['thick'], labels: [{ text: 'f', pos: 0.5, at: 'north' }] })

        // \\draw (0,0) -- ++(1,0) arc (0:90:1) -- cycle;
        pic.pen().moveTo(0, 0).lineTo(rel(1, 0)).arc({ start: 0, end: 90, radius: 1 }).close()

        // \\draw ($(A)!0.5!(b)$) circle [radius=0.1];
        pic.pen().moveTo(ref('A').toward(ref('b'), 0.5)).circle({ radius: 0.1 })

        // \\begin{scope}[shift={(3,0)}, rotate=45]
        pic.scope({ transform: Transform.identity().translate(pic.length(3), -pic.length(0)).rotate(-45) }, (s) => {

          // \\fill[red] (0,0) rectangle (1,1);
          s.pen({ mode: 'fill', style: [{ fill: '#ff0000' }] }).moveTo(0, 0).rectangle(1, 1)
        })

        // \\usetikzlibrary{calc}
        // TODO(jikz-tikz): \\usetikzlibrary is not supported

        return pic
      }
      "
    `)
  })
})
