/** Automata — pinned against tikzlibraryautomata.code.tex. */
import { describe, it, expect } from 'vitest'
import {
  automataShapes, automata, initialArrow, acceptingArrow, DoubleCircle,
  STATE_MIN_SIZE, INITIAL_DISTANCE, INITIAL_TEXT, ACCEPTING_GAP,
} from '../../../src/ext/automata'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'

describe('automata', () => {
  it('state is a 2.5em circle; accepting a double circle; output a split', () => {
    expect(STATE_MIN_SIZE).toBe(25)
    const pic = picture({ shapes: automataShapes })
      .node('q0', automata.state({ at: point(50, 50) }))
      .node('q1', automata.state({ at: point(150, 50), text: 'q1', accepting: true }))
      .node('q2', automata.state({ at: point(250, 50), text: 'q2', output: 'out' }))
    expect(pic.getNode('q0')!.width).toBe(STATE_MIN_SIZE)
    expect(pic.getNode('q1')!.shape).toBeInstanceOf(DoubleCircle)
    const svg = pic.toSVG({ width: 300, height: 100 })
    // the accepting ring: two circle subpaths in one path, gap px apart
    const r = pic.getNode('q1')!.width / 2 // text-sized, above the 2.5em floor
    expect(svg).toContain(`M ${150 - r} 50 A ${r} ${r} 0 1 0`)
    expect(svg).toContain(`M ${150 - r + ACCEPTING_GAP} 50 A ${r - ACCEPTING_GAP} ${r - ACCEPTING_GAP}`)
    expect(svg).toContain('>out<')
  })

  it('initialArrow draws an arrow from 3ex outside with "start" at its tail', () => {
    const pic = picture({ shapes: automataShapes }).node('q0', automata.state({ at: point(100, 100) }))
    initialArrow(pic, 'q0')
    expect(INITIAL_DISTANCE).toBeCloseTo(12.9166)
    const svg = pic.toSVG({ fit: true })
    const tailX = 100 - STATE_MIN_SIZE / 2 - INITIAL_DISTANCE
    expect(svg).toMatch(new RegExp(`<path d="M ${tailX.toFixed(3).replace(/0+$/, '')}[\\d]* 100 L 87.5 100"[^>]*marker-end`))
    expect(svg).toContain(`>${INITIAL_TEXT}<`)
    expect(svg.indexOf('marker-end')).toBeGreaterThan(svg.indexOf('<g>')) // after the node
  })

  it('initial where and text, and acceptingArrow, follow TikZ', () => {
    const pic = picture({ shapes: automataShapes })
      .node('a', automata.state({ at: point(100, 100) }))
      .node('b', automata.accepting({ at: point(200, 100) }))
    initialArrow(pic, 'a', { where: 'above', text: 'go', edge: { style: { stroke: '#dc2626' } } })
    acceptingArrow(pic, 'b', { text: 'yes' })
    const svg = pic.toSVG({ fit: true })
    expect(svg).toContain('>go<')
    expect(svg).toContain('>yes<')
    expect(svg).toMatch(/L 100 87.5"[^>]*stroke="#dc2626"/) // arrives at the top border
    expect(svg).toMatch(/M 212.5 100 L 225.4[\d]* 100/) // leaves the right border outward
  })

  it('works in a math-frame picture', () => {
    const pic = picture({ shapes: automataShapes, frame: 'math', unit: 10 })
      .node('q', automata.state({ at: point(1, 1) }))
    initialArrow(pic, 'q', { where: 'below' })
    const svg = pic.toSVG({ fit: true })
    // below on the page = larger screen y than the node's bottom border (-10 + 12.5)
    expect(svg).toMatch(/M 10 15\.41[\d]* L 10 2\.5/)
  })
})
