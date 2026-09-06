import { picture } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // \draw (A) node[below left]{A} -- (B) node[below right]{B} node[midway,below]{c}
  //       -- (C) node[right]{C} node[midway,right]{a} -- cycle node[midway]…{b}
  pic.pen({ style: { stroke: '#0f172a', strokeWidth: 1.6 } })
    .moveTo(40, 170)  .label('A', { at: 'south west' })
    .lineTo(300, 170) .label('B', { at: 'south east' })
                      .label('c', { pos: 0.5, offset: -10 })  // below the base
    .lineTo(300, 90)  .label('C', { at: 'north east' })
                      .label('a', { pos: 0.5, offset: -10 })  // right of BC
    .close()          .label('b', { pos: 0.5, offset: 10 })   // rides C→A

  pic.mount(container, { fit: true, padding: 12 })
}
