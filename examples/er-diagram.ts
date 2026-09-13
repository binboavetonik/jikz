import { picture, point, erShapes, er } from 'jikz'

// TikZ's er library is four \tikzset styles over shapes.geometric, and
// ext/er keeps it that small: entity is a rectangle, relationship a
// diamond, attribute an ellipse, each carrying the library's minimum
// sizes so a short label still gets a diagram-sized box.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: erShapes })
  const box = { stroke: '#334155', fill: '#f8fafc', strokeWidth: 1.4 }
  const attr = { stroke: '#7c3aed', fill: '#f5f3ff', strokeWidth: 1.2 }
  const link = { stroke: '#64748b', strokeWidth: 1.1 }

  pic.node('student', er.entity({ at: point(80, 55), text: 'Student' }), { style: box })
  pic.node('takes', er.relationship({ at: point(230, 55), text: 'takes' }), { style: box })
  pic.node('course', er.entity({ at: point(380, 55), text: 'Course' }), { style: box })

  // keyAttribute says which one is the key; TikZ italicises it, which
  // jikz cannot yet do for node text, so it draws as a plain attribute.
  pic.node('sid', er.keyAttribute({ at: point(30, 160), text: 'id' }), { style: attr })
  pic.node('sname', er.attribute({ at: point(130, 160), text: 'name' }), { style: attr })
  pic.node('code', er.keyAttribute({ at: point(380, 160), text: 'code' }), { style: attr })

  for (const [a, b] of [
    ['student', 'takes'],
    ['takes', 'course'],
    ['student', 'sid'],
    ['student', 'sname'],
    ['course', 'code'],
  ] as const) {
    pic.edge(a, b, {}, { style: link })
  }

  pic.mount(container, { fit: true, padding: 16 })
}
