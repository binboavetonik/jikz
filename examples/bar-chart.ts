import { picture, point, axes, legend } from 'jikz'

// The chart-library staple, now on ext/dataviz: axes() owns the y
// gridlines and nice ticks, the x ticks are categorical (format maps
// slot 1..4 to Q1..Q4), and the two series are bar groups shifted
// half a slot left/right around each quarter's tick.

const DATA: [label: string, a: number, b: number][] = [
  ['Q1', 42, 35],
  ['Q2', 58, 51],
  ['Q3', 49, 63],
  ['Q4', 71, 66],
]

const BLUE = { stroke: '#2563eb', fill: '#2563eb', fillOpacity: 0.75, strokeWidth: 1 }
const AMBER = { stroke: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.75, strokeWidth: 1 }

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = axes(pic, {
    at: point(50, 220),
    width: 360,
    height: 180,
    x: {
      domain: [0.5, 4.5],
      exact: true,
      tickValues: [1, 2, 3, 4],
      format: (v) => DATA[v - 1]?.[0] ?? '',
    },
    y: { domain: [0, 80], grid: true },
  })

  // Grouped bars: each quarter's slot is 1 data unit (90px) wide; the
  // two series sit ±0.2 units off the tick, 30px bars with a 6px gap.
  frame.bars(DATA.map((d, i) => [i + 1 - 0.2, d[1]]), { width: 30, style: BLUE })
  frame.bars(DATA.map((d, i) => [i + 1 + 0.2, d[2]]), { width: 30, style: AMBER })

  // The legend is placed by hand here (axes() draws no legend of its
  // own — chart() is the one-call builder that does). Framed, in the
  // corner the short Q1 bars leave empty.
  legend(pic, {
    at: point(62, 50),
    frame: true,
    entries: [
      { label: '2025', style: BLUE, sample: 'box' },
      { label: '2026', style: AMBER, sample: 'box' },
    ],
  })

  pic.mount(container, { width: 450, height: 250 })
}
