import { allShapes, nodeCircle, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const names = ['v1', 'v2', 'v3', 'v4', 'v5']

  // Vertices evenly on a ring
  for (const n of nodeCircle(point(160, 110), 90, names)) {
    pic.node(n.text, { at: n.center, shape: 'circle', width: 34, height: 34, text: n.text, style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  }

  // K5: an edge for every pair
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      pic.edge(names[i]!, names[j]!, { arrowEnd: 'stealth', style: { stroke: '#94a3b8', strokeWidth: 1 } })

  pic.mount(container, { width: 320, height: 220 })
}
