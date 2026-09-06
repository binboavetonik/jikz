import { picture, line, point } from 'jikz'

// A box plot computed from raw arrays: quartiles in code, boxes and
// whiskers as pen statements. The point is the pipeline — data in,
// diagram out, no chart library in between.

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
  const yBase = 200, yScale = 3, xOff = 70
  const Y = (v: number) => yBase - v * yScale

  // axis
  pic.edge(point(45, yBase), point(45, 20), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })
  for (let v = 0; v <= 60; v += 20) {
    pic.text(point(38, Y(v) + 3), String(v), { fontSize: 9, textAnchor: 'end' })
  }

  SAMPLES.forEach(([label, values], i) => {
    const sorted = [...values].sort((a, b) => a - b)
    const [q1, med, q3] = quartiles(sorted)
    const lo = sorted[0]!, hi = sorted[sorted.length - 1]!
    const cx = xOff + i * 110, hw = 26   // center x, half box width
    const color = i === 0 ? '#2563eb' : '#16a34a'

    // whiskers: center line + caps, one pen statement
    pic.pen({ style: { stroke: color, strokeWidth: 1.5 } })
      .moveTo(cx, Y(hi)).lineTo(cx, Y(lo))
      .moveTo(cx - 12, Y(hi)).lineTo(cx + 12, Y(hi))
      .moveTo(cx - 12, Y(lo)).lineTo(cx + 12, Y(lo))

    // box + median line
    pic.pen({ mode: 'filldraw', style: { stroke: color, strokeWidth: 1.5, fill: color, 'fill-opacity': 0.15 } })
      .moveTo(cx - hw, Y(q1)).lineTo(cx + hw, Y(q1)).lineTo(cx + hw, Y(q3)).lineTo(cx - hw, Y(q3)).close()
    pic.draw(line(point(cx - hw, Y(med)), point(cx + hw, Y(med))), { style: { stroke: color, strokeWidth: 2.5 } })

    pic.text(point(cx, yBase + 16), label, { fontSize: 11 })
  })

  pic.mount(container, { width: 280, height: 235 })
}
