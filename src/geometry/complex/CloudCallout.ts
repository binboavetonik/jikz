import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../Shape'
import { DEFAULT_SHAPE_OPTIONS } from '../Shape'
import { degToRad } from '../../utils/math'

/**
 * Options specific to cloud callout shape
 */
export interface CloudCalloutOptions extends ShapeOptions {
  /**
   * Number of puffs around the cloud (default: 8)
   */
  puffs?: number

  /**
   * Angle where the callout points (default: 225 = bottom-left)
   */
  pointerAngle?: number

  /**
   * Distance of the pointer from the cloud (default: 30)
   */
  pointerDistance?: number

  /**
   * Number of thought bubbles (default: 3)
   */
  bubbleCount?: number
}

/**
 * A thought bubble cloud callout shape
 *
 * Visual:
 * ```
 *     .-~~~-.
 *   .'       '.
 *  /    ___    \
 * |   .'   '.   |
 *  \ /       \ /
 *   '~._____.~'
 *     o
 *    o
 *   o
 * ```
 */
export class CloudCallout implements Shape {
  readonly type = 'cloud callout' as const
  readonly center: Point
  readonly width: number
  readonly height: number
  readonly innerSep: number
  readonly outerSep: number
  readonly puffs: number
  readonly pointerAngle: number
  readonly pointerDistance: number
  readonly bubbleCount: number

  constructor(options: CloudCalloutOptions = {}) {
    const opts = { ...DEFAULT_SHAPE_OPTIONS, ...options }
    this.center = point(opts.center.x, opts.center.y)
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.puffs = Math.max(4, options.puffs ?? 8)
    this.pointerAngle = options.pointerAngle ?? 225
    this.pointerDistance = options.pointerDistance ?? 30
    this.bubbleCount = Math.max(1, options.bubbleCount ?? 3)

    this.width = Math.max(opts.width, opts.minWidth)
    this.height = Math.max(opts.height, opts.minHeight)
  }

  /**
   * Get the inner radii of the cloud. Multiplier leaves room for the
   * puffs so cloud + puffs stay inside the declared box.
   */
  private get innerRadii(): { rx: number; ry: number } {
    return {
      rx: this.width / 2 * 0.65,
      ry: this.height / 2 * 0.65,
    }
  }

  /** Unit vector along the pointer direction. */
  private get pointerDir(): { dx: number; dy: number } {
    const rad = degToRad(this.pointerAngle)
    return { dx: Math.cos(rad), dy: Math.sin(rad) }
  }

  /** Conservative outer radius of the cloud body (inner ellipse + puffs). */
  private get cloudOuter(): number {
    const { rx, ry } = this.innerRadii
    return Math.max(rx, ry) + this.puffRadius
  }

  /**
   * Pointer distance, clamped so cloud + bubble trail fit inside the
   * declared box along the pointer direction.
   */
  private get effectivePointerDistance(): number {
    const hw = this.width / 2
    const hh = this.height / 2
    const { dx, dy } = this.pointerDir
    const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity
    const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity
    const tBox = Math.min(tx, ty)
    const startDist = this.cloudOuter - this.puffRadius * 0.5
    const bubblePad = Math.max(this.puffRadius * 0.5, 3)
    const maxPd = 2 * tBox - this.cloudOuter - startDist - bubblePad
    return Math.max(0, Math.min(this.pointerDistance, maxPd))
  }

  /** Distance from the cloud center to the pointer tip. */
  private get tipDistance(): number {
    return this.cloudOuter - this.puffRadius * 0.5 + this.effectivePointerDistance
  }

  /**
   * Where the cloud body is drawn. Computed numerically: measure the
   * actual extent (cloud cardinal extremes, tip, every bubble with its
   * radius) relative to `at`, then shift by the negation of the bbox
   * center — so the total extent is centered on `at`. Mirrors the
   * `bounds` computation, which stays translation-invariant.
   * The `center` property itself stays at `at`.
   */
  private get cloudCenter(): Point {
    const { rx, ry } = this.innerRadii
    const puffR = this.puffRadius
    const rad = degToRad(this.pointerAngle)
    const dx = Math.cos(rad)
    const dy = Math.sin(rad)
    const cx = this.center.x
    const cy = this.center.y

    const pts: { x: number; y: number; r: number }[] = [
      { x: cx - (rx + puffR), y: cy, r: 0 },
      { x: cx + (rx + puffR), y: cy, r: 0 },
      { x: cx, y: cy - (ry + puffR), r: 0 },
      { x: cx, y: cy + (ry + puffR), r: 0 },
      { x: cx + this.tipDistance * dx, y: cy + this.tipDistance * dy, r: 0 },
    ]

    // Bubbles, same formula as the `bubbles` getter but relative to `at`
    const startDist = Math.max(rx, ry) + puffR * 0.5
    const step = this.effectivePointerDistance / (this.bubbleCount + 1)
    for (let i = 0; i < this.bubbleCount; i++) {
      const dist = startDist + step * (i + 1)
      pts.push({
        x: cx + dist * dx,
        y: cy + dist * dy,
        r: Math.max(puffR * (0.5 - i * 0.1), 3),
      })
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x - p.r)
      minY = Math.min(minY, p.y - p.r)
      maxX = Math.max(maxX, p.x + p.r)
      maxY = Math.max(maxY, p.y + p.r)
    }

