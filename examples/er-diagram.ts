import { picture } from 'jikz'
import { erShapes, er } from 'jikz/er'

// TikZ's er library: entity rectangles (4×2 baselineskips), diamond
// relationships, ellipse attributes, and the italic key attribute —
// laid out with relative placement (right=of, above=of) only.

export default function render(container: HTMLElement) {
  const pic = picture({
    shapes: erShapes,
    every: { node: { stroke: '#334155', fill: '#f8fafc' }, edge: { stroke: '#64748b' }, text: { fontSize: 11 } },
  })

  pic.node('student', er.entity({ at: { x: 70, y: 120 }, text: 'Student', width: 80, height: 36 }))
  pic.node('takes', er.relationship({ rightOf: 'student', distance: 44, text: 'takes', width: 70, height: 40 }))
  pic.node('course', er.entity({ rightOf: 'takes', distance: 44, text: 'Course', width: 80, height: 36 }))

  pic.node('sid', er.keyAttribute({ above: 'student', distance: 26, text: 'id' }))
  pic.node('name', er.attribute({ aboveRight: 'student', distance: 18, text: 'name' }))
  pic.node('grade', er.attribute({ below: 'takes', distance: 26, text: 'grade' }))
  pic.node('cid', er.keyAttribute({ above: 'course', distance: 26, text: 'code' }))

  for (const [a, b] of [['student', 'takes'], ['takes', 'course'], ['sid', 'student'], ['name', 'student'], ['grade', 'takes'], ['cid', 'course']] as const) {
    pic.edge(a, b)
  }

  pic.mount(container, { fit: true, padding: 12 })
}
