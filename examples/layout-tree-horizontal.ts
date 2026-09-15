import { picture, tree, point } from 'jikz'

export default function render(container: HTMLElement) {
  // Size-aware horizontal tree: each parent pushes its children past its
  // OWN measured text — levelDistance is an edge-to-edge gap, not a fixed
  // column offset. Long labels no longer overlap the next level.
  const { nodes, edges } = tree({
    at: point(24, 60),
    grow: 'right',
    levelDistance: 24,
    siblingDistance: 22,
  })
    .root('1.e4')
      .child('2.Nf3 Nc6')
        .children(['3.Bb5', '3.Bc4'])
        .parent()
      .parent()
      .child('2... Nf6')
        .child('3.d4 exd4')
    .build()

  // Drawn through a picture rather than straight at a renderer, so
  // `fit: true` can size the frame from the laid-out tree — a
  // hand-picked height clipped the top row once the labels grew.
  const pic = picture()
  for (const e of edges) pic.draw(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
  for (const n of nodes) pic.draw(n, { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  pic.mount(container, { fit: true, padding: 14 })
}
