import { picture, point, circle } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  const P = {
    d4:   point(200, 30),
    d5:   point(110, 90),   // 1...d5 order
    c4L:  point(110, 150),  // 2.c4 e6
    nf3L: point(110, 210),  // 3.Nf3
    nf6:  point(290, 90),   // 1...Nf6 order
    c4R:  point(290, 150),  // 2.c4 e6
    d5R:  point(290, 210),  // 3...d5
    qgd:  point(200, 270),  // ONE position, two histories
    bg5:  point(200, 330),
  }

  // The move text rides the dot as a draw LABEL, so its gap is measured
  // from the circle's border (a bare `pic.text` at the same distance is
  // measured from the CENTER, and buried the text in the marker).
  const dot = (
    key: keyof typeof P,
    text: string,
    at: 'north' | 'south' | 'east' | 'west' | 'south west',
    transposition = false
  ) => {
    const c = circle(P[key], 4.5)
    const color = transposition ? '#d97706' : '#475569'
    pic.draw(c, {
      style: transposition
        ? { stroke: color, dash: 'dashed', strokeWidth: 1.5, fill: '#ffffff' }
        : { stroke: color, strokeWidth: 1.5, fill: '#ffffff' },
      label: {
        text, at, distance: 5,
        options: { fontSize: 10, ...(transposition ? { style: { stroke: color } } : {}) },
      },
    })
    return c  // an Anchorable — edges resolve its boundary automatically
  }

  const d4 = dot('d4', '1.d4', 'north')
  const d5 = dot('d5', '1\u2026d5', 'west')
  const c4L = dot('c4L', '2.c4 e6', 'west')
  const nf3L = dot('nf3L', '3.Nf3', 'west')
  const nf6 = dot('nf6', '1\u2026Nf6', 'east')
  const c4R = dot('c4R', '2.c4 e6', 'east')
  const d5R = dot('d5R', '3\u2026d5', 'east')
  const qgd = dot('qgd', 'QGD — same position!', 'south west', true)
  const bg5 = dot('bg5', '4.Bg5', 'east')

  const link = { style: { stroke: '#64748b', strokeWidth: 1.25 } }
  pic.edge(d4, d5, {}, link)
  pic.edge(d4, nf6, {}, link)
  pic.edge(d5, c4L, {}, link)
  pic.edge(c4L, nf3L, {}, link)
  pic.edge(nf6, c4R, {}, link)
  pic.edge(c4R, d5R, {}, link)
  // the merge — out/in headings make the histories join like rail tracks
  pic.edge(nf3L, qgd, { out: 45, in: 45 }, { style: { stroke: '#d97706', strokeWidth: 1.5 } })
  pic.edge(d5R, qgd, { out: 135, in: 135 }, { style: { stroke: '#d97706', strokeWidth: 1.5 } })
  pic.edge(qgd, bg5, {}, link)

  pic.mount(container, { fit: true, padding: 10 })
}
