import { allShapes, picture, point } from 'jikz'
import { thick } from 'jikz/styles'

export default function render(container: HTMLElement) {
  const nodeStyle = { stroke: '#334155', fill: '#f8fafc', strokeWidth: 2 }
  // TikZ's \draw[thick, ...] as a typed array — later entries win
  const edgeStyle = [thick, { stroke: '#111827' }]

  picture({ shapes: allShapes })
    .node('input', { at: point(70, 80), shape: 'rectangle', width: 110, height: 54, text: 'input', style: nodeStyle })
    .node('transform', { at: point(260, 80), shape: 'diamond', width: 140, height: 80, text: 'transform', style: nodeStyle })
    .node('output', { at: point(450, 80), shape: 'rectangle', width: 110, height: 54, text: 'output', style: nodeStyle })
    .edge('input', 'transform', { arrowEnd: 'stealth', label: 'map', style: edgeStyle })
    .edge('transform', 'output', { arrowEnd: 'stealth', label: 'emit', style: edgeStyle })
    .mount(container, { width: 520, height: 160 })
}
