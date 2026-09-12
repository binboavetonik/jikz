import { Point, point } from '../core/Point'
import { degToRad } from '../utils/math'
import { Path, path } from './Path'

/**
 * Options for path decorations
 */
export interface DecorationOptions {
  /**
   * Amplitude of the decoration (height of waves/zigzags)
   * Default: 5
   */
  amplitude?: number

  /**
   * Wavelength/segment length of the decoration
   * Default: 10
   */
  wavelength?: number

  /**
   * Number of samples per wavelength for smooth curves
   * Default: 10
   */
  samplesPerWave?: number
}

const DEFAULT_DECORATION_OPTIONS: Required<DecorationOptions> = {
  amplitude: 5,
  wavelength: 10,
  samplesPerWave: 10,
}

/**
 * Get point and tangent angle at parameter t along a path
 */
function getPointAndAngle(p: Path, t: number): { point: Point; angle: number } {
  const pt = p.pointAt(t)
  const delta = 0.001
  const p1 = p.pointAt(Math.max(0, t - delta))
  const p2 = p.pointAt(Math.min(1, t + delta))
  const angle = p1.angleTo(p2)
  return { point: pt, angle }
}

/**
 * Offset a point perpendicular to a given angle
 */
function offsetPoint(pt: Point, angle: number, offset: number): Point {
  const normalAngle = angle + 90
  const rad = degToRad(normalAngle)
  return point(
    pt.x + offset * Math.cos(rad),
    pt.y + offset * Math.sin(rad)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Snake Decoration (sinusoidal wave)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a snake (sinusoidal wave) decoration to a path
 *
 * @example
 * const wavy = snakePath(line(A, B).toPath(), { amplitude: 8, wavelength: 20 })
 */
export function snakePath(p: Path, options: DecorationOptions = {}): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const pathLength = p.length

  if (pathLength === 0) return p

  const numWaves = Math.max(1, Math.round(pathLength / opts.wavelength))
  const totalSamples = numWaves * opts.samplesPerWave

  const points: Point[] = []

  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples
    const { point: basePt, angle } = getPointAndAngle(p, t)

    // Sinusoidal offset
    const phase = (i / opts.samplesPerWave) * 2 * Math.PI
    const offset = opts.amplitude * Math.sin(phase)

    points.push(offsetPoint(basePt, angle, offset))
  }

  // Build smooth path through points
  return buildSmoothPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Zigzag Decoration (triangular wave)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a zigzag decoration to a path
 *
 * @example
 * const zigzag = zigzagPath(line(A, B).toPath(), { amplitude: 6, wavelength: 15 })
 */
export function zigzagPath(p: Path, options: DecorationOptions = {}): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const pathLength = p.length

  if (pathLength === 0) return p

  const numWaves = Math.max(1, Math.round(pathLength / opts.wavelength))
  // Each wave has 4 segments: start -> top -> center -> bottom -> end
  const pointsPerWave = 4
  const totalPoints = numWaves * pointsPerWave + 1

  const points: Point[] = []

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / totalPoints
    const { point: basePt, angle } = getPointAndAngle(p, t)

    // Triangular wave offset
    const wavePos = (i % pointsPerWave) / pointsPerWave
    let offset: number
    if (wavePos < 0.25) {
      offset = opts.amplitude * (wavePos * 4)
    } else if (wavePos < 0.75) {
      offset = opts.amplitude * (1 - (wavePos - 0.25) * 4)
    } else {
      offset = opts.amplitude * ((wavePos - 0.75) * 4 - 1)
    }

    points.push(offsetPoint(basePt, angle, offset))
  }

  // Build path with straight lines
  return buildLinearPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Coil Decoration (helix/spring pattern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for coil decoration
 */
export interface CoilOptions extends DecorationOptions {
  /**
   * Aspect ratio of the coil (0 = flat, 1 = circular)
   * Default: 0.3
   */
  aspect?: number
}

/**
 * Apply a coil/spring decoration to a path
 *
 * @example
 * const spring = coilPath(line(A, B).toPath(), { amplitude: 8, wavelength: 15 })
 */
export function coilPath(p: Path, options: CoilOptions = {}): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, aspect: 0.3, ...options }
  const pathLength = p.length

  if (pathLength === 0) return p

  const numCoils = Math.max(1, Math.round(pathLength / opts.wavelength))
  const totalSamples = numCoils * opts.samplesPerWave

  const points: Point[] = []

  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples
    const { point: basePt, angle } = getPointAndAngle(p, t)

    // Coil is like a compressed sine wave
    const phase = (i / opts.samplesPerWave) * 2 * Math.PI
    const perpOffset = opts.amplitude * Math.sin(phase)

    // Add forward/backward motion for 3D effect
    const tangentOffset = opts.amplitude * opts.aspect * Math.cos(phase)

    const normalRad = degToRad(angle + 90)
    const tangentRad = degToRad(angle)

    points.push(point(
      basePt.x + perpOffset * Math.cos(normalRad) + tangentOffset * Math.cos(tangentRad),
      basePt.y + perpOffset * Math.sin(normalRad) + tangentOffset * Math.sin(tangentRad)
    ))
  }

  return buildSmoothPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Bumps Decoration (semicircular bumps)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for bumps decoration
 */
