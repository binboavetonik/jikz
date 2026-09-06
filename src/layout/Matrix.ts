import { point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Node, type NodeOptions } from '../node/Node'

/**
 * Options for matrix configuration
 */
export interface MatrixOptions {
  /**
   * Starting position (top-left of matrix)
   */
  at?: PointLike

  /**
   * Horizontal spacing between columns (default: 20)
   */
  columnSep?: number

  /**
   * Vertical spacing between rows (default: 20)
   */
  rowSep?: number

  /**
   * Default node options for all cells
   */
  nodeOptions?: Omit<NodeOptions, 'at' | 'text'>
}

/**
 * Cell content specification
 */
type CellContent = string | Omit<NodeOptions, 'at'> | null

/**
 * Internal cell specification
 */
interface CellSpec {
  row: number
  col: number
  content: CellContent
}

/**
 * Result of building a matrix
 */
export interface MatrixResult {
  /**
   * 2D array of nodes (undefined for empty cells)
   */
  cells: (Node | undefined)[][]

  /**
   * Flat array of all nodes
   */
  nodes: Node[]

  /**
   * Number of rows
   */
  rowCount: number

  /**
   * Number of columns
   */
  columnCount: number

  /**
   * Get cell by row/column
   */
  cell(row: number, col: number): Node | undefined

  /**
   * Get entire row
   */
  row(index: number): Node[]

  /**
   * Get entire column
   */
  column(index: number): Node[]

  /**
   * Get node by name
   */
  getNode(name: string): Node | undefined

  /**
   * Get bounding box of the matrix [minX, minY, maxX, maxY]
   */
  bounds: [number, number, number, number]
}

/**
 * Builder interface for creating matrix layouts
 */
export interface MatrixBuilder {
  /**
   * Set a cell
   */
  cell(row: number, col: number, content: CellContent): MatrixBuilder

  /**
   * Set entire row at once
   */
  row(index: number, cells: CellContent[]): MatrixBuilder

  /**
   * Add rows from 2D array
   */
  rows(data: CellContent[][]): MatrixBuilder

  /**
   * Build the matrix
   */
  build(): MatrixResult
}

/**
 * Default column/row separation
 */
const DEFAULT_MATRIX_SEP = 20

/**
 * Internal class implementing the matrix builder
 */
class MatrixBuilderImpl implements MatrixBuilder {
  private _cells: Map<string, CellSpec> = new Map()
  private _options: MatrixOptions

  constructor(options: MatrixOptions = {}) {
    this._options = {
      at: { x: 0, y: 0 },
      columnSep: DEFAULT_MATRIX_SEP,
      rowSep: DEFAULT_MATRIX_SEP,
      ...options,
    }
  }

  private cellKey(row: number, col: number): string {
    return `${row},${col}`
  }

  cell(row: number, col: number, content: CellContent): MatrixBuilder {
    if (content !== null) {
      this._cells.set(this.cellKey(row, col), { row, col, content })
    }
    return this
  }

  row(index: number, cells: CellContent[]): MatrixBuilder {
    for (let col = 0; col < cells.length; col++) {
      this.cell(index, col, cells[col]!)
    }
    return this
  }

  rows(data: CellContent[][]): MatrixBuilder {
    for (let row = 0; row < data.length; row++) {
      this.row(row, data[row]!)
    }
    return this
  }

