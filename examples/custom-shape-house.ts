import { AnchoredPolygon, allShapes, defineShape, picture, point, type Point, type PointLike, type ShapeOptions } from 'jikz'

// A custom shape, the full TikZ-library workflow: declare vertices,
// get anchors/bounds/contains/SVG for free via AnchoredPolygon.
// defineShape turns the constructor into a shape kind; handing it to a
// picture makes 'house' usable by name — including boundary-resolving
// edges ('G' -- 'H' clips at the roofline).

class House extends AnchoredPolygon {
  readonly type = 'house'
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep = 4
  readonly outerSep = 2

  constructor(o: ShapeOptions = {}) {
    super()
    const c = o.center ?? { x: 0, y: 0 }
    this.center = point(c.x, c.y)
    this.width = o.width ?? 60
    this.height = o.height ?? 50
  }

  get vertices(): Point[] {
    const hw = this.width / 2, hh = this.height / 2
    const c = this.center
    return [
      point(c.x - hw, c.y + hh),  // bottom left
      point(c.x - hw, c.y),       // wall left
      point(c.x, c.y - hh),       // roof apex
      point(c.x + hw, c.y),       // wall right
      point(c.x + hw, c.y + hh),  // bottom right
    ]
  }

  /** TikZ-style named anchor: 'H.apex' hits the roof point. */
  protected override customAnchor(normalized: string): Point | null {
    return normalized === 'apex' ? this.vertices[2]! : null
  }

  moveTo(center: PointLike) { return new House({ center, width: this.width, height: this.height }) }
  resize(width: number, height: number) { return new House({ center: this.center, width, height }) }
}

// The shape as a value. No registration, no module augmentation: the
// picture that receives it knows the name, and misspellings are
// compile errors because the name comes from the object below.
const house = defineShape('house', (o: ShapeOptions) => new House(o))

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: { ...allShapes, house } })
  const st = { stroke: '#b45309', fill: '#fef3c7', strokeWidth: 2 }

  pic.node('H', { shape: 'house', at: point(100, 110), width: 70, height: 60, text: 'home', style: st })
  pic.node('G', { shape: 'circle', at: point(280, 130), width: 50, height: 50, text: 'G', style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 2 } })

  // edges resolve custom-shape boundaries AND the custom 'apex' anchor
  pic.edge('G', 'H', { arrowEnd: 'stealth', style: { stroke: '#64748b', strokeWidth: 1.4 } })
  pic.edge('G.north', 'H.apex', { arrowEnd: 'stealth', bendAngle: -20, style: { stroke: '#dc2626', dash: 'dashed', strokeWidth: 1.4 } })
  pic.text(point(210, 55), "'H.apex' — the custom anchor", { style: { fontSize: 10, fill: '#dc2626' } })

  pic.mount(container, { fit: true, padding: 14 })
}
