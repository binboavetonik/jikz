/**
 * Layer name type
 */
export type LayerName = string

/**
 * Default layer names (TikZ-style)
 */
export const DEFAULT_LAYERS: LayerName[] = ['background', 'main', 'foreground']

/**
 * Layer configuration
 */
export interface LayerConfig {
  /** Layer names in order (bottom to top) */
  layers?: LayerName[]
  /** Default layer name (default: 'main') */
  defaultLayer?: LayerName
}
