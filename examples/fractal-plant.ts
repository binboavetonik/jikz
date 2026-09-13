import { picture, lindenmayer } from 'jikz'

// What an L-system does that plain recursion does not: branching. The
// [ and ] symbols save and restore the turtle, so one string describes
// a whole tree, and X rewrites without ever drawing.
//
// Randomization is seeded, so the plant is organic but the SVG is
// still byte-for-byte reproducible.

const plant = {
  axiom: 'X',
  rules: {
    X: 'F+[[X]-X]-F[-FX]+X',
    F: 'FF',
  },
}

export default function render(container: HTMLElement) {
  const pic = picture()

  const stem = lindenmayer(plant, {
    order: 5,
    step: 4,
    angle: 25,
    direction: -90, // grow upward
    randomizeAnglePercent: 18,
    randomizeStepPercent: 22,
    seed: 11,
  })

  pic.draw(stem, {
    style: { stroke: '#15803d', strokeWidth: 1, strokeLinecap: 'round' },
  })

  pic.mount(container, { fit: true, padding: 12 })
}
