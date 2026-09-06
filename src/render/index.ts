// Renderer interface
export {
  isPoint,
  isPath,
  isLine,
  isCircle,
  isArc,
  isEllipse,
  isRectangle,
  isPolygon,
  isNode,
  isEdge,
} from './Renderer'

export type {
  Renderer,
  Renderable,
  RenderOptions,
  TextOptions,
  GroupOptions,
} from './Renderer'

// Style mapping
export {
  DEFAULT_STYLE,
  STYLE_PRESETS,
  DASH_PATTERN_NAMES,
  mergeStyles,
  applyPreset,
  applyPresets,
  parseStyleString,
  styleToSVGAttributes,
  styleToCSSString,
  createGradientId,
  isTransparent,
  lightenColor,
  darkenColor,
  rgbToHex,
  hexToRgb,
} from './StyleMapper'

export type {
  Color,
  LineCap,
  LineJoin,
  RenderStyle,
  SVGAttributes,
  StylePreset,
  StyleSpec,
  DashPatternName,
  ClipSpec,
  DoubleLineSpec,
} from './StyleMapper'

// Named preset objects (thick, dashed, red, …) for the array form of `style`
export * from './presets'

// Gradients
export {
  generateGradientId,
  normalizeGradientSpec,
  isGradientSpec,
  isLinearGradient,
  isRadialGradient,
  angleToGradientCoords,
  createStopElements,
  DEFAULT_GRADIENT_STOPS,
} from './Gradient'

export type {
  GradientStop,
  LinearGradientSpec,
  RadialGradientSpec,
  GradientSpec,
} from './Gradient'

// Shadows
export {
  generateShadowId,
  normalizeShadowSpec,
  isDropShadowSpec,
  parseColorForFilter,
  DEFAULT_SHADOW,
} from './Shadow'

export type {
  DropShadowSpec,
} from './Shadow'

// Fill patterns
export {
  PATTERN_DEFINITIONS,
  generatePatternId,
  normalizePatternSpec,
  isPatternName,
  registerPattern,
  getPatternDefinition,
  registeredPatternNames,
} from './FillPattern'

export type {
  FillPatternName,
  FillPatternSpec,
  PatternDefinition,
} from './FillPattern'

// SVG Renderer
export { SVGRenderer, createSVGRenderer } from './SVGRenderer'
export type { SVGRendererOptions } from './SVGRenderer'

export type { KaTeXOptions } from './SVGRenderer'

// Renderer collaborators (def bookkeeping, layers, math)
export { DefsManager } from './DefsManager'
export { LayerStack } from './LayerStack'
export { katexAdapter, resolveMathRenderer } from './MathRenderer'
export type { MathRenderer, MathRendererOptions, KaTeXLike } from './MathRenderer'

// Arrow tip registry
export {
  registerArrowTip,
  getArrowTip,
  hasArrowTip,
  registeredArrowTips,
  resolveArrowTipKind,
} from './ArrowTip'
export type { ArrowTipDefinition, ArrowTipArtwork } from './ArrowTip'

// SVG Builder (string-first element AST — no SVG.js dependency)
export { SVGBuilder, createSVGBuilder } from './SVGBuilder'

export type { Attrs, SVGChild, SVGNode } from './SVGBuilder'

// Layers
export { DEFAULT_LAYERS } from './Layer'

export type { LayerName, LayerConfig } from './Layer'
