import { picture, point } from 'jikz'
import { mindmap } from 'jikz/mindmap'

// TikZ's mindmap library: the manual's "Computational Complexity" map.
// Concepts are circles sized by level (4cm root, 2.25cm level 1, …),
// children fan out at the level's sibling angle, and each connection
// is the circle connection bar filled with a gradient from the parent's
// concept color to the child's. Everything scaled by 0.45 to fit a card.

export default function render(container: HTMLElement) {
  const pic = picture()

  mindmap(pic, {
    text: 'Computational\nComplexity', color: '#dc2626',
    children: [
      { text: 'Computational\nProblems', color: '#2563eb', children: [{ text: 'Problem\nMeasures' }, { text: 'Problem\nAspects' }, { text: 'Problem\nDomains' }] },
      { text: 'Computational\nModels', color: '#16a34a', children: [{ text: 'Turing\nMachines' }, { text: 'Random\nAccess' }] },
      { text: 'Measuring\nComplexity', color: '#d97706', children: [{ text: 'Complexity\nMeasures' }, { text: 'Classifying\nComplexity' }] },
      { text: 'Solving\nProblems', color: '#7c3aed' },
    ],
  }, { at: point(300, 300), scale: 0.45, grow: 200 })

  pic.mount(container, { fit: true, padding: 12 })
}
