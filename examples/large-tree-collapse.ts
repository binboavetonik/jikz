import { allShapes, picture, treeFromSpec, type TreeNodeSpec } from 'jikz'

/**
 * Large-tree drill-in: the tree is laid out only down to MAX_LEVELS; at
 * the cut, nodes keep a "+N›" marker in their label and carry
 * `collapsed: hiddenCount` — the result's `collapsed` list is the
 * bookkeeping the click router uses to re-root and rebuild.
 *
 * Expansion state and marker visuals live here in the app; jikz owns the
 * layout semantics ("this node is a leaf with N withheld descendants").
 */

interface DataNode {
  label: string
  children: DataNode[]
}

/** Deterministic large tree: branching 2–3, 7 levels, ~1k nodes. */
function makeNode(path: string, depth: number): DataNode {
  const label = path || 'root'
  if (depth === 0) return { label, children: [] }
  const kids = 2 + (path.length % 2)
  return {
    label,
    children: Array.from({ length: kids }, (_, i) => makeNode(`${path}.${i + 1}`, depth - 1)),
  }
}

function countHidden(n: DataNode): number {
  return n.children.reduce((s, c) => s + 1 + countHidden(c), 0)
}

function findByLabel(n: DataNode, label: string): DataNode | null {
  if (n.label === label) return n
  for (const c of n.children) {
    const hit = findByLabel(c, label)
    if (hit) return hit
  }
  return null
}

const MAX_LEVELS = 3

export default function render(container: HTMLElement) {
  const data = makeNode('', 6)
  let rootData = data

  const draw = () => {
    const toSpec = (n: DataNode, level: number): TreeNodeSpec => {
      if (level >= MAX_LEVELS && n.children.length > 0) {
        return { content: `${n.label}  +${n.children.length}›`, collapsed: countHidden(n) }
      }
      return { content: n.label, children: n.children.map((c) => toSpec(c, level + 1)) }
    }

    const { nodes, edges, collapsed } = treeFromSpec(
      { content: rootData.label, children: rootData.children.map((c) => toSpec(c, 1)) },
      { grow: 'right', levelDistance: 14, siblingDistance: 6 }
    )

    const pic = picture({ shapes: allShapes })
    for (const e of edges) pic.draw(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
    const collapsedNames = new Set(collapsed.map((c) => c.node.name))
    for (const n of nodes) {
      const isCollapsed = collapsedNames.has(n.name)
      const isRoot = n === nodes[0]
      pic.node(
        n.name,
        {
          at: n.center, shape: 'rectangle', width: n.width, height: n.height,
          text: n.text, innerSep: 0, minWidth: 0, minHeight: 0,
        },
        {
          style: isCollapsed
            ? { stroke: '#d97706', fill: '#fef3c7', strokeWidth: 1.5 }
            : { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 },
          attributes: {
            ...(isCollapsed ? { 'data-drill': n.name } : {}),
            ...(isRoot && rootData !== data ? { 'data-reset': '1' } : {}),
            cursor: isCollapsed || (isRoot && rootData !== data) ? 'pointer' : 'default',
          },
        }
      )
    }

    container.replaceChildren()
    const svg = pic.mount(container, { fit: true, padding: 8 })
    svg.addEventListener('click', (ev) => {
      const el = (ev.target as Element | null)?.closest('[data-drill], [data-reset]')
      if (!el) return
      if (el.hasAttribute('data-reset')) {
        rootData = data
      } else {
        rootData = findByLabel(data, el.getAttribute('data-drill')!) ?? rootData
      }
      draw()
    })
  }

  draw()
}
