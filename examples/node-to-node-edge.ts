import { allShapes, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })

  pic.node('A', { at: point(70, 75), shape: 'circle', width: 60, height: 60, text: 'A', style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 2 } })
  pic.node('B', { at: point(330, 75), shape: 'rectangle', width: 120, height: 60, text: 'B', style: { stroke: '#16a34a', fill: '#dcfce7', strokeWidth: 2 } })
  pic.edge('A', 'B', { arrowEnd: 'stealth', label: 'connects', style: { stroke: '#111827', strokeWidth: 1.5 } })

  pic.mount(container, { width: 400, height: 150 })
}
