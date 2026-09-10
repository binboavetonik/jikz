import { picture, tree, point } from 'jikz'

export default function render(container: HTMLElement) {
  // tree() computes the layout; nodes come back named by their text
  const t = tree({
    at: point(60, 120),
    grow: 'right',
    levelDistance: 40, // edge-to-edge gap (was 115 center-to-center)
    siblingDistance: 34,
    nodeOptions: { shape: 'circle', minWidth: 36, minHeight: 36 },
  })
    .root('start')
      .child('H').children(['HH', 'HT']).parent()
      .parent()
      .child('T').children(['TH', 'TT'])
    .build()

  const pic = picture()
  for (const n of t.nodes) {
    pic.node(n.text, { at: n.center, shape: 'circle', minWidth: 36, minHeight: 36, text: n.text },
      { style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 }, textStyle: { fontSize: 11 } })
  }

  const branches: [from: string, to: string][] = [['start', 'H'], ['start', 'T'], ['H', 'HH'], ['H', 'HT'], ['T', 'TH'], ['T', 'TT']]
  for (const [a, b] of branches)
    pic.edge(a, b, { label: '1/2', labelPos: 0.62 }, { style: { stroke: '#64748b', strokeWidth: 1.2 } })

  pic.mount(container, { width: 340, height: 240 })
}
