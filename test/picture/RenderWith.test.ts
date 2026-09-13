/**
 * Backend decoupling: Picture.renderWith drives any PictureRenderer,
 * and renderables carry `kind`/`type` discriminator tags so dispatch
 * no longer relies on duck-typing (negative property checks).
 */
import { describe, it, expect } from 'vitest'
import { Point, point } from '../../src/core/Point'
import { line } from '../../src/geometry/Line'
import { circle } from '../../src/geometry/Circle'
import { picture } from '../../src/picture/Picture'
import { DEFAULT_LABEL_FONT_SIZE } from '../../src/node/Node'
import { measureText } from '../../src/text/measureText'
import type { PictureRenderer } from '../../src/picture/Picture'
import type { Renderable, RenderOptions, TextOptions } from '../../src/render/Renderer'
import { isLine, isCircle, isPoint, isEdge } from '../../src/render/Renderer'
import { Edge } from '../../src/node/Edge'
import type { Node } from '../../src/node/Node'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

/** A toy "backend" that records draw calls as strings. */
class RecordingRenderer implements PictureRenderer {
  readonly calls: string[] = []

  renderNode(node: Node): void {
    this.calls.push(`node:${node.name}:${node.shape.type}`)
  }
  renderEdge(_edge: Edge): void {
    this.calls.push('edge')
  }
  render(obj: Renderable, options?: RenderOptions): void {
    const style = options?.style as { stroke?: string; fill?: string } | undefined
    this.calls.push(`bare:${style?.stroke}/${style?.fill}`)
  }
  renderText(text: string, _at: Point, _options?: TextOptions): void {
    this.calls.push(`text:${text}`)
  }
}

describe('Picture.renderWith', () => {
  it('compiles through a non-SVG backend', () => {
    const backend = new RecordingRenderer()
    picture({ shapes: SHAPES })
      .node('A', { at: point(0, 0), shape: SHAPES['circle'], text: 'A' })
      .draw(circle(point(0, 0), 10))
      .fill(circle(point(20, 0), 5))
      .text(point(5, 5), 'hello')
      .edge('A', point(50, 50))
      .renderWith(backend)

    expect(backend.calls).toEqual([
      'node:A:circle',
      'bare:#000000/none', // draw baseline
      'bare:none/#000000', // fill baseline
      'text:hello',
      'edge',
    ])
  })

  it('returns the picture for chaining', () => {
    const pic = picture({ shapes: SHAPES }).node('A', { at: point(0, 0), text: 'A' })
    expect(pic.renderWith(new RecordingRenderer())).toBe(pic)
  })

  it('desugars node labels into renderText calls after their node', () => {
    const backend = new RecordingRenderer()
    picture({ shapes: SHAPES })
      .node('A', {
        at: point(100, 100),
        shape: SHAPES['circle'],
        width: 60,
        height: 60,
        text: 'A',
        labels: [{ text: 'top' }, { text: 'side', at: 'east' }],
      })
      .renderWith(backend)

    expect(backend.calls).toEqual([
      'node:A:circle',
      'text:top',
      'text:side',
    ])
  })

  it('places desugared labels outward from the node boundary', () => {
    const texts: { text: string; at: Point; options?: TextOptions }[] = []
    const backend: PictureRenderer = {
      renderNode: () => {},
      renderEdge: () => {},
      render: () => {},
      renderText: (text, at, options) => {
        texts.push({ text, at, options })
      },
    }
    picture({ shapes: SHAPES })
      .node('A', {
        at: point(100, 100),
        shape: SHAPES['circle'],
        width: 60,
        height: 60,
        labels: [{ text: 'L' }],
      })
      .renderWith(backend)

    expect(texts).toHaveLength(1)
    // Default label font size is applied (TikZ's `every label` equivalent)
    expect(texts[0]!.options?.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE)
    // Straight north: radius 30 + gap 4 + half the measured text height
    const m = measureText('L', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    expect(texts[0]!.at.x).toBeCloseTo(100)
    expect(texts[0]!.at.y).toBeCloseTo(100 - (30 + 4 + m.height / 2))
  })
})

describe('tag-based dispatch', () => {
  it('renderables carry discriminator tags', () => {
    expect(point(1, 2).kind).toBe('point')
    expect(line(point(0, 0), point(1, 1)).kind).toBe('line')
    expect(circle(point(0, 0), 5).type).toBe('circle')
  })

  it('tags win over structural collisions', () => {
    // An Edge structurally quacks like a Line (start/end + at()); the
    // kind tag must prevent misclassification.
    const e = new Edge(point(0, 0), point(10, 10))
    expect(isEdge(e)).toBe(true)
    expect(isLine(e)).toBe(false)
  })

  it('foreign structural objects still classify (legacy fallback)', () => {
    const fakePoint = { x: 1, y: 2, distanceTo: () => 0 }
    expect(isPoint(fakePoint)).toBe(true)

    const fakeCircle = {
      center: { x: 0, y: 0 },
      radius: 5,
      pointAt: () => ({}),
    }
    expect(isCircle(fakeCircle)).toBe(true)
  })
})
