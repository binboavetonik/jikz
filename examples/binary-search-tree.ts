import { allShapes, picture, point, tree } from 'jikz'

// A BST built from an insertion sequence — the tree layout computes
// positions from structure. The search path for one key is highlighted
// by name-addressed edges: layout and styling are separate passes.

const INSERTION_ORDER = [8, 3, 10, 1, 6, 14, 4, 7, 13]
const SEARCH_KEY = 7

interface BNode { v: number; parent?: number; l?: BNode; r?: BNode }

export default function render(container: HTMLElement) {
  // classic linked-node BST insertion, recording each node's parent
  let root: BNode | undefined
  for (const v of INSERTION_ORDER) {
    const n: BNode = { v }
    if (!root) { root = n; continue }
    let cur = root
    while (true) {
      if (v < cur.v) { if (!cur.l) { n.parent = cur.v; cur.l = n; break } cur = cur.l }
      else { if (!cur.r) { n.parent = cur.v; cur.r = n; break } cur = cur.r }
    }
  }

  // map the BST onto the tree-layout DSL (node names = values)
  const layout = tree({
    at: point(210, 30),
    grow: 'down',
    levelDistance: 44,
    siblingDistance: 30,
    nodeOptions: { shape: allShapes['circle'], minWidth: 30, minHeight: 30 },
  })
  const build = (t: ReturnType<typeof layout.root>, n: BNode | undefined): void => {
    if (!n) return
    const me = t.child(String(n.v))
    build(me, n.l)
    build(me, n.r)
    me.parent()
  }
  const t = layout.root(String(root!.v))
  build(t, root!.l)
  build(t, root!.r)
  const { nodes } = t.build()

  const pic = picture({ shapes: allShapes })

  // nodes first — edge endpoints resolve eagerly, by name
  for (const n of nodes) {
    const isTarget = n.text === String(SEARCH_KEY)
    pic.node(n.text, { at: n.center, shape: 'circle', minWidth: 30, minHeight: 30, text: n.text, style: isTarget
        ? { stroke: '#dc2626', fill: '#fee2e2', strokeWidth: 2 }
        : { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 }, textStyle: { fontSize: 11 } })
  }

  // edges by name — drawn from the parent links, not the layout's
  // point-edges, so the search path can be restyled by name
  const searchPath = searchPathTo(root!, SEARCH_KEY) // e.g. [8, 3, 6, 7]
  const drawEdges = (n: BNode | undefined): void => {
    if (!n) return
    for (const child of [n.l, n.r]) {
      if (!child) continue
      const onPath = searchPath.includes(n.v) && searchPath.includes(child.v)
      pic.edge(String(n.v), String(child.v), { arrowEnd: 'stealth', style: onPath ? { stroke: '#dc2626', strokeWidth: 2.2 } : { stroke: '#94a3b8', strokeWidth: 1.2 } })
      drawEdges(child)
    }
  }
  drawEdges(root)

  pic.text(point(20, 240), `search path for ${SEARCH_KEY} in red`, { textAnchor: 'start', style: { fontSize: 10, fill: '#64748b' } })
  pic.mount(container, { fit: true, padding: 12 })
}

/** The BST search path root→key, as values (assumes the key exists). */
function searchPathTo(root: BNode, key: number): number[] {
  const path: number[] = []
  let cur: BNode | undefined = root
  while (cur) {
    path.push(cur.v)
    if (key === cur.v) break
    cur = key < cur.v ? cur.l : cur.r
  }
  return path
}
