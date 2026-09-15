import { allShapes, picture, point } from 'jikz'

// Every anchor a node answers to, marked and named. The label for each
// one is placed along the anchor's OWN direction from the center, so
// the text always lands outside the border — `label` measures the text
// and leaves a gap, which hand-picked offsets cannot promise.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  pic.node('N', { at: point(150, 85), shape: 'rectangle', width: 140, height: 90, text: 'N' },
    { style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 2 } })

  const n = pic.getNode('N')!
  // The eight compass names, plus one bare angle — numeric specs are
  // screen-convention degrees and hit the border along that ray.
  const specs = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west', 20]
  for (const spec of specs) {
    const p = n.anchor(spec)
    pic.draw(p, {
      style: { stroke: '#dc2626', strokeWidth: 2 },
      label: { text: String(spec), at: n.center.angleTo(p), options: { fontSize: 9 } },
    })
  }

  pic.mount(container, { fit: true, padding: 12 })
}