  build(): MatrixResult {
    // Determine grid dimensions
    let maxRow = -1
    let maxCol = -1
    for (const spec of this._cells.values()) {
      maxRow = Math.max(maxRow, spec.row)
      maxCol = Math.max(maxCol, spec.col)
    }

    const rowCount = maxRow + 1
    const columnCount = maxCol + 1

    if (rowCount === 0 || columnCount === 0) {
      return this.createEmptyResult()
    }

    // Create temporary nodes to measure sizes
    const tempNodes: (Node | undefined)[][] = []
    for (let r = 0; r < rowCount; r++) {
      tempNodes[r] = []
      for (let c = 0; c < columnCount; c++) {
        const spec = this._cells.get(this.cellKey(r, c))
        if (spec && spec.content !== null) {
          const nodeOpts = this.contentToNodeOptions(spec.content)
          tempNodes[r]![c] = new Node({ ...nodeOpts, at: { x: 0, y: 0 } })
        }
      }
    }

    // Calculate column widths (max width in each column)
    const columnWidths: number[] = []
    for (let c = 0; c < columnCount; c++) {
      let maxWidth = 0
      for (let r = 0; r < rowCount; r++) {
        const node = tempNodes[r]?.[c]
        if (node) {
          maxWidth = Math.max(maxWidth, node.width)
        }
      }
      columnWidths[c] = maxWidth
    }

    // Calculate row heights (max height in each row)
    const rowHeights: number[] = []
    for (let r = 0; r < rowCount; r++) {
      let maxHeight = 0
      for (let c = 0; c < columnCount; c++) {
        const node = tempNodes[r]?.[c]
        if (node) {
          maxHeight = Math.max(maxHeight, node.height)
        }
      }
      rowHeights[r] = maxHeight
    }

    // Calculate column X positions (center of each column)
    const columnX: number[] = []
    let currentX = this._options.at!.x
    for (let c = 0; c < columnCount; c++) {
      columnX[c] = currentX + columnWidths[c]! / 2
      currentX += columnWidths[c]! + this._options.columnSep!
    }

    // Calculate row Y positions (center of each row)
    const rowY: number[] = []
    let currentY = this._options.at!.y
    for (let r = 0; r < rowCount; r++) {
      rowY[r] = currentY + rowHeights[r]! / 2
      currentY += rowHeights[r]! + this._options.rowSep!
    }

    // Create final positioned nodes
    const cells: (Node | undefined)[][] = []
    const nodes: Node[] = []
    const nodesByName: Map<string, Node> = new Map()

    for (let r = 0; r < rowCount; r++) {
      cells[r] = []
      for (let c = 0; c < columnCount; c++) {
        const spec = this._cells.get(this.cellKey(r, c))
        if (spec && spec.content !== null) {
          const nodeOpts = this.contentToNodeOptions(spec.content)
          const newNode = new Node({
            ...nodeOpts,
            at: point(columnX[c]!, rowY[r]!),
          })
          cells[r]![c] = newNode
          nodes.push(newNode)
          if (newNode.name) {
            nodesByName.set(newNode.name, newNode)
          }
        }
      }
    }

    // Calculate bounds
    const minX = this._options.at!.x
    const minY = this._options.at!.y
    const maxX = currentX - this._options.columnSep!
    const maxY = currentY - this._options.rowSep!
    const bounds: [number, number, number, number] = [minX, minY, maxX, maxY]

    return {
      cells,
      nodes,
      rowCount,
      columnCount,
      bounds,
      cell(row: number, col: number): Node | undefined {
        return cells[row]?.[col]
      },
      row(index: number): Node[] {
        return (cells[index] ?? []).filter((n): n is Node => n !== undefined)
      },
      column(index: number): Node[] {
        const result: Node[] = []
        for (let r = 0; r < rowCount; r++) {
          const node = cells[r]?.[index]
          if (node) {
            result.push(node)
          }
        }
        return result
      },
      getNode(name: string): Node | undefined {
        return nodesByName.get(name)
      },
    }
  }

  private contentToNodeOptions(content: CellContent): Omit<NodeOptions, 'at'> {
    if (content === null) {
      return {}
    }
    if (typeof content === 'string') {
      return { ...this._options.nodeOptions, text: content, name: content }
    }
    return { ...this._options.nodeOptions, ...content }
  }

  private createEmptyResult(): MatrixResult {
    return {
      cells: [],
      nodes: [],
      rowCount: 0,
      columnCount: 0,
      bounds: [0, 0, 0, 0],
      cell(): Node | undefined {
        return undefined
      },
      row(): Node[] {
        return []
      },
      column(): Node[] {
        return []
      },
      getNode(): Node | undefined {
        return undefined
      },
    }
  }
}

/**
 * Create a new matrix builder
 *
 * @example
 * ```typescript
 * const m = matrix({ at: point(50, 50), columnSep: 30, rowSep: 25 })
 *   .row(0, ['A', 'B', 'C'])
 *   .row(1, ['D', 'E', 'F'])
 *   .build()
 * ```
 */
export function matrix(options?: MatrixOptions): MatrixBuilder {
  return new MatrixBuilderImpl(options)
}

/**
 * Create a matrix directly from a 2D array of data
 *
 * @example
 * ```typescript
 * const m = matrixFromData([
 *   ['1', '2', '3'],
 *   ['4', '5', '6']
 * ], { at: point(50, 50) })
 * ```
 */
export function matrixFromData(
  data: CellContent[][],
  options?: MatrixOptions
): MatrixResult {
  return matrix(options).rows(data).build()
}
