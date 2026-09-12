/**
 * SVG path `d` parsing — the inverse of {@link Path.toSVGPath}.
 *
 * `pathFromSVG` accepts any valid SVG path data (absolute/relative,
 * `H`/`V`/`S`/`T` shorthand, implicit `M`→`L` repetition, arcs with
 * packed flags) and normalizes it to jikz's {@link Path} model:
 * absolute `M`/`L`/`C`/`Q`/`A`/`Z` only.
 *
 *   - `H`/`V` → `L` (with the current point)
 *   - `S` → `C` (cp1 = reflection of the previous `C`/`S` cp2)
 *   - `T` → `Q` (cp = reflection of the previous `Q`/`T` cp)
 *   - extra `M` coordinate pairs → `L` (per SVG spec)
 *
 * Arc segments are stored verbatim in SVG endpoint form (rx, ry,
 * x-axis-rotation, large-arc, sweep, endpoint) — no arc math happens at
 * parse time. Number tokenization follows the SVG grammar (sign-separated
 * runs, exponents, bare decimals), and arc flags are read as single
 * `0`/`1` characters so packed flags parse correctly.
 */

import { Point, point } from '../core/Point'
import { Path, type PathSegment } from './Path'

interface Scanner {
  s: string
  i: number
}

function skipWs(sc: Scanner): void {
  while (sc.i < sc.s.length) {
    const ch = sc.s[sc.i]!
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') sc.i++
    else break
  }
}

/** SVG number grammar: optional sign, decimal, optional exponent. */
const NUMBER = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/

function scanNumber(sc: Scanner): number | null {
  const m = NUMBER.exec(sc.s.slice(sc.i))
  if (!m) return null
  sc.i += m[0].length
  return Number(m[0])
}

/** Read `n` numbers, skipping separators. Null when any is missing. */
function readNumbers(sc: Scanner, n: number): number[] | null {
  const out: number[] = []
  for (let k = 0; k < n; k++) {
    skipWs(sc)
    const v = scanNumber(sc)
    if (v === null) return null
    out.push(v)
  }
  return out
}

/** Reflect a control point across the current point (S/T smoothness). */
function reflect(cx: number, cy: number, p: Point): Point {
  return point(2 * cx - p.x, 2 * cy - p.y)
}

const COMMAND_RE = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g

/**
 * Parse an SVG path `d` string into normalized {@link PathSegment}s
 * (absolute `M`/`L`/`C`/`Q`/`A`/`Z` only).
 */
