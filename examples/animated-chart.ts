import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// Enter animations as declarative SMIL: `enter: 'draw'` on the chart
// makes each line draw itself in (pathLength 1, a unit dash, offset
// 1 → 0) and each bar grow from its baseline, staggered in paint
// order. The animations are children of the series elements, so
// toSVG() output — a static file — plays them on open; a renderer
// without SMIL simply shows the final state.

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const REVENUE = [42, 47, 45, 58, 62, 61, 70, 74, 69, 81, 88, 95]
const TARGET = [40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84]
const COSTS = [30, 31, 33, 35, 34, 38, 40, 41, 43, 44, 46, 47]

export default function render(container: HTMLElement) {
  const pic = picture()

  chart(pic, {
    at: point(50, 210),
    width: 360,
    height: 170,
    x: { categories: MONTHS },
    y: { label: 'k€', grid: true },
    // Month initials repeat, so samples name their band by index.
    series: [
      { data: COSTS.map((v, i) => [i, v]), kind: 'bar', label: 'costs', enter: 'grow' },
      { data: REVENUE.map((v, i) => [i, v]), label: 'revenue', marks: 'o' },
      { data: TARGET.map((v, i) => [i, v]), label: 'target', style: { dash: 'dashed' } },
    ],
    legend: { place: 'below' },
    enter: { enter: 'draw', dur: '1200ms', stagger: '300ms' },
  })

  pic.mount(container, { fit: true, padding: 12 })
}