export interface BumpsOptions extends DecorationOptions {
  /**
   * Which side to put bumps: 'left', 'right', or 'both'
   * Default: 'left'
   */
  side?: 'left' | 'right' | 'both'
}

/**
 * Apply a bumps (semicircular) decoration to a path
 *
 * @example
 * const bumpy = bumpsPath(line(A, B).toPath(), { amplitude: 6, wavelength: 12 })
 */
export function bumpsPath(p: Path, options: BumpsOptions = {}): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, side: 'left' as const, ...options }
  const pathLength = p.length

  if (pathLength === 0) return p

  const numBumps = Math.max(1, Math.round(pathLength / opts.wavelength))
  const totalSamples = numBumps * opts.samplesPerWave

  const points: Point[] = []
  const sideMultiplier = opts.side === 'right' ? -1 : 1

  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples
    const { point: basePt, angle } = getPointAndAngle(p, t)

    // Semicircular bumps (absolute value of sine)
    const phase = (i / opts.samplesPerWave) * Math.PI
    const bumpNum = Math.floor(i / opts.samplesPerWave)

    let offset: number
    if (opts.side === 'both') {
      // Alternate sides
      offset = opts.amplitude * Math.sin(phase) * (bumpNum % 2 === 0 ? 1 : -1)
    } else {
      offset = opts.amplitude * Math.sin(phase) * sideMultiplier
    }

    points.push(offsetPoint(basePt, angle, offset))
  }

  return buildSmoothPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Saw Decoration (sawtooth wave)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a sawtooth decoration to a path
 *
 * @example
 * const saw = sawPath(line(A, B).toPath(), { amplitude: 6, wavelength: 15 })
 */
export function sawPath(p: Path, options: DecorationOptions = {}): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const pathLength = p.length

  if (pathLength === 0) return p

  const numTeeth = Math.max(1, Math.round(pathLength / opts.wavelength))
  // Each tooth: ramp up, then drop
  const pointsPerTooth = 2
  const totalPoints = numTeeth * pointsPerTooth + 1

  const points: Point[] = []

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / totalPoints
    const { point: basePt, angle } = getPointAndAngle(p, t)

    // Sawtooth: ramp from -amplitude to +amplitude, then drop
    const toothPos = (i % pointsPerTooth) / pointsPerTooth
    const offset = opts.amplitude * (2 * toothPos - 1)

    points.push(offsetPoint(basePt, angle, offset))
  }

  return buildLinearPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Random/Wavy Decoration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for random decoration
 */
export interface RandomOptions extends DecorationOptions {
  /**
   * Seed for reproducible randomness (optional)
   */
  seed?: number
}

/**
 * Apply a random wavy decoration to a path
 * Creates an organic, hand-drawn look
 */
