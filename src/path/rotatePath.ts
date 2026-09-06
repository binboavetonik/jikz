import type { PointLike } from '../core/types'
import { degToRad } from '../utils/math'

/**
 * Rotate SVG path data around a center point.
 *
 * Parses the `d` attribute, rotates every coordinate, and re-emits the
 * path using absolute commands only (relative commands are converted;
 * `H`/`V` become `L` since a rotated axis-aligned segment is slanted).
 *
 * Supported commands: M, L, H, V, C, S, Q, T, A, Z (absolute and
 * relative). Arcs rotate correctly: radii and the sweep flag are
 * invariant under rotation, only the endpoint moves and
 * `x-axis-rotation` increases by `angle`.
 *
 * Angle convention matches the rest of the library: degrees, clockwise
 * positive in y-down screen space (same as SVG's `rotate()`).
 */

/** Argument counts per (uppercase) command letter. */
const PARAM_COUNT: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
}

/**
 * Round to 3 decimals — collapses float noise like cos(90°) ≈ 6e-17
 * to 0 and keeps path output readable.
 */
function fmt(n: number): string {
  const r = Math.round(n * 1000) / 1000
  return String(r === 0 ? 0 : r)
}

const COMMAND_RE = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g

export function rotatePathData(d: string, angle: number, center: PointLike): string {
  const rad = degToRad(angle)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const rot = (x: number, y: number): [number, number] => {
    const dx = x - center.x
    const dy = y - center.y
    return [center.x + dx * cos - dy * sin, center.y + dx * sin + dy * cos]
  }

  const out: string[] = []
  // Current point, tracked for relative → absolute conversion.
  let cx = 0
  let cy = 0

  let m: RegExpExecArray | null
  COMMAND_RE.lastIndex = 0
  while ((m = COMMAND_RE.exec(d)) !== null) {
    const rawCmd = m[1]!
    const cmd = rawCmd.toUpperCase()
    const relative = rawCmd !== cmd
    const arity = PARAM_COUNT[cmd]
    if (arity === undefined) continue // unknown command: skip defensively

    if (arity === 0) {
      out.push('Z')
      continue
    }

    const nums = m[2]!
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)

    let first = true
    for (let i = 0; i + arity <= nums.length; i += arity) {
      // Per the SVG spec, additional coordinate pairs after an M/m are
      // implicit L/l commands.
      const effective = cmd === 'M' && !first ? 'L' : cmd
      first = false
      const c = nums.slice(i, i + arity)

      switch (effective) {
        case 'M':
        case 'L':
        case 'T': {
          const x = relative ? cx + c[0]! : c[0]!
          const y = relative ? cy + c[1]! : c[1]!
          const [rx, ry] = rot(x, y)
          out.push(`${effective} ${fmt(rx)} ${fmt(ry)}`)
          cx = x
          cy = y
          break
        }
        case 'H': {
          const x = relative ? cx + c[0]! : c[0]!
          const [rx, ry] = rot(x, cy)
          out.push(`L ${fmt(rx)} ${fmt(ry)}`)
          cx = x
          break
        }
        case 'V': {
          const y = relative ? cy + c[0]! : c[0]!
          const [rx, ry] = rot(cx, y)
          out.push(`L ${fmt(rx)} ${fmt(ry)}`)
          cy = y
          break
        }
        case 'C':
        case 'S':
        case 'Q': {
          const pts: string[] = []
          for (let k = 0; k < arity; k += 2) {
            const x = relative ? cx + c[k]! : c[k]!
            const y = relative ? cy + c[k + 1]! : c[k + 1]!
            const [rx, ry] = rot(x, y)
            pts.push(`${fmt(rx)} ${fmt(ry)}`)
            if (k === arity - 2) {
              cx = x
              cy = y
            }
          }
          out.push(`${effective} ${pts.join(' ')}`)
          break
        }
        case 'A': {
          const x = relative ? cx + c[5]! : c[5]!
          const y = relative ? cy + c[6]! : c[6]!
          const [rx, ry] = rot(x, y)
          // rx/ry and the sweep flag are invariant under rotation;
          // only x-axis-rotation shifts by the angle.
          const axisRot = ((c[2]! + angle) % 360 + 360) % 360
          out.push(
            `A ${fmt(c[0]!)} ${fmt(c[1]!)} ${fmt(axisRot)} ${c[3]} ${c[4]} ${fmt(rx)} ${fmt(ry)}`
          )
          cx = x
          cy = y
          break
        }
      }
    }
  }

  return out.join(' ')
}
