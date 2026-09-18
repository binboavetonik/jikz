import { picture, line, point, bracePath, bracketPath } from 'jikz'

// TikZ's decorative brace and bracket, spanning the same segment. The
// third argument is the AMPLITUDE — how far the middle tip (brace) or
// the end jaws (bracket) stand off the span. It has to be a visible
// fraction of the span or the decoration flattens into a line.

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(40, 80), B = point(280, 80)

  pic.draw(line(A, B), { style: { stroke: '#334155', strokeWidth: 2 } })

  pic.draw(bracePath(point(A.x, 60), point(B.x, 60), 20), {
    style: { stroke: '#2563eb' },
    label: { text: 'bracePath, amplitude 20', at: 'north', distance: 6, style: { fontSize: 11 } },
  })
  pic.draw(bracketPath(point(A.x, 110), point(B.x, 110), 20), {
    style: { stroke: '#dc2626' },
    label: { text: 'bracketPath, amplitude 20', at: 'south', distance: 6, style: { fontSize: 11 } },
  })

  pic.mount(container, { fit: true, padding: 14 })
}
