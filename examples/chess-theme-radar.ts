import { picture, point, polar, line } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const themes = ['Fork', 'Pin', 'Skewer', 'Discovered', 'Deflection', 'Mate in 2']
  const now  = [0.82, 0.64, 0.45, 0.71, 0.58, 0.90]
  const prev = [0.70, 0.62, 0.55, 0.55, 0.48, 0.78]
  const C = point(180, 160)
  const R = 95
  const N = themes.length
  // axis i points at screen angle -90 + i*360/N (screen convention: -90 = north)
  const vertex = (i: number, f: number) => C.add(polar(-90 + (i * 360) / N, R * f))

  // Grid rings (25/50/75/100%) as closed pen statements
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const ring = pic.pen({ style: { stroke: '#e2e8f0', strokeWidth: f === 1 ? 1.25 : 0.75 } })
    for (let i = 0; i < N; i++) {
      const v = vertex(i, f)
      if (i === 0) ring.moveTo(v)
      else ring.lineTo(v)
    }
    ring.close()
  }
  // Axes
  for (let i = 0; i < N; i++) {
    pic.draw(line(C, vertex(i, 1)), { style: { stroke: '#e2e8f0', strokeWidth: 0.75 } })
  }

  // Series — closed filldraw pen statements
  const series = (vals: number[], color: string, fillOp: number) => {
    const pen = pic.pen({ mode: 'filldraw', style: { stroke: color, strokeWidth: 2, fill: color, fillOpacity: fillOp } })
    vals.forEach((v, i) => (i === 0 ? pen.moveTo(vertex(i, v)) : pen.lineTo(vertex(i, v))))
    pen.close()
  }
  series(prev, '#94a3b8', 0.10)
  series(now, '#2563eb', 0.18)
  now.forEach((v, i) => pic.draw(vertex(i, v), { style: { stroke: '#2563eb', strokeWidth: 3 } }))

  // Axis labels on compass placement
  themes.forEach((t, i) => {
    pic.text(C.add(polar(-90 + (i * 360) / N, R + 26)), t, { style: { fontSize: 10 } })
  })

  // Legend
  pic.pen({ style: { stroke: '#2563eb', strokeWidth: 2.5 } }).moveTo(110, 310).lineTo(135, 310)
  pic.text(point(138, 310), 'current', { at: 'east', distance: 2, style: { fontSize: 10 } })
  pic.pen({ style: { stroke: '#94a3b8', strokeWidth: 2.5 } }).moveTo(210, 310).lineTo(235, 310)
  pic.text(point(238, 310), '3 months ago', { at: 'east', distance: 2, style: { fontSize: 10 } })

  pic.mount(container, { fit: true, padding: 10 })
}
