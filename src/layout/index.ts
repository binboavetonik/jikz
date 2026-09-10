// Shared
// (LayoutGrowth is the canonical growth type; TreeGrowth aliases it.)
export type { LayoutGrowth } from './shared'

// Chain
export {
  chain,
  chainFrom,
} from './Chain'
export type {
  ChainDirection,
  ChainOptions,
  ChainResult,
  ChainBuilder,
} from './Chain'

// Matrix
export {
  matrix,
  matrixFromData,
} from './Matrix'
export type {
  MatrixOptions,
  MatrixResult,
  MatrixBuilder,
} from './Matrix'

// Tree
export {
  tree,
  treeFromSpec,
} from './Tree'
export type {
  TreeGrowth,
  TreeOptions,
  TreeNodeSpec,
  TreeResult,
  TreeNodeBuilder,
  TreeBuilder,
} from './Tree'

// Layered
export {
  layered,
} from './Layered'
export type {
  LayeredOptions,
  LayeredNodeSpec,
  LayeredEdgeSpec,
  LayeredResult,
  LayeredBuilder,
} from './Layered'
