import { picture, path, point } from 'jikz'

export default function render(container: HTMLElement) {
  const hill = path()
    .moveTo(point(30, 150))
    .curveTo(point(90, 20), point(210, 20), point(270, 150))
    .lineTo(point(270, 160))
    .lineTo(point(30, 160))
    .close()

  picture()
    .filldraw(hill, { style: { stroke: '#7c3aed', strokeWidth: 2, fill: '#ede9fe' } })
    .mount(container, { width: 300, height: 180 })
}
