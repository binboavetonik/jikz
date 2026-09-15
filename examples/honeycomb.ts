import { picture, hexagon, point } from 'jikz'

// A honeycomb: regular hexagons tile the plane with zero hand-placed
// coordinates — the grid derives from the hexagon's own geometry.
// jikz polygons start at -90°, so a hexagon is POINTY-TOP: it is √3·R
// wide and 2·R tall. Pointy-top tiles in offset ROWS — √3·R apart
// across, 1.5·R apart down, odd rows pushed half a cell to the right.

export default function render(container: HTMLElement) {
  const pic = picture()
  const R = 26                          // circumradius
  const colStep = Math.sqrt(3) * R      // horizontal pitch = hexagon width
  const rowStep = 1.5 * R               // vertical pitch (not 2·R: rows interlock)

  let row = 0
  for (let y = R; y < 300; y += rowStep, row++) {
    const shift = (row % 2) * (colStep / 2)
    let col = 0
    for (let x = colStep / 2 + shift; x < 480; x += colStep, col++) {
      pic.filldraw(hexagon(point(x, y), R), {
        style: {
          stroke: '#b45309',
          strokeWidth: 1.2,
          fill: (row + col) % 2 === 0 ? '#fef3c7' : '#fde68a',
        },
      })
    }
  }

  pic.mount(container, { fit: true, padding: 10 })
}
