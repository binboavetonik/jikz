import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// Stacked areas — traffic by source. Each area series with the same
// `stack` sits on the one before it and its samples are increments,
// so the top edge is the total; chart() widens the y domain to the
// stack totals. Smooth interpolation on every edge, a reference area
// marking the campaign weeks, and the legend outside to the east.

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const ORGANIC = [12, 14, 13, 16, 18, 17, 21, 24, 23, 26]
const PAID = [4, 5, 9, 12, 11, 6, 5, 5, 6, 5]
const REFERRAL = [3, 3, 4, 4, 5, 6, 6, 7, 8, 8]

const rows = (ys: number[]) => WEEKS.map((w, i) => [w, ys[i]!] as [number, number])

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = chart(pic, {
    at: point(50, 220),
    width: 340,
    height: 180,
    x: { label: 'week', ticks: 10 },
    y: { label: 'visits (k)', grid: true },
    series: [
      { data: rows(ORGANIC), kind: 'area', stack: 'traffic', label: 'organic', smooth: true },
      { data: rows(PAID), kind: 'area', stack: 'traffic', label: 'paid', smooth: true },
      { data: rows(REFERRAL), kind: 'area', stack: 'traffic', label: 'referral', smooth: true },
    ],
    legend: { place: 'eastOutside' },
  })

  frame.referenceArea({ x1: 3, x2: 5, label: 'campaign' })

  pic.mount(container, { fit: true, padding: 12 })
}
