import { allShapes, picture, point, rect } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })

  // universal set
  pic.draw(rect(20, 12, 350, 180), { style: { stroke: '#94a3b8' } })
  pic.text(point(36, 30), 'U', { fontSize: 11 })

  pic.node('A', {
    at: point(150, 102), shape: 'circle', width: 160, height: 160,
    labels: [{ text: '$A$', at: 'north west', distance: 6 }],
  }, { style: { stroke: '#2563eb', fill: '#2563eb', 'fill-opacity': 0.25, strokeWidth: 2 } })

  pic.node('B', {
    at: point(240, 102), shape: 'circle', width: 160, height: 160,
    labels: [{ text: '$B$', at: 'north east', distance: 6 }],
  }, { style: { stroke: '#dc2626', fill: '#dc2626', 'fill-opacity': 0.25, strokeWidth: 2 } })

  pic.text(point(195, 102), '$A \\cap B$', { fontSize: 12 })

  pic.mount(container, { width: 390, height: 205 })
}
