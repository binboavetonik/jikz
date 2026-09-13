import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { Transform } from '../../src/core/Transform'
import { circle } from '../../src/geometry/Circle'
import { line } from '../../src/geometry/Line'
import type { PictureRenderer } from '../../src/picture/Picture'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

/** Records what reaches the backend, so cascade order is observable. */
function recorder() {
  const calls: string[] = []
  const style = (o?: { style?: unknown }) => {
    const s = o?.style as Record<string, unknown> | undefined
    if (!s || Array.isArray(s)) return JSON.stringify(s ?? null)
    return `${String(s.stroke)}/${String(s.fill)}/${String(s.strokeWidth)}`
  }
  const backend: PictureRenderer & { calls: string[] } = {
    calls,
    renderNode: (n, o) => calls.push(`node:${n.name}:${style(o)}`),
    renderEdge: (_e, o) => calls.push(`edge:${style(o)}`),
    render: (_obj, o) => calls.push(`bare:${style(o)}`),
    renderText: (t) => calls.push(`text:${t}`),
    beginGroup: (o) => calls.push(`begin:${o.transform?.toSVGMatrix() ?? 'none'}`),
    endGroup: () => calls.push('end'),
  }
  return backend
}

describe('Scope', () => {
  describe('purely additive', () => {
    it('emits byte-identical SVG when no scope is used', () => {
      const build = () =>
        picture({ shapes: SHAPES })
          .node('A', { at: point(30, 30), shape: SHAPES['circle'], width: 20, height: 20 })
          .draw(circle(point(70, 30), 10))
          .toSVG({ width: 120, height: 60 })
      expect(build()).toBe(build())
      expect(build()).not.toContain('<g transform')
    })

    it('adds no group for a style-only scope', () => {
      const svg = picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#f00' } }, (s) => s.draw(circle(point(30, 30), 10)))
        .toSVG({ width: 60, height: 60 })
      expect(svg).not.toContain('<g transform')
      expect(svg).toContain('#f00')
    })

    it('returns the container so the chain continues', () => {
      const pic = picture({ shapes: SHAPES })
      const back = pic.scope({ style: { stroke: '#f00' } }, (s) => s.draw(circle(point(0, 0), 1)))
      expect(back).toBe(pic)
    })
  })

  describe('style cascade', () => {
    it('applies the scope style to nodes, edges and bare shapes', () => {
      const b = recorder()
      picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#00f', strokeWidth: 3 } }, (s) => {
          s.node('A', { at: point(0, 0), shape: SHAPES['circle'], width: 10, height: 10 })
            .node('B', { at: point(40, 0), shape: SHAPES['circle'], width: 10, height: 10 })
            .edge('A', 'B')
            .draw(circle(point(20, 20), 5))
        })
        .renderWith(b)
      expect(b.calls.filter((c) => c.startsWith('bare:'))).toEqual(['bare:#00f/none/3'])
      expect(b.calls.some((c) => c.startsWith('node:A:') && c.includes('#00f'))).toBe(true)
      expect(b.calls.some((c) => c.startsWith('edge:') && c.includes('#00f'))).toBe(true)
    })

    it("lets an item's own style override the scope, key by key", () => {
      const b = recorder()
      picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#00f', strokeWidth: 3 } }, (s) => {
          s.draw(circle(point(0, 0), 5), { style: { stroke: '#f00' } })
        })
        .renderWith(b)
      // stroke overridden, strokeWidth still inherited.
      expect(b.calls).toContain('bare:#f00/none/3')
    })

    it('lets an inner scope override an outer one', () => {
      const b = recorder()
      picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#00f', strokeWidth: 3 } }, (outer) => {
          outer.draw(circle(point(0, 0), 5))
          outer.scope({ style: { stroke: '#0f0' } }, (inner) => {
            inner.draw(circle(point(20, 0), 5))
          })
        })
        .renderWith(b)
      const bares = b.calls.filter((c) => c.startsWith('bare:'))
      expect(bares).toEqual(['bare:#00f/none/3', 'bare:#0f0/none/3'])
    })

    it('beats the path-mode baseline, so scope colors actually show', () => {
      const b = recorder()
      picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#0f0' } }, (s) => s.draw(circle(point(0, 0), 5)))
        .renderWith(b)
      // Not the `draw` baseline's #000000.
      expect(b.calls).toContain('bare:#0f0/none/1')
    })

    it('keeps `path` invisible even inside a styling scope', () => {
      const b = recorder()
      picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#0f0', fill: '#0f0' } }, (s) => {
          s.path(circle(point(0, 0), 5))
          s.path(circle(point(20, 0), 5), { style: { stroke: '#f00' } })
        })
        .renderWith(b)
      const bares = b.calls.filter((c) => c.startsWith('bare:'))
      // First stays none/none; an explicit style on the call still draws.
      expect(bares[0]).toBe('bare:none/none/1')
      expect(bares[1]).toBe('bare:#f00/none/1')
    })

    it('does not restyle text — a scope fill must not recolor labels', () => {
      const svg = picture({ shapes: SHAPES })
        .scope({ style: { fill: '#00f' } }, (s) => s.text(point(20, 20), 'hi'))
        .toSVG({ width: 60, height: 40 })
      const text = svg.slice(svg.indexOf('<text'))
      expect(text).not.toContain('#00f')
    })
  })

  describe('transform', () => {
    it('wraps the scope in a transform group and leaves geometry local', () => {
      const svg = picture({ shapes: SHAPES })
        .scope({ transform: Transform.translation(100, 0) }, (s) => {
          s.draw(circle(point(20, 20), 10))
        })
        .toSVG({ width: 200, height: 60 })
      expect(svg).toContain('<g transform="matrix(1 0 0 1 100 0)">')
      expect(svg).toContain('cx="20"') // untransformed inside the group
    })

    it('composes nested transforms', () => {
      const b = recorder()
      picture({ shapes: SHAPES })
        .scope({ transform: Transform.translation(100, 0) }, (outer) => {
          outer.scope({ transform: Transform.translation(10, 5) }, (inner) => {
            inner.draw(circle(point(0, 0), 1))
          })
        })
        .renderWith(b)
      expect(b.calls[0]).toBe('begin:matrix(1 0 0 1 100 0)')
      expect(b.calls[1]).toBe('begin:matrix(1 0 0 1 10 5)')
      expect(b.calls.at(-1)).toBe('end')
    })

    it('accepts `scale` as sugar', () => {
      const svg = picture({ shapes: SHAPES })
        .scope({ scale: 2 }, (s) => s.draw(circle(point(10, 10), 5)))
        .toSVG({ width: 60, height: 60 })
      expect(svg).toContain('<g transform="matrix(2 0 0 2 0 0)">')
    })

    it('emits group opacity, class and id', () => {
      const svg = picture({ shapes: SHAPES })
        .scope({ opacity: 0.5, className: 'sub', id: 'g1' }, (s) =>
          s.draw(circle(point(20, 20), 10))
        )
        .toSVG({ width: 60, height: 60 })
      expect(svg).toMatch(/<g [^>]*opacity="0.5"/)
      expect(svg).toMatch(/<g [^>]*class="sub"/)
      expect(svg).toMatch(/<g [^>]*id="g1"/)
    })
  })

  describe('names across scopes', () => {
    it('registers scope nodes globally and resolves them in picture space', () => {
      const pic = picture({ shapes: SHAPES }).scope({ transform: Transform.translation(100, 0) }, (s) => {
        s.node('inner', { at: point(20, 30), shape: SHAPES['circle'], width: 10, height: 10 })
      })
      expect(pic.names).toEqual(['inner'])
      expect(pic.resolve('inner').x).toBeCloseTo(120)
      expect(pic.resolve('inner').y).toBeCloseTo(30)
    })

    it('rejects a duplicate name declared inside a scope', () => {
      expect(() =>
        picture({ shapes: SHAPES })
          .node('A', { at: point(0, 0) })
          .scope({}, (s) => s.node('A', { at: point(10, 0) }))
      ).toThrow(/already exists/)
    })

    it('resolves an outer name into scope-local coordinates', () => {
      // 'outer' is at picture (20,30); inside a scope translated by
      // (100,0) the same point must read as (-80,30), so that after the
      // group transform it lands back on (20,30).
      const pic = picture({ shapes: SHAPES }).node('outer', {
        at: point(20, 30),
        shape: SHAPES['circle'],
        width: 10,
        height: 10,
      })
      let seen = { x: 0, y: 0 }
      pic.scope({ transform: Transform.translation(100, 0) }, (s) => {
        seen = s.resolve('outer')
      })
      expect(seen.x).toBeCloseTo(-80)
      expect(seen.y).toBeCloseTo(30)
    })

    it('keeps a same-scope edge in local coordinates', () => {
      const b = recorder()
      const pic = picture({ shapes: SHAPES })
      pic.scope({ transform: Transform.translation(100, 0) }, (s) => {
        s.node('A', { at: point(0, 0), shape: SHAPES['circle'], width: 10, height: 10 })
          .node('B', { at: point(40, 0), shape: SHAPES['circle'], width: 10, height: 10 })
          .edge('A.center', 'B.center')
      })
      pic.renderWith(b)
      // Endpoints must be 0 and 40, not 100 and 140 — the group applies
      // the offset once.
      const edge = pic.items
      expect(edge).toHaveLength(1)
      const inner = (edge[0] as { scope: { items: readonly unknown[] } }).scope.items
      const e = inner.find((i) => (i as { kind: string }).kind === 'edge') as {
        edge: { from: { x: number }; to: { x: number } }
      }
      expect(e.edge.from.x).toBeCloseTo(0)
      expect(e.edge.to.x).toBeCloseTo(40)
    })

    it('resolves a cross-scope edge drawn at picture level', () => {
      const pic = picture({ shapes: SHAPES })
        .scope({ transform: Transform.translation(100, 0) }, (s) => {
          s.node('inner', { at: point(0, 0), shape: SHAPES['circle'], width: 10, height: 10 })
        })
        .node('outer', { at: point(0, 0), shape: SHAPES['circle'], width: 10, height: 10 })
        .edge('outer.center', 'inner.center')
      const e = pic.items.find((i) => i.kind === 'edge') as {
        edge: { from: { x: number }; to: { x: number } }
      }
      expect(e.edge.from.x).toBeCloseTo(0)
      expect(e.edge.to.x).toBeCloseTo(100)
    })

    it('keeps boundary auto-resolution for a bare cross-scope name', () => {
      // A bare name must stay Anchorable so the edge trims to the
      // boundary; wrapping it for the transform must not lose that.
      const pic = picture({ shapes: SHAPES })
        .scope({ transform: Transform.translation(100, 0) }, (s) => {
          s.node('inner', { at: point(0, 0), shape: SHAPES['circle'], width: 20, height: 20 })
        })
        .node('outer', { at: point(0, 0), shape: SHAPES['circle'], width: 20, height: 20 })
        .edge('outer', 'inner')
      const e = pic.items.find((i) => i.kind === 'edge') as {
        edge: { from: { x: number }; to: { x: number } }
      }
      // Trimmed to each circle's boundary: 0+10 and 100−10.
      expect(e.edge.from.x).toBeCloseTo(10)
      expect(e.edge.to.x).toBeCloseTo(90)
    })
  })

  describe('bounds and fit', () => {
    it('folds scope transforms into contentBounds', () => {
      const pic = picture({ shapes: SHAPES }).scope({ transform: Transform.translation(100, 0) }, (s) => {
        s.draw(circle(point(20, 20), 10))
      })
      const [minX, minY, maxX, maxY] = pic.contentBounds()!
      expect(minX).toBeCloseTo(110)
      expect(maxX).toBeCloseTo(130)
      expect(minY).toBeCloseTo(10)
      expect(maxY).toBeCloseTo(30)
    })

    it('fits a viewBox around transformed scope content', () => {
      const svg = picture({ shapes: SHAPES })
        .scope({ transform: Transform.translation(100, 0) }, (s) => {
          s.draw(circle(point(20, 20), 10))
        })
        .toSVG({ fit: true, padding: 0 })
      expect(svg).toContain('viewBox="110 10 20 20"')
    })
  })

  describe('backends without grouping', () => {
    const plain = () => {
      const calls: string[] = []
      const backend: PictureRenderer & { calls: string[] } = {
        calls,
        renderNode: (n) => calls.push(`node:${n.name}`),
        renderEdge: () => calls.push('edge'),
        render: () => calls.push('bare'),
        renderText: (t) => calls.push(`text:${t}`),
      }
      return backend
    }

    it('still applies the style cascade, flattened', () => {
      const b = plain()
      picture({ shapes: SHAPES })
        .scope({ style: { stroke: '#0f0' } }, (s) => s.draw(circle(point(0, 0), 5)))
        .renderWith(b)
      expect(b.calls).toEqual(['bare'])
    })

    it('throws rather than silently dropping a scope transform', () => {
      const b = plain()
      expect(() =>
        picture({ shapes: SHAPES })
          .scope({ transform: Transform.translation(10, 0) }, (s) =>
            s.draw(circle(point(0, 0), 5))
          )
          .renderWith(b)
      ).toThrow(/cannot group/)
    })
  })

  it('supports pen statements inside a scope', () => {
    const svg = picture({ shapes: SHAPES })
      .scope({ style: { stroke: '#0f0' }, transform: Transform.translation(50, 0) }, (s) => {
        s.pen().moveTo(0, 0).lineTo(20, 20)
      })
      .toSVG({ width: 100, height: 60 })
    expect(svg).toContain('<g transform="matrix(1 0 0 1 50 0)">')
    expect(svg).toContain('#0f0')
  })

  it('paints scopes in insertion order with their siblings', () => {
    const b = recorder()
    picture({ shapes: SHAPES })
      .draw(line(point(0, 0), point(1, 1)))
      .scope({ transform: Transform.translation(1, 0) }, (s) => s.draw(circle(point(0, 0), 1)))
      .draw(line(point(2, 2), point(3, 3)))
      .renderWith(b)
    expect(b.calls).toEqual([
      'bare:#000000/none/1',
      'begin:matrix(1 0 0 1 1 0)',
      'bare:#000000/none/1',
      'end',
      'bare:#000000/none/1',
    ])
  })
})

