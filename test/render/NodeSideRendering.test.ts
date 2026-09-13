import { describe, it, expect } from 'vitest'
import { fillPatterns } from '../../src/render/patterns'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { rect } from '../../src/geometry/Rectangle'
import { rectNode, circleNode } from '../../src/node/Node'
import { edge } from '../../src/node/Edge'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

/**
 * Stage 4 flagship: the library renders to an SVG string in pure Node
 * with zero runtime dependencies — no SVG.js, no jsdom, no DOM at all.
 *
 * These tests exercise the complete codepath — including the previously
 * DOM-only features (patterns, gradients, drop shadows, clip paths) —
 * by asking for a string and verifying the output looks right.
 */

describe('Node-side rendering: zero-dependency toSVG()', () => {
  it('renders bare geometry to a valid SVG string', () => {
    const r = new SVGRenderer()
    r.renderCircle(circle(point(50, 50), 20))
    r.renderRect(rect(10, 10, 30, 30))
    const svg = r.toSVG({ width: 100, height: 100 })

    expect(svg).toContain('<svg')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 100 100"')
    expect(svg).toContain('<circle')
    expect(svg).toContain('<rect')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('renders a node + edge scene to a string', () => {
    const r = new SVGRenderer()
    const a = circleNode({ at: point(30, 50), width: 30, height: 30, text: 'A' })
    const b = rectNode({ at: point(150, 50), width: 50, height: 30, text: 'B' })
    r.renderNode(a)
    r.renderNode(b)
    r.renderEdge(edge(a, b, { arrowEnd: 'stealth' }))
    const svg = r.toSVG({ width: 200, height: 100 })

    expect(svg).toContain('<defs>')
    expect(svg).toContain('arrow-stealth-000000')
    // Two <g> groups for nodes + one for the edge.
    const groups = svg.match(/<g>/g) ?? []
    expect(groups.length).toBeGreaterThanOrEqual(3)
    expect(svg).toContain('>A</text>')
    expect(svg).toContain('>B</text>')
    expect(svg).toContain('marker-end="url(#arrow-stealth-000000)"')
  })

  it('renders a fill pattern entirely in Node (was DOM-only before Stage 4)', () => {
    const r = new SVGRenderer()
    r.renderRect(rect(0, 0, 100, 60), {
      style: {
        fillPattern: { pattern: fillPatterns['north east lines'], color: '#333' },
        stroke: '#000',
      },
    })
    const svg = r.toSVG({ width: 100, height: 100 })

    // A <pattern> def should have been emitted, and the rect's fill
    // should reference its generated id via url(...).
    expect(svg).toContain('<pattern')
    expect(svg).toContain('patternUnits="userSpaceOnUse"')
    const fillMatch = svg.match(/fill="url\(#([^)]+)\)"/)
    expect(fillMatch).not.toBeNull()
    // The referenced id should also appear as a <pattern id="..."> def.
    expect(svg).toContain(`id="${fillMatch![1]}"`)
  })

  it('renders a linear gradient entirely in Node', () => {
    const r = new SVGRenderer()
    r.renderRect(rect(0, 0, 100, 60), {
      style: {
        gradient: {
          type: 'linear',
          angle: 45,
          stops: [
            { offset: 0, color: '#000' },
            { offset: 1, color: '#fff' },
          ],
        },
      },
    })
    const svg = r.toSVG({ width: 100, height: 100 })

    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('<stop')
    const fillMatch = svg.match(/fill="url\(#([^)]+)\)"/)
    expect(fillMatch).not.toBeNull()
  })

  it('renders a drop shadow entirely in Node', () => {
    const r = new SVGRenderer()
    r.renderCircle(circle(point(50, 50), 30), {
      style: {
        dropShadow: { blur: 4, offsetX: 2, offsetY: 2, color: '#000' },
        fill: '#c00',
      },
    })
    const svg = r.toSVG({ width: 100, height: 100 })

    expect(svg).toContain('<filter')
    expect(svg).toContain('<feGaussianBlur')
    expect(svg).toContain('<feOffset')
    expect(svg).toContain('<feMerge')
    const filterMatch = svg.match(/filter="url\(#([^)]+)\)"/)
    expect(filterMatch).not.toBeNull()
  })

  it('renders a clip path entirely in Node', () => {
    const r = new SVGRenderer()
    r.renderRect(rect(0, 0, 100, 60), {
      style: {
        clip: { shape: 'circle', cx: 50, cy: 30, r: 25 },
      },
    })
    const svg = r.toSVG({ width: 100, height: 100 })

    expect(svg).toContain('<clipPath')
    const clipMatch = svg.match(/clip-path="url\(#([^)]+)\)"/)
    expect(clipMatch).not.toBeNull()
  })
})
