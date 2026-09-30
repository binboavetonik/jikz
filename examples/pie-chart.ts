import { picture, point } from 'jikz'
import { pie, legend } from 'jikz/dataviz'

// A donut with the style sheet's colours, a 2px canvas gap between
// slices, percentages inside the slices that have room and outside
// the one that does not, and a legend built from what pie() returns.

const SLICES = [
  { value: 42, label: 'search' },
  { value: 31, label: 'direct' },
  { value: 18, label: 'referral' },
  { value: 6, label: 'social' },
  { value: 3, label: 'email' },
]

export default function render(container: HTMLElement) {
  const pic = picture()

  const { slices } = pie(pic, {
    at: point(110, 110),
    radius: 90,
    innerRadius: 48,
    slices: SLICES,
  })

  legend(pic, {
    at: point(240, 60),
    entries: slices.map((s) => ({ id: s.id, label: `${s.label} · ${s.value}`, style: s.style, sample: 'box' })),
  })

  pic.text(point(110, 110), '100k', { style: { fontSize: 16, fontWeight: 'bold', fill: '#334155' } })
  pic.mount(container, { fit: true, padding: 12 })
}
