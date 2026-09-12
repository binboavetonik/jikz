import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'

describe('Picture', () => {
  describe('node registry', () => {
    it('registers a node by name and makes it available via getNode', () => {
      const pic = picture()
        .node('A', { at: point(10, 20), shape: 'rectangle', width: 30, height: 20 })

      const a = pic.getNode('A')
      expect(a).toBeDefined()
      expect(a!.name).toBe('A')
      expect(a!.center.x).toBe(10)
      expect(a!.center.y).toBe(20)
    })

    it('returns undefined for an unknown node', () => {
      const pic = picture()
      expect(pic.getNode('ghost')).toBeUndefined()
    })

    it('throws on duplicate node names', () => {
      const pic = picture().node('A', { at: point(0, 0) })
      expect(() => pic.node('A', { at: point(10, 10) })).toThrow(/already exists/)
    })

    it('exposes the list of registered names', () => {
      const pic = picture()
        .node('A', { at: point(0, 0) })
        .node('B', { at: point(20, 0) })
      expect(pic.names).toEqual(['A', 'B'])
    })

    it('Picture name overrides any NodeOptions.name if passed', () => {
      const pic = picture().node('A', { at: point(0, 0) })
      // The registry name is authoritative; the Node gets it.
      expect(pic.getNode('A')!.name).toBe('A')
    })
  })

  describe('resolve()', () => {
    const pic = picture()
      .node('A', {
        at: point(100, 100),
        shape: 'rectangle',
        width: 80,
        height: 40,
      })
      .node('B', {
        at: point(200, 100),
        shape: 'circle',
        width: 40,
        height: 40,
      })

    it('"A" resolves to the center', () => {
      const p = pic.resolve('A')
      expect(p.x).toBe(100)
      expect(p.y).toBe(100)
    })

    it('"A.center" resolves to the center', () => {
      const p = pic.resolve('A.center')
      expect(p.x).toBe(100)
      expect(p.y).toBe(100)
    })

    it('"A.north" resolves via the named cardinal (screen convention)', () => {
      // Matches node.anchor('north') — rect of 80×40 centered at (100, 100):
      // 'north' is the visual top edge midpoint, y = 100 − 20 = 80.
      const p = pic.resolve('A.north')
      expect(p.x).toBeCloseTo(100)
      expect(p.y).toBeCloseTo(80)
    })

    it('"A.north east" accepts multi-word anchor specs (first dot splits)', () => {
      const p = pic.resolve('A.north east')
      expect(p.x).toBeCloseTo(140) // cx + halfW
      expect(p.y).toBeCloseTo(80) // cy − halfH (visual top-right corner)
    })

    it('"A.45" resolves a numeric angle', () => {
      const p = pic.resolve('A.45')
      // Boundary of 80×40 rect in direction 45° from center.
      expect(p.x).toBeGreaterThan(100)
      expect(p.y).toBeGreaterThan(100)
    })

    it('"B.45" on a circle uses circle.pointAt', () => {
      // Circle at (200, 100) r=20. pointAt(45) = (cx+r*cos, cy+r*sin).
      const p = pic.resolve('B.45')
      const expected = 200 + 20 * Math.cos(Math.PI / 4)
      expect(p.x).toBeCloseTo(expected)
    })

    it('throws on unknown node name with a helpful list', () => {
      expect(() => pic.resolve('ghost')).toThrow(/unknown node "ghost"/)
      expect(() => pic.resolve('ghost')).toThrow(/"A", "B"/)
    })
  })

  describe('edges', () => {
    const mk = () =>
      picture()
        .node('A', { at: point(0, 0), shape: 'circle', width: 30, height: 30 })
        .node('B', { at: point(100, 0), shape: 'circle', width: 30, height: 30 })

    it('edge("A", "B") boundary-resolves through both nodes (auto)', () => {
      const pic = mk().edge('A', 'B')
      const edge = pic.items.find((i) => i.kind === 'edge')!
      // @ts-expect-error — narrowing in test
      expect(edge.edge.from.x).toBeCloseTo(15) // A's east boundary
      // @ts-expect-error
      expect(edge.edge.to.x).toBeCloseTo(85) // B's west boundary
    })

    it('edge("A.north", "B.south") resolves immediately to fixed points', () => {
      const pic = mk().edge('A.north', 'B.south')
      const edge = pic.items.find((i) => i.kind === 'edge')!
      // @ts-expect-error
      expect(edge.edge.from.y).toBeCloseTo(-15) // A north: visual top, −y
      // @ts-expect-error
      expect(edge.edge.to.y).toBeCloseTo(15) // B south: visual bottom, +y
    })

    it('edge accepts raw points', () => {
      const pic = picture().edge(point(0, 0), point(100, 50))
      const edge = pic.items.find((i) => i.kind === 'edge')!
      // @ts-expect-error
      expect(edge.edge.from.x).toBe(0)
      // @ts-expect-error
      expect(edge.edge.to.y).toBe(50)
    })

    it('throws on unknown endpoint name', () => {
      const pic = mk()
      expect(() => pic.edge('ghost', 'B')).toThrow(/unknown node "ghost"/)
      expect(() => pic.edge('A', 'phantom')).toThrow(/unknown node "phantom"/)
    })
  })

  describe('bare-geometry verbs (path/draw/fill/filldraw)', () => {
    it('text() adds centered bare text (TikZ \\node at (x,y) {…})', () => {
      const svg = picture()
        .text(point(50, 30), 'hello')
        .toSVG({ width: 100, height: 60 })
      expect(svg).toContain('>hello</text>')
      expect(svg).toContain('text-anchor="middle"')
      expect(svg).toContain('dominant-baseline="middle"')
      expect(svg).toContain('x="50"')
      expect(svg).toContain('y="30"')
    })

    it('records bare renderables in insertion order', () => {
      const pic = picture()
        .draw(circle(point(0, 0), 10))
        .node('A', { at: point(50, 0) })
      expect(pic.items.length).toBe(2)
      expect(pic.items[0]!.kind).toBe('bare')
      expect(pic.items[1]!.kind).toBe('node')
    })

    it('tags each verb with its TikZ-style path mode', () => {
      const pic = picture()
        .path(circle(point(0, 0), 10))
        .draw(circle(point(20, 0), 10))
        .fill(circle(point(40, 0), 10))
        .filldraw(circle(point(60, 0), 10))
      const modes = pic.items.map((i) =>
        i.kind === 'bare' ? i.mode : null
      )
      expect(modes).toEqual(['path', 'draw', 'fill', 'filldraw'])
    })

    it('draw() renders stroked with no fill', () => {
      const svg = picture()
        .draw(circle(point(50, 50), 20))
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('stroke="#000000"')
      expect(svg).toContain('fill="none"')
    })

    it('fill() renders filled with no stroke', () => {
      const svg = picture()
        .fill(circle(point(50, 50), 20))
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('stroke="none"')
      expect(svg).toContain('fill="#000000"')
    })

    it('filldraw() renders both stroke and fill', () => {
      const svg = picture()
        .filldraw(circle(point(50, 50), 20))
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('stroke="#000000"')
      expect(svg).toContain('fill="#000000"')
    })

    it('user style in options overrides the mode baseline', () => {
      // draw() baseline: stroke=black, fill=none. Overriding fill wins.
      const svg = picture()
        .draw(circle(point(50, 50), 20), { style: { fill: '#ff00ff' } })
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('fill="#ff00ff"')
    })

    it('shade() renders a gradient fill (TikZ \\shade)', () => {
      const svg = picture()
        .shade(circle(point(50, 50), 20), { leftColor: '#2563eb', rightColor: '#7c3aed' })
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('<linearGradient')
      expect(svg).toContain('fill="url(#jikz-gradient-linear')
      expect(svg).toContain('stroke="none"')
    })

    it('shade() supports ballColor and radial shadings', () => {
      const svg = picture()
        .shade(circle(point(50, 50), 20), { ballColor: '#dc2626' })
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('<radialGradient')
      expect(svg).toContain('fx="35%"')
      expect(svg).toContain('fill="url(#jikz-gradient-radial')
    })

    it('shade() accepts an explicit gradient spec', () => {
      const svg = picture()
        .shade(circle(point(50, 50), 20), {
          gradient: { type: 'radial', stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] },
        })
        .toSVG({ width: 100, height: 100 })
      expect(svg).toContain('<radialGradient')
    })
  })

  describe('toSVG() — end-to-end', () => {
    it('emits nodes, edges, and bare geometry in insertion order', () => {
      const svg = picture()
        .draw(circle(point(200, 50), 20))
        .node('A', {
          at: point(30, 50),
          shape: 'circle',
          width: 30,
          height: 30,
          text: 'A',
        })
        .node('B', {
          at: point(120, 50),
          shape: 'rectangle',
          width: 40,
          height: 30,
          text: 'B',
        })
        .edge('A', 'B.north', { arrowEnd: 'stealth' })
        .toSVG({ width: 250, height: 100 })

      expect(svg).toContain('>A</text>')
      expect(svg).toContain('>B</text>')
      // Marker ids are color-keyed: default stroke #000000 → …-000000
      expect(svg).toContain('marker-end="url(#arrow-stealth-000000)"')
      // The bare circle at (200, 50) r=20 should also appear.
      expect(svg).toContain('cx="200"')
      expect(svg).toContain('r="20"')
    })

    it('per-item render options override defaults', () => {
      const svg = picture()
        .node(
          'A',
          {
            at: point(50, 50),
            shape: 'circle',
            width: 40,
            height: 40,
          },
          { style: { stroke: '#ff00ff' } }
        )
        .toSVG({ width: 100, height: 100 })

      expect(svg).toContain('stroke="#ff00ff"')
    })

    it('renders an empty picture without throwing', () => {
      const svg = picture().toSVG({ width: 10, height: 10 })
      // No items → no defs either: markers/patterns/gradients are all
      // defined lazily on first use now.
      expect(svg).toContain('<svg')
      expect(svg).not.toContain('<defs>')
    })
  })
})
