import { picture, turtle } from 'jikz'

// TikZ's turtle library: forward/back/left/right over a heading and a
// step, with the fd/bk/lt/rt shortcuts. Turning by just under a right
// angle each leg makes the square spiral precess.

export default function render(container: HTMLElement) {
  const pic = picture()

  const t = turtle({ distance: 6 })
  for (let i = 0; i < 110; i++) {
    t.fd(6 + i * 1.4).rt(89)
  }

  pic.draw(t.path, { style: { stroke: '#7c3aed', strokeWidth: 1 } })

  pic.mount(container, { fit: true, padding: 12 })
}
