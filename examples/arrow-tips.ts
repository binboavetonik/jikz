import { allShapes, picture, point } from 'jikz'

// The arrow-tip vocabulary, one edge per tip. Each row's name is a
// LABEL on the target node (`label=right:…`), so it is measured and
// pushed clear of the circle instead of parked at a guessed x.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const rows: [tip: string, color: string][] = [
    ['stealth', '#111827'],
    ['latex',   '#2563eb'],
    ['to',      '#16a34a'],
    ['->',      '#dc2626'],
    ['<-',      '#ca8a04'],
    ['<->',     '#7c3aed'],
    ['|',       '#ca8a04'],
    ['||',      '#0f766e'],
    ['*',       '#be185d'],
    ['o',       '#b45309'],
    ['square',  '#1d4ed8'],
    ['diamond', '#059669'],
    ['roundCap','#9a3412'],
  ]
  rows.forEach(([tip, color], i) => {
    const y = 25 + i * 24
    pic.node(`s${i}`, { at: point(40, y),  shape: 'circle', width: 14, height: 14 })
    pic.node(`e${i}`, { at: point(200, y), shape: 'circle', width: 14, height: 14,
      labels: [{ text: tip, at: 'east', style: { fontSize: 11 } }] })
    pic.edge(`s${i}`, `e${i}`, { arrowEnd: tip, style: { stroke: color, strokeWidth: 1.5 } })
  })

  pic.mount(container, { fit: true, padding: 12 })
}
