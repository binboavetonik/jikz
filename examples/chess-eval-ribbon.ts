import { point } from 'jikz'
import { chartView } from 'jikz/dataviz'

// An engine-evaluation ribbon, the way a game viewer draws one — and
// with nothing drawn by hand:
//   · the y axis is a winning-chance axis: pawns through a sigmoid
//     (`scale: { forward }`, TikZ's axis `function` — the inverse is
//     worked out numerically), so the pawn guides ±1, ±2, ±5 are the
//     axis's own ticks and gridlines;
//   · the area is one series with `above`/`below` paints — White's
//     advantage light, Black's dark — split exactly at zero;
//   · the current move is the controller's cursor, and a click on the
//     ribbon moves it (`onClick` gives the sample under the pointer).

const K = 0.368
const winning = { forward: (pawns: number) => 2 / (1 + Math.exp(-K * pawns)) - 1 }

// A game's evaluation in pawns, per ply: a slow White edge, a blunder
// at move 21, a swindle near the end.
const EVALS = Array.from({ length: 61 }, (_, ply) => {
  const drift = 0.3 + 0.9 * Math.sin(ply / 9)
  const blunder = ply >= 41 ? -3.2 * Math.exp(-(ply - 41) / 14) : 0
  const swindle = ply >= 54 ? 0.9 * (ply - 54) : 0
  const noise = 0.25 * Math.sin(ply * 2.1)
  return [ply, Math.max(-9, Math.min(9, drift + blunder + swindle + noise))] as [number, number]
})

export default function render(container: HTMLElement) {
  const view = chartView(
    container,
    {
      at: point(46, 150),
      width: 400,
      height: 120,
      fontSize: 9,
      x: { label: 'ply', ticks: 7, about: 'int' },
      y: { domain: [-10, 10], exact: true, scale: winning, tickValues: [-5, -2, -1, 0, 1, 2, 5], grid: true },
      series: [
        {
          data: EVALS,
          kind: 'area',
          id: 'eval',
          label: 'evaluation',
          style: { stroke: '#64748b', strokeWidth: 1.5 },
          above: { fill: '#e2e8f0', fillOpacity: 0.9 },
          below: { fill: '#334155', fillOpacity: 0.9 },
        },
      ],
    },
    {
      cursor: 41,
      cursorStyle: { width: 1 },
      crosshair: 'x',
      tooltip: { format: (hit) => `ply ${hit.x}: ${hit.y > 0 ? '+' : ''}${hit.y.toFixed(2)}` },
      onClick: (hit) => hit && view.setCursor(hit.x),
    }
  )
}
