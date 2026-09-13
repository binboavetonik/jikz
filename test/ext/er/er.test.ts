/**
 * ER extension — pinned against `tikzlibraryer.code.tex`, four
 * \tikzset styles over shapes.geometric with no new shapes. The sizes
 * are its \baselineskips at TikZ's default 10pt font.
 */
import { describe, it, expect } from 'vitest'
import {
  erShapes,
  er,
  BASELINE_SKIP,
  ENTITY_MIN_WIDTH,
  ENTITY_MIN_HEIGHT,
  ER_MIN_SIZE,
  RELATIONSHIP_INNER_SEP,
} from '../../../src/ext/er'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'

describe('TikZ defaults', () => {
  it('reads the minimums off \\baselineskip = 12pt', () => {
    expect(BASELINE_SKIP).toBe(12)
    expect(ENTITY_MIN_WIDTH).toBe(48) // 4\baselineskip
    expect(ENTITY_MIN_HEIGHT).toBe(24) // 2\baselineskip
    expect(ER_MIN_SIZE).toBe(18) // 1.5\baselineskip
    expect(RELATIONSHIP_INNER_SEP).toBe(1) // inner sep=1pt
  })
})

describe('erShapes', () => {
  it('names each kind and lets all of them size to their text', () => {
    for (const [name, kind] of Object.entries(erShapes)) {
      expect(kind.kindName).toBe(name)
      expect(kind.textAutoSize).toBe(true)
    }
  })

  it('is the geometric primitives underneath, as in TikZ', () => {
    const pic = picture({ shapes: erShapes })
    pic.node('e', { at: point(0, 0), shape: 'entity' })
    pic.node('r', { at: point(100, 0), shape: 'relationship' })
    pic.node('a', { at: point(200, 0), shape: 'attribute' })
    expect(pic.getNode('e')!.shape.type).toBe('rectangle')
    expect(pic.getNode('r')!.shape.type).toBe('diamond')
    expect(pic.getNode('a')!.shape.type).toBe('ellipse')
  })

  it('floors a small entity at the library minimums', () => {
    const pic = picture({ shapes: erShapes })
    pic.node('e', { at: point(0, 0), shape: 'entity', width: 10, height: 10 })
    const s = pic.getNode('e')!.shape
    expect(s.width).toBe(ENTITY_MIN_WIDTH)
    expect(s.height).toBe(ENTITY_MIN_HEIGHT)
  })

  it('floors relationships and attributes at 1.5 baselineskips', () => {
    // Only once jikz's own default minimum (20) is out of the way — it
    // is larger than TikZ's 18, so normally it is what binds.
    const pic = picture({ shapes: erShapes })
    const tiny = { width: 4, height: 4, minWidth: 0, minHeight: 0 }
    pic.node('r', { at: point(0, 0), shape: 'relationship', ...tiny })
    pic.node('a', { at: point(100, 0), shape: 'attribute', ...tiny })
    expect(pic.getNode('r')!.shape.width).toBe(ER_MIN_SIZE)
    expect(pic.getNode('a')!.shape.width).toBe(ER_MIN_SIZE)
  })

  it('otherwise lets jikz\'s larger default minimum win', () => {
    const pic = picture({ shapes: erShapes })
    pic.node('r', { at: point(0, 0), shape: 'relationship', width: 4, height: 4 })
    expect(pic.getNode('r')!.shape.width).toBe(20)
    expect(20).toBeGreaterThan(ER_MIN_SIZE)
  })

  it('lets a larger explicit size through untouched', () => {
    const pic = picture({ shapes: erShapes })
    pic.node('e', { at: point(0, 0), shape: 'entity', width: 200, height: 90 })
    const s = pic.getNode('e')!.shape
    expect(s.width).toBe(200)
    expect(s.height).toBe(90)
  })
})

describe('er builders', () => {
  it('sizes the same as the string route, so neither is second-class', () => {
    const byName = picture({ shapes: erShapes })
    byName.node('e', { at: point(0, 0), shape: 'entity', text: 'Course' })
    const byBuilder = picture({ shapes: erShapes })
    byBuilder.node('e', er.entity({ at: point(0, 0), text: 'Course' }))
    expect(byBuilder.getNode('e')!.shape.width).toBe(byName.getNode('e')!.shape.width)
    expect(byBuilder.getNode('e')!.shape.height).toBe(byName.getNode('e')!.shape.height)
  })

  it('gives a relationship TikZ\'s tighter inner sep', () => {
    expect(er.relationship().innerSep).toBe(RELATIONSHIP_INNER_SEP)
    expect(er.entity().innerSep).toBeUndefined()
    expect(er.relationship({ innerSep: 6 }).innerSep).toBe(6)
  })

  it('renders a small ER diagram end to end', () => {
    const pic = picture({ shapes: erShapes })
    pic.node('course', er.entity({ at: point(60, 40), text: 'Course' }))
    pic.node('takes', er.relationship({ at: point(180, 40), text: 'takes' }))
    pic.node('id', er.keyAttribute({ at: point(60, 120), text: 'id' }))
    pic.edge('course', 'takes')
    pic.edge('course', 'id')
    const svg = pic.toSVG({ width: 260, height: 170 })
    expect(svg).toContain('Course')
    expect(svg).toContain('takes')
  })

  it('leaves keyAttribute identical to attribute until text gains italics', () => {
    // TikZ separates them by font=\itshape alone, which jikz cannot yet
    // express for node text. Pinning the tie so it is noticed if it breaks.
    const { shape: keyShape, ...key } = er.keyAttribute({ text: 'id' })
    const { shape: attrShape, ...attr } = er.attribute({ text: 'id' })
    expect(key).toEqual(attr)
    expect(keyShape).toBe(attrShape)
  })
})
