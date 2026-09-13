import { allShapes, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  picture({ shapes: allShapes })
    .node('A', { at: point(70, 100),  shape: 'circle',    width: 60,  height: 60, text: 'A' })
    .node('B', { at: point(260, 50),  shape: 'rectangle', width: 100, height: 50, text: 'B' })
    .node('C', { at: point(260, 150), shape: 'rectangle', width: 100, height: 50, text: 'C' })
    .node('D', { at: point(450, 100), shape: 'diamond',   width: 100, height: 80, text: 'D' })
    .edge('A', 'B', { arrowEnd: 'stealth' })
    .edge('A', 'C', { arrowEnd: 'stealth' })
    .edge('B.east', 'D.north', { arrowEnd: 'stealth', label: 'ok' })
    .edge('C.east', 'D.south', { arrowEnd: 'stealth', label: 'err' })
    .mount(container, { width: 520, height: 200 })
}
