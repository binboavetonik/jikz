/**
 * `pic.add()` — layout results join the picture instead of being
 * re-declared node by node.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { tree } from '../../src/layout/Tree'
import { node } from '../../src/node/Node'
import { edge } from '../../src/node/Edge'

describe('Picture.add', () => {
  const org = () =>
    tree({ at: point(100, 20), grow: 'down' })
      .root('CEO')
      .child('CTO')
      .parent()
      .child('CFO')
      .build()

  it('registers a layout result’s named nodes and paints its edges', () => {
    const pic = picture().add(org())
    expect(pic.names).toEqual(['CEO', 'CTO', 'CFO'])
    expect(pic.getNode('CTO')!.text).toBe('CTO')
    // Names resolve like any other node: anchors and edges by name.
    expect(pic.resolve('CEO.south').y).toBeGreaterThan(20)
    pic.edge('CFO', 'CTO', { bendAngle: 30 })
    const svg = pic.toSVG({ fit: true })
    expect(svg.match(/<text/g)!.length).toBe(3)
    expect(svg.match(/marker-end/g)!.length).toBe(3) // 2 tree edges + 1
  })

  it('applies per-kind render options', () => {
    const svg = picture()
      .add(org(), {
        nodes: { style: { fill: '#dcfce7' } },
        edges: { style: { stroke: '#64748b' } },
      })
      .toSVG({ fit: true })
    expect(svg.match(/fill="#dcfce7"/g)!.length).toBe(3)
    expect(svg.match(/stroke="#64748b"/g)!.length).toBe(2)
  })

  it('accepts a flat list and leaves unnamed nodes unregistered', () => {
    const a = node({ at: point(0, 0), text: 'a' })
    const b = node({ at: point(80, 0), name: 'b', text: 'b' })
    const pic = picture().add([a, b, edge(a, b)])
    expect(pic.names).toEqual(['b'])
    expect(pic.items).toHaveLength(3)
  })

  it('throws on a name that already exists', () => {
    const pic = picture().node('CEO', { at: point(0, 0) })
    expect(() => pic.add(org())).toThrow(/"CEO" already exists/)
  })

  it('nodes added inside a scope resolve into picture space', () => {
    const pic = picture()
    pic.scope({ transform: undefined, scale: 2 }, (s) => s.add(org()))
    // Root at (100, 20) in scope space → (200, 40) in picture space.
    expect(pic.resolve('CEO').x).toBeCloseTo(200)
    expect(pic.resolve('CEO').y).toBeCloseTo(40)
  })
})