export function randomPath(p: Path, options: RandomOptions = {}): Path {
  const opts = { ...DEFAULT_DECORATION_OPTIONS, ...options }
  const pathLength = p.length

  if (pathLength === 0) return p

  // Simple seeded random
  let seed = opts.seed ?? Math.random() * 10000
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  const numSegments = Math.max(1, Math.round(pathLength / opts.wavelength))
  const totalSamples = numSegments * opts.samplesPerWave

  const points: Point[] = []

  // Generate random offsets with smoothing
  const offsets: number[] = []
  for (let i = 0; i <= totalSamples; i++) {
    offsets.push((random() - 0.5) * 2 * opts.amplitude)
  }

  // Smooth the offsets
  const smoothed: number[] = []
  for (let i = 0; i <= totalSamples; i++) {
    const prev = offsets[Math.max(0, i - 1)]!
    const curr = offsets[i]!
    const next = offsets[Math.min(totalSamples, i + 1)]!
    smoothed.push((prev + curr * 2 + next) / 4)
  }

  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples
    const { point: basePt, angle } = getPointAndAngle(p, t)
    points.push(offsetPoint(basePt, angle, smoothed[i]!))
  }

  return buildSmoothPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Brace Decoration (curly brace along path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for brace decoration
 */
export interface BraceOptions {
  /**
   * Amplitude (how far the brace extends)
   * Default: 10
   */
  amplitude?: number

  /**
   * Which side: 'left' or 'right'
   * Default: 'left'
   */
  side?: 'left' | 'right'
}

/**
 * Apply a curly brace decoration to a path
 * Creates a { shape along the path
 *
 * @example
 * const brace = bracePath(line(A, B).toPath(), { amplitude: 15 })
 */
export function braceDecorationPath(p: Path, options: BraceOptions = {}): Path {
  const amplitude = options.amplitude ?? 10
  const side = options.side ?? 'left'
  const sideMultiplier = side === 'right' ? -1 : 1

  const pathLength = p.length
  if (pathLength === 0) return p

  const points: Point[] = []
  const samples = 50

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const { point: basePt, angle } = getPointAndAngle(p, t)

    // Brace shape: two bumps with a point in the middle
    let offset: number
    if (t < 0.5) {
      // First half: curve out and back
      const localT = t * 2
      offset = amplitude * Math.sin(localT * Math.PI) * sideMultiplier
    } else {
      // Second half: curve out and back
      const localT = (t - 0.5) * 2
      offset = amplitude * Math.sin(localT * Math.PI) * sideMultiplier
    }

    // Add extra bump at the middle
    const midBump = amplitude * 0.5 * Math.exp(-50 * (t - 0.5) * (t - 0.5)) * sideMultiplier
    offset += midBump

    points.push(offsetPoint(basePt, angle, offset))
  }

  return buildSmoothPath(points)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a path through points using straight lines
 */
function buildLinearPath(points: Point[]): Path {
  if (points.length === 0) return path()

  let result = path().moveTo(points[0]!)
  for (let i = 1; i < points.length; i++) {
    result = result.lineTo(points[i]!)
  }
  return result
}

/**
 * Build a smooth path through points using bezier curves
 */
function buildSmoothPath(points: Point[]): Path {
  if (points.length === 0) return path()
  if (points.length === 1) return path().moveTo(points[0]!)
  if (points.length === 2) return path().moveTo(points[0]!).lineTo(points[1]!)

  let result = path().moveTo(points[0]!)

  // Use Catmull-Rom to Bezier conversion for smooth curves
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!

    // Catmull-Rom to Bezier control points
    const cp1 = point(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6
    )
    const cp2 = point(
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6
    )

    result = result.curveTo(cp1, cp2, p2)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Decoration registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A decoration transforms a path into a decorated copy.
 * Options are decoration-specific; the common {@link DecorationOptions}
 * fields (amplitude, wavelength, …) are honored by convention.
 */
export type DecorationFn = (
  p: Path,
  options?: DecorationOptions & Record<string, unknown>
) => Path

const decorationRegistry = new Map<string, DecorationFn>()

/**
 * Register a decoration under a name, making it available to
 * {@link decoratePath} and `Path.decorate(name)`. Later registrations
 * replace earlier ones under the same name.
 *
 * @example
 * ```ts
 * registerDecoration('heartbeat', (p, o) => myHeartbeatTransform(p, o))
 * decoratePath(myPath, 'heartbeat', { amplitude: 6 })
 * ```
 */
export function registerDecoration(name: string, fn: DecorationFn): void {
  ensureBuiltins()
  decorationRegistry.set(name, fn)
}

/**
 * Whether a decoration is registered under `name`.
 */
export function hasDecoration(name: string): boolean {
  ensureBuiltins()
  return decorationRegistry.has(name)
}

/**
 * All registered decoration names (built-ins plus user registrations).
 */
export function registeredDecorations(): readonly string[] {
  ensureBuiltins()
  return Array.from(decorationRegistry.keys())
}

// Built-in decorations — registered on first use.
let builtinsRegistered = false

/**
 * Register the built-ins on first use. Every public function of this
 * registry calls this first, so built-ins are always present and always
 * registered BEFORE anything the caller adds — a user registration under
 * a built-in name still wins, exactly as when built-ins registered at
 * import time.
 *
 * Deferring to first use is what makes the package tree-shakeable
 * (`"sideEffects": false`): loading this module no longer mutates any
 * table, so a bundle that never resolves a name by string can drop the
 * shapes/artwork this function references.
 */
function ensureBuiltins(): void {
  if (builtinsRegistered) return
  builtinsRegistered = true
  registerDecoration('snake', (p, o) => snakePath(p, o))
  registerDecoration('zigzag', (p, o) => zigzagPath(p, o))
  registerDecoration('coil', (p, o) => coilPath(p, o as CoilOptions))
  registerDecoration('bumps', (p, o) => bumpsPath(p, o as BumpsOptions))
  registerDecoration('saw', (p, o) => sawPath(p, o))
  registerDecoration('random', (p, o) => randomPath(p, o as RandomOptions))
  registerDecoration('brace', (p, o) => braceDecorationPath(p, o as BraceOptions))
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: Decorate any path
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Built-in decoration names. Any name registered via
 * {@link registerDecoration} is accepted too (the `string & {}` branch
 * keeps autocomplete for built-ins).
 */
export type PathDecorationType =
  | 'snake'
  | 'zigzag'
  | 'coil'
  | 'bumps'
  | 'saw'
  | 'random'
  | 'brace'
  | (string & {})

/**
 * Apply a named decoration to a path. Throws with the list of known
 * decorations when the name is not registered.
 *
 * @example
 * const decorated = decoratePath(myPath, 'snake', { amplitude: 8 })
 */
export function decoratePath(
  p: Path,
  type: PathDecorationType,
  options: DecorationOptions & CoilOptions & BumpsOptions & BraceOptions & Record<string, unknown> = {}
): Path {
  ensureBuiltins()
  const fn = decorationRegistry.get(type)
  if (!fn) {
    const known = registeredDecorations().map((n) => `"${n}"`).join(', ')
    throw new Error(`Unknown decoration: "${type}" (known: ${known}).`)
  }
  return fn(p, options)
}
