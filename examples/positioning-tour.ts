import { allShapes, nodeRow, picture, point } from 'jikz'

// TikZ's positioning library: place nodes relative to other nodes —
// no coordinates past the seed. Node instances carry rightOf/below/
// … methods (TikZ right=of); nodeRow builds a whole row from a label
// list. Distances are border-to-border (TikZ node distance).

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const st = { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 }

  // seed + relative placement: each new node derives from the previous
  const api = pic.node('api', { at: point(60, 40), shape: 'rectangle', text: 'api' }, { style: st })
    .getNode('api')!

  const worker = api.rightOf(40, { shape: allShapes['rectangle'], text: 'worker' })
  pic.node('worker', { at: worker.center, shape: worker.shape, text: worker.text }, { style: st })

  const queue = api.below(30, { shape: allShapes['cylinder'], text: 'queue', width: 54, height: 44 })
  pic.node('queue', { at: queue.center, shape: queue.shape, text: queue.text }, { style: st })

  // a whole row from labels
  const days = nodeRow(point(50, 170), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], {
    distance: 12,
    nodeOptions: { shape: allShapes['rounded rectangle'], shapeOptions: { cornerRadius: 6 } },
  })
  for (const n of days) {
    pic.node(n.text, { at: n.center, shape: n.shape, text: n.text }, { style: st })
  }

  // edges ride the names — positions resolved, wiring by name
  pic.edge('api', 'worker', { arrowEnd: 'stealth' }, { style: { stroke: '#64748b' } })
  pic.edge('api', 'queue', { arrowEnd: 'stealth' }, { style: { stroke: '#64748b' } })
  pic.edge('queue', 'worker', { arrowEnd: 'stealth', bendAngle: -15 },
    { style: { stroke: '#94a3b8', dash: 'dashed' } })

  pic.mount(container, { fit: true, padding: 14 })
}
