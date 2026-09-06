import { picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  picture()
    .node('E', { at: point(90, 70), shape: 'circle', width: 90, height: 60, text: '$e^{i\\pi}+1=0$' },
      { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 2 } })
    .node('I', { at: point(270, 70), shape: 'rectangle', width: 130, height: 60, text: '$\\int_0^1 x^2\\,dx$' },
      { style: { stroke: '#7c3aed', fill: '#ede9fe', strokeWidth: 2 } })
    .edge('E', 'I', { arrowEnd: 'stealth', label: '$\\Rightarrow$' })
    .mount(container, { width: 370, height: 150 })
}
