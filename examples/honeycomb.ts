import { picture, hexagon, point } from 'jikz'

// A honeycomb: regular hexagons tile the plane with zero hand-placed
// coordinates — the grid derives from the hexagon's own geometry.
// jikz hexagons are pointy-top (first vertex at -90°), so columns are
// √3·R apart, rows 1.5·R apart, and odd columns shift half a cell.

export default function render(container: HTMLElement) {
  const pic = picture()
  const R = 26                          // circumradius
  const colStep = Math.sqrt(3) * R      // horizontal pitch
  const rowStep = 1.5 * R               // vertical pitch
  const rowShift = colStep / 2          // odd-column vertical shift…

  let col = 0
  for (let x = colStep; x < 460; x += colStep, col++) {
    const yOffset = col % 2 === 0 ? 0 : rowShift / 2
    for (let y = R + 6; y < 300; y += rowStep) {
      const h = hexagon(point(x, y + yOffset), R)
      pic.filldraw(h, {
        style: {
          stroke: '#b45309',
          strokeWidth: 1.2,
          fill: col % 2 === 0 ? '#fef3c7' : '#fde68a',
        },
      })
    }
  }

  pic.mount(container, { fit: true, padding: 10 })
}
