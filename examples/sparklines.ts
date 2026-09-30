import { picture, point } from 'jikz'
import { sparkline } from 'jikz/dataviz'

// Sparklines — TikZ's `datavisualization.sparklines`: word-sized lines
// with no axes, in a stat-tile row. Each has a normal band, a light
// fill, and a dot on its last value; the tile text is plain
// pic.text, so the tile is one loop.

const TILES: [name: string, values: number[], band: [number, number]][] = [
  ['latency p50', [42, 40, 44, 41, 39, 45, 43, 38, 37, 40, 36, 35], [35, 45]],
  ['error rate', [0.8, 0.7, 0.9, 1.4, 1.1, 0.6, 0.5, 0.7, 0.6, 0.4, 0.5, 0.4], [0.3, 1.0]],
  ['throughput', [310, 340, 330, 360, 380, 375, 410, 420, 405, 440, 460, 455], [300, 450]],
]

export default function render(container: HTMLElement) {
  const pic = picture()

  TILES.forEach(([name, values, band], i) => {
    const y = 40 + i * 44
    pic.text(point(10, y - 10), name, { textAnchor: 'start', style: { fontSize: 11, fill: '#334155' } })
    pic.text(point(10, y + 8), String(values[values.length - 1]), {
      textAnchor: 'start',
      style: { fontSize: 15, fontWeight: 'bold', fill: '#0f172a' },
    })
    sparkline(pic, values, { at: point(110, y + 12), width: 120, height: 26, band, fill: true, endMark: true })
  })

  pic.mount(container, { fit: true, padding: 12 })
}