    return point(
      cx - ((minX + maxX) / 2 - cx),
      cy - ((minY + maxY) / 2 - cy)
    )
  }

  /**
   * Get the puff radius
   */
  private get puffRadius(): number {
    const { rx, ry } = this.innerRadii
    const avgRadius = (rx + ry) / 2
    return avgRadius * 0.4
  }

  /**
   * Get the thought bubbles (small circles leading to pointer)
   */
  get bubbles(): Array<{ center: Point; radius: number }> {
    const bubbles: Array<{ center: Point; radius: number }> = []
    const rad = degToRad(this.pointerAngle)
    const { rx, ry } = this.innerRadii
    const puffR = this.puffRadius
    const cc = this.cloudCenter

    // Start position (on cloud edge)
    const startDist = Math.max(rx, ry) + puffR * 0.5
    const totalDist = this.effectivePointerDistance
    const step = totalDist / (this.bubbleCount + 1)

    for (let i = 0; i < this.bubbleCount; i++) {
      const dist = startDist + step * (i + 1)
      const size = puffR * (0.5 - i * 0.1) // Decreasing size
      bubbles.push({
        center: point(
          cc.x + dist * Math.cos(rad),
          cc.y + dist * Math.sin(rad)
        ),
        radius: Math.max(size, 3),
      })
    }

    return bubbles
  }

  /**
   * Get the final pointer tip
   */
  get pointerTip(): Point {
    const rad = degToRad(this.pointerAngle)
    const cc = this.cloudCenter
    return point(
      cc.x + this.tipDistance * Math.cos(rad),
      cc.y + this.tipDistance * Math.sin(rad)
    )
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()
      const sep = this.outerSep
      const totalR = this.cloudOuter
      const cc = this.cloudCenter

      switch (normalized) {
        case 'center':
        case 'c':
          return this.center
        case 'pointer':
        case 'tip':
          return this.pointerTip
        case 'north':
        case 'n':
          return point(cc.x, cc.y - totalR - sep)
        case 'south':
        case 's':
          return point(cc.x, cc.y + totalR + sep)
        case 'east':
        case 'e':
          return point(cc.x + totalR + sep, cc.y)
        case 'west':
        case 'w':
          return point(cc.x - totalR - sep, cc.y)
        case 'north east':
        case 'ne':
          return point(cc.x + totalR * 0.707 + sep * 0.7, cc.y - totalR * 0.707 - sep * 0.7)
        case 'north west':
        case 'nw':
          return point(cc.x - totalR * 0.707 - sep * 0.7, cc.y - totalR * 0.707 - sep * 0.7)
        case 'south east':
        case 'se':
          return point(cc.x + totalR * 0.707 + sep * 0.7, cc.y + totalR * 0.707 + sep * 0.7)
        case 'south west':
        case 'sw':
          return point(cc.x - totalR * 0.707 - sep * 0.7, cc.y + totalR * 0.707 + sep * 0.7)
      }

      // Bubble anchors
      if (normalized.startsWith('bubble ')) {
        const idx = parseInt(normalized.slice(7), 10) - 1
        const bubbles = this.bubbles
        if (idx >= 0 && idx < bubbles.length) {
          return bubbles[idx]!.center
        }
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle)
    const { rx, ry } = this.innerRadii
    const puffR = this.puffRadius
    const cc = this.cloudCenter
    // Approximate with ellipse + puff radius
    const r = Math.sqrt((rx * Math.cos(rad)) ** 2 + (ry * Math.sin(rad)) ** 2) + puffR
    return point(cc.x + r * Math.cos(rad), cc.y + r * Math.sin(rad))
  }

  get north(): Point { return this.anchor('north') }
  get south(): Point { return this.anchor('south') }
  get east(): Point { return this.anchor('east') }
  get west(): Point { return this.anchor('west') }
  get northEast(): Point { return this.anchor('north east') }
  get northWest(): Point { return this.anchor('north west') }
  get southEast(): Point { return this.anchor('south east') }
  get southWest(): Point { return this.anchor('south west') }

  contains(p: PointLike): boolean {
    // Check main cloud (approximate as ellipse)
    const { rx, ry } = this.innerRadii
    const cc = this.cloudCenter
    const dx = p.x - cc.x
    const dy = p.y - cc.y
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) return true

    // Check bubbles
    for (const bubble of this.bubbles) {
      const bdx = p.x - bubble.center.x
      const bdy = p.y - bubble.center.y
      if (bdx * bdx + bdy * bdy <= bubble.radius * bubble.radius) return true
    }

    return false
  }

  get bounds(): [number, number, number, number] {
    const { rx, ry } = this.innerRadii
    const puffR = this.puffRadius
    const tip = this.pointerTip
    const cc = this.cloudCenter

    let minX = cc.x - rx - puffR
    let minY = cc.y - ry - puffR
    let maxX = cc.x + rx + puffR
    let maxY = cc.y + ry + puffR

    // Include bubbles and tip
    for (const bubble of this.bubbles) {
      minX = Math.min(minX, bubble.center.x - bubble.radius)
      minY = Math.min(minY, bubble.center.y - bubble.radius)
      maxX = Math.max(maxX, bubble.center.x + bubble.radius)
      maxY = Math.max(maxY, bubble.center.y + bubble.radius)
    }

    minX = Math.min(minX, tip.x)
    minY = Math.min(minY, tip.y)
    maxX = Math.max(maxX, tip.x)
    maxY = Math.max(maxY, tip.y)

    return [minX, minY, maxX, maxY]
  }

  moveTo(center: PointLike): CloudCallout {
    return new CloudCallout({
      center,
      width: this.width,
      height: this.height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      puffs: this.puffs,
      pointerAngle: this.pointerAngle,
      pointerDistance: this.pointerDistance,
      bubbleCount: this.bubbleCount,
    })
  }

  resize(width: number, height: number): CloudCallout {
    return new CloudCallout({
      center: this.center,
      width,
      height,
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      puffs: this.puffs,
      pointerAngle: this.pointerAngle,
      pointerDistance: this.pointerDistance,
      bubbleCount: this.bubbleCount,
    })
  }

  toSVGPath(): string {
    const { rx, ry } = this.innerRadii
    const puffR = this.puffRadius
    const cc = this.cloudCenter
    const cx = cc.x
    const cy = cc.y
    const n = this.puffs

    // Cloud puffs
    const angleStep = (2 * Math.PI) / n
    const puffCenters: Point[] = []

    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2
      puffCenters.push(point(
        cx + rx * Math.cos(angle),
        cy + ry * Math.sin(angle)
      ))
    }

    // Calculate connection points between adjacent puffs
    const connections: Point[] = []
    for (let i = 0; i < n; i++) {
      const c1 = puffCenters[i]!
      const c2 = puffCenters[(i + 1) % n]!
      const midX = (c1.x + c2.x) / 2
      const midY = (c1.y + c2.y) / 2
      const dx = midX - cx
      const dy = midY - cy
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        const avgR = (rx + ry) / 2
        const factor = (avgR + puffR * 0.6) / len
        connections.push(point(cx + dx * factor, cy + dy * factor))
      } else {
        connections.push(point(midX, midY))
      }
    }

    // Build cloud path with arcs
    let cloudPath = `M ${connections[0]!.x} ${connections[0]!.y}`
    for (let i = 0; i < n; i++) {
      const endPt = connections[(i + 1) % n]!
      cloudPath += ` A ${puffR} ${puffR} 0 0 1 ${endPt.x} ${endPt.y}`
    }
    cloudPath += ' Z'

    // Bubble circles
    let bubblePaths = ''
    for (const bubble of this.bubbles) {
      const r = bubble.radius
      const bx = bubble.center.x
      const by = bubble.center.y
      bubblePaths += ` M ${bx + r} ${by} A ${r} ${r} 0 1 1 ${bx - r} ${by} A ${r} ${r} 0 1 1 ${bx + r} ${by}`
    }

    return cloudPath + bubblePaths
  }

  toString(): string {
    return `CloudCallout(${this.center}, ${this.width}x${this.height}, puffs=${this.puffs})`
  }
}

/**
 * Create a cloud callout shape
 */
export function cloudCallout(options?: CloudCalloutOptions): CloudCallout {
  return new CloudCallout(options)
}
