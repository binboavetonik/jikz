import { picture, line, rect, arc, polar, point } from 'jikz'

export default function render(container: HTMLElement) {
  // UI above the drawing — the card is fully self-contained
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '5'
  slider.max = '80'
  slider.value = '50'
  slider.style.width = '100%'
  const out = document.createElement('div')
  container.appendChild(slider)
  container.appendChild(out)

  const draw = (deg: number) => {
    out.innerHTML = ''
    const pic = picture()
    const O = point(210, 110) // interface hit point

    // media + boundary + normal
    pic.filldraw(rect(20, 30, 380, 80),   { style: { fill: '#dbeafe', fillOpacity: 0.4,  stroke: 'none' } })
    pic.filldraw(rect(20, 110, 380, 100), { style: { fill: '#0ea5e9', fillOpacity: 0.18, stroke: 'none' } })
    pic.draw(line(point(20, 110), point(400, 110)), { style: { stroke: '#334155', strokeWidth: 2 } })
    pic.draw(line(point(210, 30), point(210, 210)), { style: { stroke: '#94a3b8', dash: 'dashed' } })

    // Snell: n1 sin(t1) = n2 sin(t2)
    const n1 = 1.0, n2 = 1.33
    const t1 = deg * Math.PI / 180
    const t2 = Math.asin(n1 * Math.sin(t1) / n2)

    const P1 = point(O.x - 130 * Math.sin(t1), O.y - 130 * Math.cos(t1))
    const P2 = point(O.x - 95 * Math.sin(t2),  O.y + 95 * Math.cos(t2))
    pic.edge(P1, O, { arrowEnd: 'stealth', style: { stroke: '#dc2626', strokeWidth: 2 } })
    pic.edge(O, P2, { arrowEnd: 'stealth', style: { stroke: '#7c3aed', strokeWidth: 2 } })

    // Angle arcs against the normal, derived from the ray directions
    const a1 = O.angleTo(P1)
    const a2 = O.angleTo(P2)
    pic.draw(arc(O, 40, a1, 270), { style: { stroke: '#dc2626' } })
    pic.draw(arc(O, 30, 90, a2),  { style: { stroke: '#7c3aed' } })
    pic.text(O.add(polar((a1 + 270) / 2, 56)), '$\\theta_1$', { style: { fontSize: 12 } })
    pic.text(O.add(polar((90 + a2) / 2, 46)), '$\\theta_2$', { style: { fontSize: 12 } })

    pic.text(point(368, 60), 'air',   { style: { fontSize: 11 } })
    pic.text(point(356, 195), 'water', { style: { fontSize: 11 } })
    pic.text(point(24, 24),
      'incidence: ' + deg + '°  →  refraction: ' + (t2 * 180 / Math.PI).toFixed(1) + '°',
      { textAnchor: 'start', style: { fontSize: 10, fill: '#475569' } })

    pic.mount(out, { width: 420, height: 230 })
  }

  slider.addEventListener('input', () => draw(Number(slider.value)))
  draw(Number(slider.value))
}
