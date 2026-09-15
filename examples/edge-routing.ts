import { allShapes, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })

  pic.node('A', { at: point(50, 60),  shape: 'circle', width: 36, height: 36, text: 'A' })
  pic.node('B', { at: point(200, 60), shape: 'circle', width: 36, height: 36, text: 'B' })
  pic.node('C', { at: point(360, 60), shape: 'circle', width: 36, height: 36, text: 'C' })

  pic.edge('A', 'B', { bendAngle: 35, label: 'bend left' }, { style: { stroke: '#2563eb' } })
  pic.edge('B', 'A', { bendAngle: 35 }, { style: { stroke: '#94a3b8', dash: 'dashed' } })
  // labelPos/labelOffset are TikZ's `pos=`/`auto`: move the text along
  // the edge and out to its side, instead of leaving it on the ink.
  pic.edge('B', 'C',
    { out: 315, in: 225, label: 'out 315 / in 225', labelPos: 0.42, labelOffset: 16 },
    { style: { stroke: '#7c3aed' } })
  pic.edge('C', 'C', { loop: 'above' }, { style: { stroke: '#dc2626' } })

  pic.mount(container, { fit: true, padding: 14 })
}
