import { picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const rows: [tip: string, color: string][] = [
    ['stealth', '#111827'],
    ['latex',   '#2563eb'],
    ['to',      '#16a34a'],
    ['->',      '#dc2626'],
    ['<-',      '#ca8a04'],
    ['<->',     '#7c3aed'],
    ['|',       '#ca8a04'],
  ]
  rows.forEach(([tip, color], i) => {
    const y = 25 + i * 24
    pic.node(`s${i}`, { at: point(40, y),  shape: 'circle', width: 14, height: 14 })
    pic.node(`e${i}`, { at: point(200, y), shape: 'circle', width: 14, height: 14 })
    pic.edge(`s${i}`, `e${i}`, { arrowEnd: tip }, { style: { stroke: color, strokeWidth: 1.5 } })
    pic.text(point(230, y), tip, { fontSize: 11 })
  })

  pic.mount(container, { width: 280, height: 200 })
}
