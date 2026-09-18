import { circle, picture, point } from 'jikz'
import { petriShapes, petri, petriArcs, tokens } from 'jikz/petri'

// The Petri net classic on ext/petri — places, transitions, a marking,
// and t1 enabled (one token in each of its input places) so its arcs
// get the highlight.
//
// Tokens are not part of the place, here or in TikZ: a pale place with
// solid dots is two paints, and TikZ's own `tokens=n` expands to child
// nodes for the same reason. tokens() gives their positions, straight
// off the table TikZ lays out for one through nine.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: petriShapes })
  const es = { stroke: '#64748b', strokeWidth: 1.2 }
  const hot = { stroke: '#dc2626', strokeWidth: 1.8 }

  // places, with their marking
  const marking = [
    ['p1', 60, 70, 2],
    ['p2', 60, 170, 1],
    ['p3', 250, 70, 0],
    ['p4', 250, 170, 0],
  ] as const

  for (const [name, x, y, count] of marking) {
    const at = point(x, y)
    // `labels` is TikZ's `label=<dir>:<text>` — measured and pushed off
    // the node's own border, so the name never sits on the marking.
    pic.node(
      name,
      {
        ...petri.place({ at, width: 44, height: 44 }),
        labels: [{ text: name, at: 'north', style: { fontSize: 10 } }],
        style: { stroke: '#334155', fill: '#ffffff', strokeWidth: 1.5 }
      }
    )
    for (const t of tokens(at, count, { size: 8 })) {
      pic.fill(circle(t.center, t.radius), { style: { fill: t.color } })
    }
  }

  // transitions — the builder stands jikz's node minimum down, so the
  // bar stays as thin as it is asked to be
  for (const [name, x, y] of [['t1', 150, 70], ['t2', 150, 170]] as const) {
    pic.node(
      name,
      {
        ...petri.transition({ at: point(x, y), width: 12, height: 40 }),
        labels: [{ text: name, at: 'south', style: { fontSize: 10 } }],
        style: { stroke: '#334155', fill: '#334155', strokeWidth: 1 }
      }
    )
  }

  // flow relation — petriArcs.post is TikZ's `post`: -> shortened 1pt
  pic.edge('p1', 't1', { ...petriArcs.post, style: hot })
  pic.edge('t1', 'p3', { ...petriArcs.post, style: hot })
  pic.edge('p2', 't2', { ...petriArcs.post, style: es })
  pic.edge('t2', 'p4', { ...petriArcs.post, style: es })
  pic.edge('p3', 't2', { ...petriArcs.post, bendAngle: 20, style: es })
  pic.edge('t2', 'p1', { ...petriArcs.post, bendAngle: 20, style: es })

  pic.mount(container, { fit: true, padding: 14 })
}
