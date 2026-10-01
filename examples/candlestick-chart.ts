import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// Candlesticks — TikZ's `candle stick plot` from the barcharts
// sub-library: a wick from low to high and a body from open to close,
// hollow when the close is above the open and solid when below. A
// step line traces the closes, and a reference line marks the
// 20-day level.

const CANDLES: [day: number, open: number, high: number, low: number, close: number][] = [
  [1, 102, 106, 100, 105], [2, 105, 108, 103, 104], [3, 104, 105, 99, 100],
  [4, 100, 103, 98, 102], [5, 102, 109, 101, 108], [6, 108, 110, 106, 107],
  [7, 107, 108, 102, 103], [8, 103, 104, 97, 98], [9, 98, 102, 96, 101],
  [10, 101, 107, 100, 106], [11, 106, 112, 105, 111], [12, 111, 113, 108, 109],
]

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = chart(pic, {
    at: point(50, 220),
    width: 340,
    height: 180,
    x: { label: 'day', ticks: 6, about: 'int' },
    y: { grid: true, ticks: 5 },
    series: [
      { data: CANDLES, kind: 'candlestick', label: 'OHLC' },
      { data: CANDLES.map((c) => [c[0], c[4]]), interpolation: 'stepAfter', label: 'close', style: { strokeWidth: 1 } },
    ],
    legend: { place: 'below' },
  })

  frame.referenceLine({ y: 104.5, label: 'MA20' })

  pic.mount(container, { fit: true, padding: 12 })
}