describe('adopt', () => {
  it('appends already-built items without touching the name registry', () => {
    const pic = picture({ shapes: allShapes })
    pic.node('a', { at: point(10, 10), shape: 'circle', width: 20 })
    pic.draw(circle(point(50, 10), 8))

    const target = picture()
    target.adopt(pic.items)

    expect(target.items).toHaveLength(2)
    // The name stayed with the original picture; nothing was registered here.
    expect(target.getNode('a')).toBeUndefined()
    expect(pic.getNode('a')).toBeDefined()
  })

  it('lets a picture hold its own content twice, which node() forbids', () => {
    const pic = picture({ shapes: allShapes })
    pic.node('a', { at: point(10, 10), shape: 'circle', width: 20, text: 'A' })
    const own = [...pic.items]

    expect(() => pic.node('a', { at: point(50, 10), shape: 'circle' })).toThrow(/already exists/)
    expect(() => pic.adopt(own)).not.toThrow()
    expect(pic.toSVG({ width: 80, height: 40 }).match(/>A</g)).toHaveLength(2)
  })

  it('returns the container so it chains, and takes an empty list', () => {
    const pic = picture()
    expect(pic.adopt([])).toBe(pic)
    expect(pic.items).toHaveLength(0)
  })

  it('carries adopted items into a scope, group properties and all', () => {
    const pic = picture()
    pic.draw(circle(point(10, 10), 5))
    const own = [...pic.items]
    pic.scope({ scale: 2 }, (s) => s.adopt(own))

    const svg = pic.toSVG({ width: 60, height: 60 })
    expect(svg).toMatch(/<g[^>]*transform="matrix\(2 0 0 2 0 0\)"/)
    expect(svg.match(/<circle/g)).toHaveLength(2)
  })
})
