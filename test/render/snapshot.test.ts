import { describe, it, expect, afterEach } from 'vitest'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { fillPatterns } from '../../src/render/patterns'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { line } from '../../src/geometry/Line'
import { rect } from '../../src/geometry/Rectangle'
import { polygon } from '../../src/geometry/Polygon'
import { path } from '../../src/path/Path'
import { snakePath } from '../../src/path/PathDecorations'
import { rectNode, circleNode, node } from '../../src/node/Node'
import { edge } from '../../src/node/Edge'
import { } from '../../src/node/Node'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes
/**
 * Snapshot safety net for the rendering pipeline.
 *
 * Every scene renders exclusively through SVGRenderer / Picture and is
 * serialized with toSVG() — no DOM, no mocks, no bypass helpers — so
 * refactors are guarded against silent output changes. If a snapshot
 * needs to change, that change must be intentional and reviewed: it
 * almost always means a visible rendering difference.
 *
 * Coverage: bare geometry, nodes, edges (auto + named anchors), path
 * decorations, dash styles, fill patterns, gradients, drop shadows,
 * layers, double lines, double-line paths, every shape in allShapes via
 * the node dispatch, KaTeX (stubbed), and one full picture({ shapes: SHAPES }) scene.
 */

function render(
  viewBox: { width: number; height: number },
  draw: (r: SVGRenderer) => void
): string {
  const renderer = new SVGRenderer()
  draw(renderer)
  return renderer.toSVG(viewBox)
}

afterEach(() => {
  // In case a test installed a katex stub
  delete (globalThis as Record<string, unknown>).katex
})

