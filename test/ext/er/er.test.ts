/** ER shapes — pinned against tikzlibraryer.code.tex. */
import { describe, it, expect } from 'vitest'
import { erShapes, er, ENTITY_MIN_WIDTH, ENTITY_MIN_HEIGHT, RELATIONSHIP_MIN_SIZE, RELATIONSHIP_INNER_SEP } from '../../../src/ext/er'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'

describe('er', () => {
  it('shapes carry the library minimums and the builders its inner sep', () => {
    expect(ENTITY_MIN_WIDTH).toBe(48)
    expect(ENTITY_MIN_HEIGHT).toBe(24)
    expect(RELATIONSHIP_MIN_SIZE).toBe(18)
    const pic = picture({ shapes: erShapes })
      .node('s', er.entity({ at: point(60, 60) }))
      .node('r', er.relationship({ at: point(160, 60), text: 'r' }))
      .node('a', er.attribute({ at: point(260, 60), text: 'a' }))
      .node('k', er.keyAttribute({ at: point(360, 60), text: 'id' }))
    expect(pic.getNode('s')!.width).toBe(ENTITY_MIN_WIDTH)
    expect(pic.getNode('s')!.height).toBe(ENTITY_MIN_HEIGHT)
    expect(pic.getNode('r')!.innerSep).toBe(RELATIONSHIP_INNER_SEP)
    expect(pic.getNode('r')!.shape.type).toBe('diamond')
    expect(pic.getNode('a')!.shape.type).toBe('ellipse')
    const svg = pic.toSVG({ width: 420, height: 120 })
    expect(svg).toMatch(/<text[^>]*font-style="italic"[^>]*>id</)
    expect(svg.match(/font-style="italic"/g)).toHaveLength(1)
  })

  it('string shape names resolve through the set', () => {
    const pic = picture({ shapes: erShapes }).node('e', { shape: 'entity', at: point(0, 0), minWidth: 0, minHeight: 0 })
    expect(pic.getNode('e')!.width).toBe(ENTITY_MIN_WIDTH)
  })
})
