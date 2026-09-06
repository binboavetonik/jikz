import { picture, plotSin, plotCos, plotRose } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.draw(plotSin({ domain: [0, 2 * Math.PI], xScale: 40, yScale: 30, xOffset: 20, yOffset: 80 }),
    { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.draw(plotCos({ domain: [0, 2 * Math.PI], xScale: 40, yScale: 30, xOffset: 20, yOffset: 80 }),
    { style: { stroke: '#dc2626', strokeWidth: 1.5, dash: 'dashed' } })

  // 4-petal rose in the right panel
  pic.draw(plotRose(2, 55, { x: 340, y: 80 }), { style: { stroke: '#7c3aed', strokeWidth: 2 } })

  pic.mount(container, { width: 460, height: 160 })
}
