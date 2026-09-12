import { picture, point, circle, rect } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // Axis shadings — left→right and top→bottom.
  pic.shade(rect(20, 20, 60, 60), { leftColor: '#2563eb', rightColor: '#7c3aed' })
  pic.shade(rect(100, 20, 60, 60), { topColor: '#f59e0b', bottomColor: '#dc2626' })

  // Ball shading — a radial with the highlight offset toward the top-left.
  pic.shade(rect(180, 20, 60, 60), { ballColor: '#0d9488' })

  // Radial shadings — inner→outer, and the named radial/ball shadings.
  pic.shade(circle(point(50, 140), 30), { innerColor: '#fef08a', outerColor: '#ca8a04' })
  pic.shade(circle(point(130, 140), 30), { ballColor: '#dc2626' })
  pic.shade(circle(point(210, 140), 30), { shading: 'radial' })

  pic.mount(container, { width: 280, height: 190 })
}
