import { picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  pic.node('N', { at: point(150, 85), shape: 'rectangle', width: 140, height: 90, text: 'N' },
    { style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 2 } })

  const n = pic.getNode('N')!
  const specs = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west', 45]
  for (const spec of specs) {
    const p = n.anchor(spec)
    pic.draw(p, { style: { stroke: '#dc2626', strokeWidth: 2 } })
    pic.text(p.towardByDistance(n.center, -15), String(spec), { fontSize: 9 })
  }

  pic.mount(container, { width: 300, height: 170 })
}
