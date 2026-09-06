import { picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.node('hello', { at: point(150, 50), shape: 'rectangle', text: 'auto sized' },
    { style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 2 } })
  pic.node('pill', { at: point(150, 120), shape: 'circle', text: 'and circles too' },
    { style: { stroke: '#7c3aed', fill: '#ede9fe', strokeWidth: 2 } })

  pic.mount(container, { width: 300, height: 170 })
}
