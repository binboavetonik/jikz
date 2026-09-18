import { allShapes, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })

  pic.node('A', {
    at: point(90, 90), shape: 'circle', width: 60, height: 60, text: 'A',
    labels: [
      { text: '$\\alpha$', at: 'north' },
      { text: 'rim', at: 'south east', style: { fontSize: 9 } },
    ],
    style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 2 }
  })

  pic.node('B', {
    at: point(255, 90), shape: 'rectangle', width: 110, height: 60, text: 'B',
    labelDistance: 8, // TikZ: label distance=8 — default for all labels
    labels: [
      { text: 'nw alias', at: 'nw', style: { fontSize: 9 } },
      { text: '270° = north', at: 270, style: { fontSize: 9, fill: '#dc2626' } },
      { text: 'distance: 18', at: 'east', distance: 18, style: { fontSize: 9 } },
    ],
    style: { stroke: '#16a34a', fill: '#dcfce7', strokeWidth: 2 }
  })

  pic.mount(container, { width: 430, height: 180 })
}
