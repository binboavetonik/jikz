import { picture, line, point } from 'jikz'
import { axes } from 'jikz/dataviz'

// A box plot computed from raw arrays: quartiles in code, boxes and
// whiskers as pen statements. ext/dataviz owns the axis system — nice
// y ticks every 20 and group names as categorical x tick labels — and
// the boxes map through the frame's scales, so the medians sit exactly
// on the grid. The point is the pipeline — data in, diagram out.

const SAMPLES: [label: string, values: number[]][] = [
  ['control', [12, 18, 22, 25, 27, 29, 31, 33, 36, 41, 48]],
  ['treatment', [15, 21, 26, 30, 33, 35, 38, 40, 44, 49, 55]],
]

function quartiles(sorted: number[]): [q1: number, med: number, q3: number] {
  const q = (p: number) => {
    const i = (sorted.length - 1) * p
    const lo = Math.floor(i), hi = Math.ceil(i)
    return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo)
  }
  return [q(0.25), q(0.5), q(0.75)]
}

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = axes(pic, {
    at: point(50, 200),
    width: 190,
    height: 180,
    fontSize: 9,
    x: {
      domain: [0.5, 2.5],
      exact: true,
      tickValues: [1, 2],
      format: (v) => SAMPLES[v - 1]?.[0] ?? '',
    },
    y: { domain: [0, 60], grid: true },
  })

  SAMPLES.forEach(([, values], i) => {
    const sorted = [...values].sort((a, b) => a - b)
    const [q1, med, q3] = quartiles(sorted)
    const lo = sorted[0]!, hi = sorted[sorted.length - 1]!
    const cx = frame.x(i + 1), hw = 26   // center x, half box width
    const Y = (v: number) => frame.y(v)
    const color = i === 0 ? '#2563eb' : '#16a34a'

    // whiskers: center line + caps, one pen statement
    pic.pen({ style: { stroke: color, strokeWidth: 1.5 } })
      .moveTo(cx, Y(hi)).lineTo(cx, Y(lo))
      .moveTo(cx - 12, Y(hi)).lineTo(cx + 12, Y(hi))
      .moveTo(cx - 12, Y(lo)).lineTo(cx + 12, Y(lo))

    // box + median line
    pic.pen({ mode: 'filldraw', style: { stroke: color, strokeWidth: 1.5, fill: color, fillOpacity: 0.15 } })
      .moveTo(cx - hw, Y(q1)).lineTo(cx + hw, Y(q1)).lineTo(cx + hw, Y(q3)).lineTo(cx - hw, Y(q3)).close()
    pic.draw(line(point(cx - hw, Y(med)), point(cx + hw, Y(med))), { style: { stroke: color, strokeWidth: 2.5 } })
  })

  pic.mount(container, { width: 280, height: 235 })
}
