import { matrix, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  const { cells } = matrix({ at: point(50, 40), columnSep: 26, rowSep: 18 })
    .rows([
      ['a11', 'a12', 'a13'],
      ['a21', 'a22', 'a23'],
      ['a31', 'a32', 'a33'],
    ])
    .build()

  const r = new SVGRenderer()
  for (const row of cells) {
    for (const n of row) {
      if (n) r.renderNode(n, { style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 } })
    }
  }
  r.builder.mount(container, { width: 340, height: 190 })
}
