import { allShapes, picture, point, tree } from 'jikz'

export default function render(container: HTMLElement) {
  // mount({ panZoom: true }): the wheel zooms to the cursor, drag pans,
  // two-pointer pinch zooms, double-click refits. The scene is wrapped in
  // <g class="jikz-viewport"> and the returned controller mutates only its
  // transform attribute — panning never re-renders the picture.
  const { nodes, edges } = tree({
    at: point(0, 0),
    grow: 'right',
    levelDistance: 16,
    siblingDistance: 8,
  })
    .root('1.e4')
      .child('1...e5')
        .child('2.Nf3 Nc6')
          .children(['3.Bb5 a6', '3.Bc4 Nf6'])
          .parent()
        .parent()
      .parent()
      .child('1...c5')
        .child('2.Nf3 d6')
          .child('3.d4 cxd4')
      .parent()
      .parent()
      .parent()
      .child('1...e6')
        .child('2.d4 d5')
          .children(['3.Nc3 Nf6', '3.e5 c5'])
    .build()

  const pic = picture({ shapes: allShapes })
  for (const e of edges) pic.draw(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
  for (const n of nodes) {
    pic.node(n.name, {
      at: n.center, shape: 'rectangle',
      width: n.width, height: n.height, text: n.text,
      innerSep: 0, minWidth: 0, minHeight: 0,
    }, { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  }

  const ctl = pic.mount(container, {
    fit: true,
    padding: 8,
    panZoom: { minScale: 0.25, maxScale: 6 },
  })
  // Across re-renders: stash ctl.transform via the onTransform option and
  // reapply with ctl.setTransform(...). On unmount: ctl.destroy().
  void ctl
}
