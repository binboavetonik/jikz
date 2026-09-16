// Renderer interface
export {
  isPoint,
  isPath,
  isMarkedPath,
  isTextPath,
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
  SVGAnimation,
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
  resolveStyle,
  registerStyle,
  hasStyle,
  registeredStyleNames,
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
  StyleRecipe,
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

// Shadings (TikZ \shade vocabulary)
export { axisShading, radialShading, ballShading, resolveShading } from './Shadings'
export type { ShadingName, ShadingOptions } from './Shadings'

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
  definePattern,
  generatePatternId,
  normalizePatternSpec,
} from './FillPattern'
export { fillPatterns } from './patterns'

export type {
  FillPatternSpec,
  PatternDefinition,
  PatternKind,
} from './FillPattern'
export type { FillPatternName } from './patterns'

// SVG Renderer
export { SVGRenderer, createSVGRenderer } from './SVGRenderer'
export type { SVGRendererOptions } from './SVGRenderer'

// Pan/zoom interaction for mounted pictures
export {
  attachPanZoom,
  PANZOOM_VIEWPORT_CLASS,
  IDENTITY_TRANSFORM,
  meetFit,
  screenToScene,
  sceneToScreen,
  clampScale,
  zoomAtScreenPoint,
  panByScreenDelta,
} from './PanZoom'
export type {
  ViewTransform,
  ViewBoxRect,
  ViewportSize,
  PanZoomOptions,
  PanZoomController,
} from './PanZoom'

export type { KaTeXOptions } from './SVGRenderer'

// Renderer collaborators (def bookkeeping, layers, math)
export { DefsManager } from './DefsManager'
export { LayerStack } from './LayerStack'
export {
  katexAdapter,
  mathjaxAdapter,
  resolveMathRenderer,
  setDefaultMathRenderer,
  getDefaultMathRenderer,
} from './MathRenderer'
export type {
  MathRenderer,
  MathRendererOptions,
  MathOutput,
  KaTeXLike,
  MathJaxLike,
} from './MathRenderer'

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
