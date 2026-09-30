import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// A time axis: samples are Dates, ticks land on calendar boundaries
// — here the Mondays of a quarter — and each label says only what
// changed at it (the month on the 1st, the day otherwise). Ticks and
// labels follow UTC, so the picture is the same wherever it renders.
// Weekend gaps are real gaps in the data: NaN breaks the line.

const START = Date.UTC(2026, 2, 2) // Mon 2 Mar 2026
const DAY = 86_400_000
const rows: { day: Date; visits: number }[] = []
let level = 120
for (let i = 0; i < 56; i++) {
  const day = new Date(START + i * DAY)
  const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6
  level += Math.sin(i / 5) * 6 + (i % 7 === 3 ? 12 : 0) - 2
  rows.push({ day, visits: weekend ? NaN : Math.round(level + 40 * Math.sin(i / 9)) })
}

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = chart(pic, {
    at: point(50, 220),
    width: 380,
    height: 170,
    x: { time: true, ticks: 8, grid: true },
    y: { label: 'visits', grid: true, includeValue: 0 },
    series: [
      { data: { rows, x: 'day', y: 'visits' }, label: 'daily visits', marks: { name: 'circleFilled', size: 4 } },
    ],
    legend: { place: 'below' },
  })

  frame.referenceArea({ x1: new Date(Date.UTC(2026, 3, 6)), x2: new Date(Date.UTC(2026, 3, 10)), label: 'launch week' })

  pic.mount(container, { fit: true, padding: 12 })
}
