import { SVGRenderer, allShapes, graph } from 'jikz'

export default function render(container: HTMLElement) {
  const g = graph()
  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  for (const n of names) {
    g.node(n, { shape: allShapes['circle'], width: 32, height: 32, text: n.toUpperCase() })
  }

  // A cycle with chords — arbitrary graph, no hierarchy, no DAG. The
  // force engine is the "just make it readable" answer for this shape.
  const links: [string, string][] = [
    ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'],
    ['e', 'f'], ['f', 'g'], ['g', 'h'], ['h', 'a'],
    ['a', 'd'], ['b', 'e'], ['c', 'f'], ['d', 'g'],
  ]
  for (const [from, to] of links) g.edge(from, to, { arrowEnd: 'none' })

  const { nodes, edges } = g
    .force({ seed: 5, width: 280, height: 200, iterations: 200 })
    .build()

  const r = new SVGRenderer()
  for (const e of edges) r.renderEdge(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
  for (const n of nodes) r.renderNode(n, { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  r.builder.mount(container, { width: 280, height: 200 })
}