describe('snapshot: bare geometry', () => {
  it('renders circle + line + rect', () => {
    const svg = render({ width: 150, height: 150 }, (r) => {
      r.renderCircle(circle(point(50, 50), 20))
      r.renderLine(line(point(0, 0), point(100, 100)))
      r.renderRect(rect(80, 10, 40, 20))
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: node with text', () => {
  it('renders a rectangle node with centered text', () => {
    const svg = render({ width: 150, height: 100 }, (r) => {
      r.renderNode(
        rectNode({ at: point(60, 40), width: 80, height: 40, text: 'Hello' })
      )
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: node-to-node edge', () => {
  it('renders an edge with stealth arrow between two circles', () => {
    const svg = render({ width: 200, height: 100 }, (r) => {
      const a = circleNode({ at: point(30, 50), width: 30, height: 30, text: 'A' })
      const b = circleNode({ at: point(150, 50), width: 30, height: 30, text: 'B' })
      r.renderNode(a)
      r.renderNode(b)
      r.renderEdge(edge(a, b, { arrowEnd: 'stealth' }))
    })
    expect(svg).toMatchSnapshot()
  })

  it('arrowheads follow the edge stroke color', () => {
    const svg = render({ width: 200, height: 60 }, (r) => {
      const a = circleNode({ at: point(30, 30), width: 30, height: 30 })
      const b = circleNode({ at: point(170, 30), width: 30, height: 30 })
      r.renderEdge(edge(a, b, { arrowEnd: 'stealth' }), {
        style: { stroke: '#dc2626', strokeWidth: 2 },
      })
    })
    expect(svg).toContain('arrow-stealth-dc2626')
    expect(svg).toMatchSnapshot()
  })
  it('start markers use separate pre-mirrored defs (no auto-start-reverse)', () => {
    const svg = render({ width: 200, height: 60 }, (r) => {
      const a = circleNode({ at: point(30, 30), width: 30, height: 30 })
      const b = circleNode({ at: point(170, 30), width: 30, height: 30 })
      r.renderEdge(edge(a, b, { arrowEnd: '<->' }), {
        style: { stroke: '#7c3aed', strokeWidth: 1.5 },
      })
    })
    expect(svg).toContain('marker-end="url(#arrow-to-7c3aed)"')
    expect(svg).toContain('marker-start="url(#arrow-to-start-7c3aed)"')
    expect(svg).not.toContain('auto-start-reverse')
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: named-anchor edge', () => {
  it('pins endpoints to north/south anchors (screen convention)', () => {
    // A below B; edge leaves A's visual TOP (north) and arrives at B's
    // visual BOTTOM (south). Locks in the screen anchor convention.
    const svg = render({ width: 120, height: 200 }, (r) => {
      const a = rectNode({ at: point(60, 160), width: 60, height: 40, text: 'A' })
      const b = circleNode({ at: point(60, 40), width: 40, height: 40, text: 'B' })
      r.renderNode(a)
      r.renderNode(b)
      r.renderEdge(
        edge(a, b, { fromAnchor: 'north', toAnchor: 'south', label: 'up', arrowEnd: 'stealth' })
      )
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: decorated path', () => {
  it('renders a snake-decorated path', () => {
    const base = path().moveTo(point(10, 50)).lineTo(point(190, 50))
    const snake = snakePath(base, { amplitude: 8, wavelength: 20 })
    const svg = render({ width: 200, height: 100 }, (r) => {
      r.renderPath(snake)
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: styled polygon', () => {
  it('renders a polygon with stroke and dashed pattern', () => {
    const p = polygon([
      point(50, 20),
      point(90, 50),
      point(70, 90),
      point(30, 90),
      point(10, 50),
    ])
    const svg = render({ width: 120, height: 120 }, (r) => {
      r.renderPolygon(p, {
        style: { stroke: '#333', strokeWidth: 2, fill: '#eef', dash: 'dashed' },
      })
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: fill pattern', () => {
  it('renders a rect filled with north east lines', () => {
    const svg = render({ width: 140, height: 90 }, (r) => {
      r.renderRect(rect(10, 10, 120, 70), {
        style: { stroke: '#334155', fillPattern: fillPatterns['north east lines'] },
      })
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: gradient and shadow', () => {
  it('renders a linear-gradient rect and a shadowed circle', () => {
    const svg = render({ width: 220, height: 100 }, (r) => {
      r.renderRect(rect(10, 20, 90, 60), {
        style: {
          stroke: '#111827',
          gradient: {
            type: 'linear',
            angle: 45,
            stops: [
              { offset: 0, color: '#0ea5e9' },
              { offset: 1, color: '#a855f7' },
            ],
          },
        },
      })
      r.renderCircle(circle(point(170, 50), 30), {
        style: {
          fill: '#fde047',
          stroke: '#ca8a04',
          dropShadow: { blur: 4, offsetX: 3, offsetY: 3 },
        },
      })
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: layers', () => {
  it('renders background/main/foreground in defined order', () => {
    const svg = render({ width: 100, height: 100 }, (r) => {
      r.defineLayers(['background', 'main', 'foreground'])
      r.setLayer('background')
      r.renderRect(rect(0, 0, 100, 100), { style: { fill: '#f1f5f9', stroke: 'none' } })
      r.onLayer('foreground', () => {
        r.renderCircle(circle(point(50, 50), 20), {
          style: { fill: '#fecaca', stroke: '#dc2626' },
        })
      })
      // main is the default layer
      r.renderCircle(circle(point(50, 50), 35), {
        style: { fill: '#bfdbfe', stroke: '#2563eb' },
      })
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: double lines', () => {
  it('renders a double-stroked line and path', () => {
    const svg = render({ width: 200, height: 100 }, (r) => {
      r.renderLine(line(point(10, 20), point(190, 20)), {
        style: { stroke: '#111827', strokeWidth: 1, doubleLine: true },
      })
      r.renderPath(
        path()
          .moveTo(point(10, 70))
          .curveTo(point(70, 30), point(130, 110), point(190, 70)),
        { style: { stroke: '#7c3aed', strokeWidth: 1, doubleLine: { spacing: 4 } } }
      )
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: all node shapes', () => {
  it('renders every entry of allShapes through the node dispatch', () => {
    const cols = 6
    const cellW = 90
    const cellH = 70
    const names = Object.keys(SHAPES) as (keyof typeof SHAPES)[]
    const rows = Math.ceil(names.length / cols)
    const svg = render(
      { width: cols * cellW + 20, height: rows * cellH + 20 },
      (r) => {
        names.forEach((name, i) => {
          const cx = 10 + (i % cols) * cellW + cellW / 2
          const cy = 10 + Math.floor(i / cols) * cellH + cellH / 2
          r.renderNode(
            node({ at: point(cx, cy), shape: SHAPES[name], width: 60, height: 44 }),
            { style: { stroke: '#334155', fill: '#e0e7ff', strokeWidth: 1.5 } }
          )
        })
      }
    )
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: KaTeX math', () => {
  it('embeds KaTeX HTML in a foreignObject (stubbed katex, no DOM)', () => {
    ;(globalThis as Record<string, unknown>).katex = {
      renderToString: (tex: string, opts?: { displayMode?: boolean }) =>
        `<span class="katex-stub" data-display="${opts?.displayMode ?? false}">${tex}</span>`,
    }
    const svg = render({ width: 120, height: 60 }, (r) => {
      r.renderText('$x^2$', point(60, 30))
    })
    expect(svg).toContain('foreignObject')
    expect(svg).toContain('katex-stub')
    expect(svg).toMatchSnapshot()
  })

  it('falls back to plain text when katex is absent', () => {
    const svg = render({ width: 120, height: 60 }, (r) => {
      r.renderText('$x^2$', point(60, 30))
    })
    expect(svg).not.toContain('foreignObject')
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: full picture', () => {
  it('renders nodes, named-anchor edges, and bare geometry in one scene', () => {
    const svg = picture({ shapes: SHAPES })
      .draw(circle(point(200, 60), 16), { style: { stroke: '#94a3b8', dash: 'dotted' } })
      .node('A', { at: point(50, 60), shape: SHAPES['circle'], width: 44, height: 44, text: 'A' })
      .node('B', { at: point(200, 60), shape: SHAPES['rectangle'], width: 70, height: 40, text: 'B' })
      .node('C', { at: point(125, 150), shape: SHAPES['diamond'], width: 70, height: 50, text: 'C' })
      .edge('A', 'B', { arrowEnd: 'stealth', label: 'ab' })
      .edge('A.south', 'C.west', { arrowEnd: 'latex' })
      .edge('C.east', 'B.south', { arrowEnd: 'to', style: { stroke: '#2563eb' } })
      .toSVG({ width: 260, height: 190 })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: auto-sized node', () => {
  it('sizes the shape to fit its text (font-metrics measurement)', () => {
    // No width/height supplied — the node measures its own text.
    const svg = render({ width: 120, height: 60 }, (r) => {
      r.renderNode(
        node({ at: point(60, 30), shape: SHAPES['rectangle'], text: 'auto' }),
        { style: { stroke: '#334155', fill: '#f1f5f9' } }
      )
    })
    expect(svg).toMatchSnapshot()
  })
})

describe('snapshot: composed scene', () => {
  it('renders multiple primitives + a decorated path in one view', () => {
    const svg = render({ width: 200, height: 150 }, (r) => {
      r.renderRect(rect(10, 10, 60, 40), {
        style: { stroke: '#333', fill: 'none' },
      })
      r.renderCircle(circle(point(120, 30), 15), {
        style: { stroke: '#c33', strokeWidth: 2 },
      })
      r.renderPath(
        path()
          .moveTo(point(40, 50))
          .lineTo(point(120, 50))
          .curveTo(point(70, 90), point(90, 90), point(120, 50))
      )
    })
    expect(svg).toMatchSnapshot()
  })
})
