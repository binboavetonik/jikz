import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// A logarithmic y axis — TikZ's `logarithmic` with `exponential
// steps`: positions are linear in log10, major ticks at the decades
// with 2…9 as minor ticks and a minor grid, and the domain widened to
// whole decades. Three scaling laws that would be one flat line and
// one wall on a linear axis read as three straight lines here.

const N = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
const law = (f: (n: number) => number) => N.map((n) => [n, f(n)] as [number, number])

export default function render(container: HTMLElement) {
  const pic = picture()

  chart(pic, {
    at: point(60, 220),
    width: 340,
    height: 180,
    x: { label: 'n', logarithmic: true },
    y: { label: 'steps', logarithmic: true, grid: 'both' },
    series: [
      { data: law((n) => n * Math.log2(n) + 1), label: 'n log n', marks: 'o' },
      { data: law((n) => n * n), label: 'n²', marks: 'square' },
      { data: law((n) => 2 * n), label: '2n', marks: 'cross' },
    ],
    legend: { place: 'northWestInside' },
  })

  pic.mount(container, { fit: true, padding: 12 })
}
