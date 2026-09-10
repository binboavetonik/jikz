import { picture, point, circle, rect, Transform } from 'jikz'

/**
 * One sub-assembly, drawn three times at three places — the thing a
 * scope makes possible. The unit is authored once around its own
 * origin; each scope shifts, scales and recolors the whole group.
 */
function bay(pic: ReturnType<typeof picture>, id: string, label: string, at: Transform, tint: string) {
  pic.scope({ transform: at, style: { stroke: tint, strokeWidth: 1.6 } }, (s) => {
    s.draw(rect(0, 0, 90, 54), { style: { fill: '#f8fafc' } })
      .node(`${id}-in`, { at: point(22, 27), shape: 'circle', width: 18, height: 18 })
      .node(`${id}-out`, { at: point(68, 27), shape: 'circle', width: 18, height: 18 })
      .edge(`${id}-in`, `${id}-out`, { arrowEnd: 'stealth' })
      .text(point(45, 12), label, { fontSize: 10, style: { fill: tint } })
  })
}

export default function render(container: HTMLElement) {
  const pic = picture()

  bay(pic, 'a', 'ingest', Transform.translation(10, 20), '#2563eb')
  bay(pic, 'b', 'transform', Transform.translation(130, 20), '#16a34a')
  bay(pic, 'c', 'load', Transform.translation(250, 20), '#c2410c')

  // Edges declared at picture level still reach names declared inside
  // the scopes — they resolve into picture space automatically.
  pic.edge('a-out', 'b-in', { arrowEnd: 'stealth' }, { style: { stroke: '#94a3b8' } })
  pic.edge('b-out', 'c-in', { arrowEnd: 'stealth' }, { style: { stroke: '#94a3b8' } })

  // A half-opacity group: opacity composites the scope as a unit.
  pic.scope({ transform: Transform.translation(10, 92), opacity: 0.45 }, (s) => {
    s.draw(circle(point(20, 14), 12), { style: { stroke: '#64748b', fill: '#e2e8f0' } })
      .text(point(96, 14), 'scope({ opacity: 0.45 }) — the group fades as one', {
        fontSize: 9,
        style: { fill: '#475569' },
      })
  })

  pic.mount(container, { width: 360, height: 130 })
}
