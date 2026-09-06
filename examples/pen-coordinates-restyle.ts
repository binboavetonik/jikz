import { picture } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // \draw (30,90) coordinate (P) -- (170,40) coordinate (Q), with labels
  pic.pen({ style: { stroke: '#0f172a', strokeWidth: 1.6 } })
    .moveTo(30, 90) .coordinate('P').label('P', { at: 'south west' })
    .lineTo(170, 40).coordinate('Q').label('Q', { at: 'north east' })

  // \draw[dashed] (P) |- (Q) — the label rides the corner's elbow
  pic.pen({ style: { stroke: '#94a3b8', dash: 'dashed' } })
    .moveTo('P')
    .vhTo('Q')
    .label('L', { pos: 0.5, offset: 8 })

  // push() restyles mid-statement: one statement, two looks
  pic.pen({ style: { stroke: '#2563eb' } })
    .moveTo(30, 130).lineTo(110, 130)
    .push({ style: { stroke: '#dc2626', strokeWidth: 2.5 } })
    .lineTo(230, 130)

  pic.mount(container, { fit: true, padding: 12 })
}
