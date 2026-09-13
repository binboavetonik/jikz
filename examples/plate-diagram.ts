import { allShapes, picture, point, rect, rectFit } from 'jikz'

// The Bayesian-network plate diagram — a texample staple. Latent and
// observed variables as nodes (the observed one shaded), a dashed
// dependency edge, and the "plate" (repetition box) as a rectFit
// around the subset with the count in the corner — TikZ's
// \node[fit=(z)(x), label=below right:N].

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })

  pic.node('z', {
    at: point(90, 80), shape: 'circle', width: 44, height: 44, text: '$z_i$',
  }, { style: { stroke: '#334155', fill: '#ffffff', strokeWidth: 1.5 } })

  pic.node('x', {
    at: point(210, 80), shape: 'circle', width: 44, height: 44, text: '$x_i$',
  }, { style: { stroke: '#334155', fill: '#cbd5e1', strokeWidth: 1.5 } }) // observed = shaded

  pic.node('theta', {
    at: point(60, 200), shape: 'circle', width: 48, height: 48, text: '$\\theta$',
  }, { style: { stroke: '#334155', fill: '#ffffff', strokeWidth: 1.5 } })

  pic.edge('theta', 'z', { arrowEnd: 'stealth' }, { style: { stroke: '#64748b', strokeWidth: 1.2 } })
  pic.edge('z', 'x', { arrowEnd: 'stealth' }, { style: { stroke: '#64748b', strokeWidth: 1.2 } })
  pic.edge('theta', 'x', { arrowEnd: 'stealth', bendAngle: -25 },
    { style: { stroke: '#94a3b8', dash: 'dashed', strokeWidth: 1.2 } })

  // The plate: tight fit around z and x, padded, count in the corner
  const corners = ['z', 'x'].flatMap((name) => {
    const [x0, y0, x1, y1] = pic.getNode(name)!.bounds
    return [point(x0, y0), point(x1, y1)]
  })
  const plate = rectFit(corners)!
  const pad = 18
  pic.draw(rect(plate.x - pad, plate.y - pad, plate.width + 2 * pad, plate.height + 2 * pad),
    { style: { stroke: '#475569', strokeWidth: 1.2 } })
  pic.text(point(plate.x + plate.width + pad - 4, plate.y + plate.height + pad - 6),
    '$N$', { fontSize: 13, textAnchor: 'end' })

  pic.mount(container, { fit: true, padding: 12 })
}