export function parsePathData(d: string): PathSegment[] {
  const segments: PathSegment[] = []
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let prevCmd = ''
  let prevCubicCp2: Point | null = null
  let prevQuadCp: Point | null = null

  COMMAND_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = COMMAND_RE.exec(d)) !== null) {
    const raw = m[1]!
    const c = raw.toUpperCase()
    const relative = raw !== c
    const sc: Scanner = { s: m[2] ?? '', i: 0 }

    switch (c) {
      case 'M':
      case 'L':
      case 'T': {
        let first = true
        for (;;) {
          const nums = readNumbers(sc, 2)
          if (!nums) break
          const x = relative ? cx + nums[0]! : nums[0]!
          const y = relative ? cy + nums[1]! : nums[1]!

          if (c === 'M') {
            if (first) {
              segments.push({ type: 'M', points: [point(x, y)] })
              sx = x
              sy = y
            } else {
              segments.push({ type: 'L', points: [point(x, y)] })
            }
          } else if (c === 'L') {
            segments.push({ type: 'L', points: [point(x, y)] })
          } else {
            const cp: Point =
              (prevCmd === 'Q' || prevCmd === 'T') && prevQuadCp
                ? reflect(cx, cy, prevQuadCp)
                : point(cx, cy)
            segments.push({ type: 'Q', points: [cp, point(x, y)] })
            prevQuadCp = cp
          }

          cx = x
          cy = y
          prevCmd = c === 'M' ? (first ? 'M' : 'L') : c
          first = false
        }
        break
      }

      case 'H': {
        for (;;) {
          const nums = readNumbers(sc, 1)
          if (!nums) break
          const x = relative ? cx + nums[0]! : nums[0]!
          segments.push({ type: 'L', points: [point(x, cy)] })
          cx = x
          prevCmd = 'L'
        }
        break
      }

      case 'V': {
        for (;;) {
          const nums = readNumbers(sc, 1)
          if (!nums) break
          const y = relative ? cy + nums[0]! : nums[0]!
          segments.push({ type: 'L', points: [point(cx, y)] })
          cy = y
          prevCmd = 'L'
        }
        break
      }

      case 'C': {
        for (;;) {
          const nums = readNumbers(sc, 6)
          if (!nums) break
          const cp1 = point(relative ? cx + nums[0]! : nums[0]!, relative ? cy + nums[1]! : nums[1]!)
          const cp2 = point(relative ? cx + nums[2]! : nums[2]!, relative ? cy + nums[3]! : nums[3]!)
          const end = point(relative ? cx + nums[4]! : nums[4]!, relative ? cy + nums[5]! : nums[5]!)
          segments.push({ type: 'C', points: [cp1, cp2, end] })
          cx = end.x
          cy = end.y
          prevCmd = 'C'
          prevCubicCp2 = cp2
        }
        break
      }

      case 'S': {
        for (;;) {
          const nums = readNumbers(sc, 4)
          if (!nums) break
          const cp1 =
            (prevCmd === 'C' || prevCmd === 'S') && prevCubicCp2
              ? reflect(cx, cy, prevCubicCp2)
              : point(cx, cy)
          const cp2 = point(relative ? cx + nums[0]! : nums[0]!, relative ? cy + nums[1]! : nums[1]!)
          const end = point(relative ? cx + nums[2]! : nums[2]!, relative ? cy + nums[3]! : nums[3]!)
          segments.push({ type: 'C', points: [cp1, cp2, end] })
          cx = end.x
          cy = end.y
          prevCmd = 'S'
          prevCubicCp2 = cp2
        }
        break
      }

      case 'Q': {
        for (;;) {
          const nums = readNumbers(sc, 4)
          if (!nums) break
          const cp = point(relative ? cx + nums[0]! : nums[0]!, relative ? cy + nums[1]! : nums[1]!)
          const end = point(relative ? cx + nums[2]! : nums[2]!, relative ? cy + nums[3]! : nums[3]!)
          segments.push({ type: 'Q', points: [cp, end] })
          cx = end.x
          cy = end.y
          prevCmd = 'Q'
          prevQuadCp = cp
        }
        break
      }

      case 'A': {
        for (;;) {
          const nums = readNumbers(sc, 3)
          if (!nums) break
          const rx = Math.abs(nums[0]!)
          const ry = Math.abs(nums[1]!)
          const rotation = nums[2]!

          // Flags are single 0/1 characters (may be packed together or
          // against the following coordinate).
          skipWs(sc)
          const largeArc = sc.s[sc.i] === '1'
          if (sc.i < sc.s.length) sc.i++
          skipWs(sc)
          const sweep = sc.s[sc.i] === '1'
          if (sc.i < sc.s.length) sc.i++

          const endNums = readNumbers(sc, 2)
          if (!endNums) break
          const x = relative ? cx + endNums[0]! : endNums[0]!
          const y = relative ? cy + endNums[1]! : endNums[1]!

          segments.push({ type: 'A', points: [point(x, y)], rx, ry, rotation, largeArc, sweep })
          cx = x
          cy = y
          prevCmd = 'A'
        }
        break
      }

      case 'Z': {
        segments.push({ type: 'Z', points: [] })
        cx = sx
        cy = sy
        prevCmd = 'Z'
        break
      }
    }
  }

  return segments
}

/**
 * Build a {@link Path} from an SVG path `d` string — the inverse of
 * {@link Path.toSVGPath}. The result can then be drawn, decorated,
 * measured, transformed, or serialized back out.
 */
export function pathFromSVG(d: string): Path {
  return new Path(parsePathData(d))
}
