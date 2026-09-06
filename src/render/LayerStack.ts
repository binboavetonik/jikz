import type { SVGBuilder } from './SVGBuilder'
import type { LayerName } from './Layer'

/**
 * Ordered named layer groups, extracted from SVGRenderer.
 *
 * Layers are `<g data-layer="name">` containers created in paint order
 * (bottom to top) under the root builder. Renderers route elements into
 * the *current* layer; `onLayer` provides scoped switching with
 * automatic restore.
 */
export class LayerStack {
  private layers: Map<LayerName, SVGBuilder> = new Map()
  private order: LayerName[] = []
  private currentName: LayerName = 'main'
  private defaultName: LayerName = 'main'

  constructor(private readonly root: SVGBuilder) {}

  /**
   * Define layers in order (bottom to top). Earlier layers appear
   * behind later layers in the SVG. Replaces any existing layers.
   */
  define(layerNames: LayerName[], defaultLayer?: LayerName): void {
    // Remove existing layer groups from the root's child list. The
    // builder has no parent pointers, so we splice matching children.
    for (const g of this.layers.values()) {
      const idx = this.root.node.children.indexOf(g.node)
      if (idx >= 0) this.root.node.children.splice(idx, 1)
    }
    this.layers.clear()
    this.order = []

    for (const name of layerNames) {
      const g = this.root.group()
      g.attr({ 'data-layer': name })
      this.layers.set(name, g)
      this.order.push(name)
    }

    this.defaultName = defaultLayer ?? 'main'
    if (!this.layers.has(this.defaultName)) {
      this.defaultName = layerNames[0] ?? 'main'
    }
    this.currentName = this.defaultName
  }

  /**
   * Set the current layer for subsequent renders. Throws on unknown names.
   */
  set(name: LayerName): void {
    if (!this.layers.has(name)) {
      throw new Error(`Unknown layer: ${name}`)
    }
    this.currentName = name
  }

  /**
   * The current layer's container, or undefined when no layers are defined.
   */
  current(): SVGBuilder | undefined {
    return this.layers.get(this.currentName)
  }

  /**
   * Get a layer's container by name.
   */
  get(name: LayerName): SVGBuilder | undefined {
    return this.layers.get(name)
  }

  /**
   * Reset to the default layer.
   */
  reset(): void {
    this.currentName = this.defaultName
  }

  /**
   * Execute callback on a specific layer, then restore the previous layer.
   */
  onLayer<T>(name: LayerName, callback: () => T): T {
    const previous = this.currentName
    this.set(name)
    try {
      return callback()
    } finally {
      this.currentName = previous
    }
  }

  get currentLayerName(): LayerName {
    return this.currentName
  }

  get defaultLayerName(): LayerName {
    return this.defaultName
  }

  /**
   * All layer names in paint order.
   */
  names(): LayerName[] {
    return [...this.order]
  }

  /**
   * Drop all layers (removes their groups from the root builder).
   * The default layer *name* is preserved so a subsequent `define`
   * is not required before rendering continues at the root.
   */
  clear(): void {
    for (const g of this.layers.values()) {
      const idx = this.root.node.children.indexOf(g.node)
      if (idx >= 0) this.root.node.children.splice(idx, 1)
    }
    this.layers.clear()
    this.order = []
    this.currentName = this.defaultName
  }
}
