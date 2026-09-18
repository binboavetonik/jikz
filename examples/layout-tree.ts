import { tree, point, picture } from 'jikz'

export default function render(container: HTMLElement) {
  // A layout result joins the picture with add(): its named nodes
  // register, so 'CEO', 'QA.north' and edge('QA', 'CFO') work on them
  // like on any node declared with pic.node().
  const org = tree({ edgeOptions: { arrowEnd: 'stealth' }, at: point(220, 35), grow: 'down' })
    .root('CEO')
      .child('CTO')
        .children(['Eng', 'QA'])
        .parent()
      .parent()
      .child('CFO')
    .build()

  picture()
    .add(org, {
      nodes: { style: { stroke: '#16a34a', fill: '#dcfce7', strokeWidth: 1.5 } },
      edges: { style: { stroke: '#64748b' } },
    })
    .mount(container, { width: 440, height: 200 })
}
