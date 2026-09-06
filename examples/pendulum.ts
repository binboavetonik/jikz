import { picture, circle, line, arc, polar, point } from 'jikz'

// A pendulum at displacement θ: pivot, rod, bob, the vertical
// reference dashed, and the angle arc between them — every element
// derives from the pivot point and θ, like a good TikZ physics figure.

export default function render(container: HTMLElement) {
  const pic = picture()
  const PIVOT = point(180, 40)
  const THETA = 35          // displacement from vertical, degrees
  const L = 150             // rod length

  // screen convention: straight down = 90°, so the bob sits at 90-θ
  const bob = PIVOT.add(polar(90 - THETA, L))

  // vertical reference + angle arc between vertical and rod
  pic.draw(line(PIVOT, PIVOT.add(polar(90, L * 0.85))), { style: { stroke: '#94a3b8', dash: 'dashed' } })
  pic.draw(arc(PIVOT, 52, 90, 90 - THETA, false), { style: { stroke: '#dc2626', strokeWidth: 1.2 } })
  pic.text(PIVOT.add(polar(90 - THETA / 2, 70)), '$\\theta$', { fontSize: 13 })

  // ceiling, pivot, rod, bob
  pic.draw(line(point(110, 40), point(250, 40)), { style: { stroke: '#334155', strokeWidth: 2.5 } })
  pic.filldraw(circle(PIVOT, 4), { style: { fill: '#334155' } })
  pic.draw(line(PIVOT, bob), { style: { stroke: '#334155', strokeWidth: 2 } })
  pic.filldraw(circle(bob, 16), { style: { stroke: '#2563eb', fill: '#93c5fd', strokeWidth: 2 } })

  // equilibrium position ghost
  pic.draw(circle(PIVOT.add(polar(90, L)), 16), { style: { stroke: '#cbd5e1', dash: 'dashed' } })

  pic.mount(container, { fit: true, padding: 12 })
}
