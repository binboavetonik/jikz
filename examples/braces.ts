import { picture, line, point, bracePath, bracketPath } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.draw(line(point(40, 60), point(280, 60)), { style: { stroke: '#334155', strokeWidth: 2 } })
  pic.draw(bracePath(point(40, 45), point(280, 45), 8), { style: { stroke: '#2563eb' } })
  pic.text(point(160, 30), 'bracePath', { fontSize: 11 })
  pic.draw(bracketPath(point(40, 110), point(280, 110), 8), { style: { stroke: '#dc2626' } })
  pic.text(point(160, 132), 'bracketPath', { fontSize: 11 })

  pic.mount(container, { width: 320, height: 150 })
}
