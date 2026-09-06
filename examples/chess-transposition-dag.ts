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

  const dot = (key: keyof typeof P, transposition = false) => {
    const c = circle(P[key], 4.5)
    pic.draw(c, {
      style: transposition
        ? { stroke: '#d97706', dash: 'dashed', strokeWidth: 1.5, fill: '#ffffff' }
        : { stroke: '#475569', strokeWidth: 1.5, fill: '#ffffff' },
    })
    return c  // an Anchorable — edges resolve its boundary automatically
  }

  const d4 = dot('d4')
  const d5 = dot('d5'), c4L = dot('c4L'), nf3L = dot('nf3L')
  const nf6 = dot('nf6'), c4R = dot('c4R'), d5R = dot('d5R')
  const qgd = dot('qgd', true)
  const bg5 = dot('bg5')

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

  pic.text(P.d4, '1.d4', { at: 'north', distance: 6, fontSize: 10 })
  pic.text(P.d5, '1\u2026d5', { at: 'west', distance: 6, fontSize: 10 })
  pic.text(P.c4L, '2.c4 e6', { at: 'west', distance: 6, fontSize: 10 })
  pic.text(P.nf3L, '3.Nf3', { at: 'west', distance: 6, fontSize: 10 })
  pic.text(P.nf6, '1\u2026Nf6', { at: 'east', distance: 6, fontSize: 10 })
  pic.text(P.c4R, '2.c4 e6', { at: 'east', distance: 6, fontSize: 10 })
  pic.text(P.d5R, '3\u2026d5', { at: 'east', distance: 6, fontSize: 10 })
  pic.text(P.qgd, 'QGD — same position!', { at: 'west', distance: 6, fontSize: 10, style: { stroke: '#d97706' } })
  pic.text(P.bg5, '4.Bg5', { at: 'east', distance: 6, fontSize: 10 })

  pic.mount(container, { fit: true, padding: 10 })
}
