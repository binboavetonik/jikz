import { allShapes, picture, point, rect } from 'jikz'

// The styling vocabulary applied to nodes as "UI badges": rounded
// corners via the 'rounded rectangle' shape's cornerRadius (style
// borderRadius works on bare rect() geometry, not path-based nodes),
// text breathing room via innerSep, label gap via outerSep, a drop
// shadow, and TikZ's double border — what plain options buy you.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })

  pic.node('plain', { at: point(60, 60), shape: 'rectangle', text: 'plain', style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 } })

  pic.node('rounded', {
    at: point(180, 60), shape: 'rounded rectangle', text: 'rounded',
    shapeOptions: { cornerRadius: 12 },
    style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 }
  })

  pic.node('airy', {
    at: point(300, 60), shape: 'rectangle', text: 'innerSep 12',
    innerSep: 12,
    style: { stroke: '#16a34a', fill: '#dcfce7', strokeWidth: 1.5 }
  })

  pic.node('shadowed', {
    at: point(430, 60), shape: 'rounded rectangle', text: 'shadowed',
    shapeOptions: { cornerRadius: 8 },
    style: {
      stroke: '#7c3aed', fill: '#ede9fe', strokeWidth: 1.5,
      dropShadow: { blur: 5, offsetX: 2, offsetY: 3, color: '#7c3aed55' },
    }
  })

  pic.node('doubled', {
    at: point(120, 150), shape: 'rectangle', text: 'double border',
    style: { stroke: '#b45309', fill: '#fef3c7', strokeWidth: 1.2, doubleLine: { spacing: 3 } }
  })

  // outerSep pushes the label's gap outward from the border
  pic.node('labeled', {
    at: point(300, 150), shape: 'rectangle', text: 'outerSep 8', outerSep: 8,
    labels: [{ text: 'label gap = distance + outerSep', at: 'north', style: { fontSize: 9 } }],
    style: { stroke: '#dc2626', fill: '#fee2e2', strokeWidth: 1.5 }
  })

  // borderRadius is a STYLE, so it rounds bare rect() geometry — the
  // 'rounded rectangle' SHAPE above is the node-level equivalent.
  // Parked clear of the badge on its left, whose label is wide.
  pic.filldraw(rect(440, 120, 60, 60), {
    style: { stroke: '#0f172a', fill: '#f8fafc', strokeWidth: 1.5, roundedCorners: 14 },
    label: { text: 'bare rect + borderRadius style', at: 'south', style: { fontSize: 9 } },
  })

  pic.mount(container, { fit: true, padding: 18 })
}
