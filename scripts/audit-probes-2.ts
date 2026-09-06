/**
 * Audit probes 2 — decorations, edge routing math, plot mapping.
 */
import {
  point, line, path, picture, polar, arc, circle,
  snakePath, zigzagPath, coilPath, bracePath, bracketPath,
  plot, plotSin, plotPolar, plotParametric,
  intersectSegmentSegment, intersectSegmentCircle, arcThrough,
  lineFromAngle, Transform, origin,
} from '../src/index'

const results: string[] = []
function check(name: string, actual: unknown, expected: unknown, eps = 1e-6) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e || (typeof actual === 'number' && typeof expected === 'number' && Math.abs(actual - expected) < eps)
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${a} want ${e}`)
}

// ── Decorations preserve endpoints ──────────────────────────────────
const base = path().moveTo(point(20, 40)).lineTo(point(320, 40))
for (const [name, p] of [
  ['snake', snakePath(base, { amplitude: 6, wavelength: 18 })],
  ['zigzag', zigzagPath(base, { amplitude: 6, wavelength: 14 })],
  ['coil', coilPath(base, { amplitude: 8 })],
] as const) {
  const s = p.segments[0]!
  const first = s.points[0]!
  check(`${name} starts at base start`, first.equals(point(20, 40), 0.5), true)
  const e = p.endPoint
  check(`${name} ends near base end (x)`, Math.abs(e.x - 320) < 18, true)
}

// brace endpoints
const br = bracePath(point(40, 45), point(280, 45), 8)
check('brace starts at a', br.segments[0]!.points[0]!.equals(point(40, 45), 0.6), true)

// ── Plot mapping: x→x*scale+off, y UNFLIPPED ────────────────────────
const pl = plot((x) => x, { domain: [0, 10], samples: 11, xScale: 10, yScale: 5, xOffset: 100, yOffset: 50 })
check('plot x maps', pl.points[10]!.x, 200)
check('plot y unflipped', pl.points[10]!.y, 100) // y=10*5+50

// plotPolar: theta in DEGREES; r at 90° goes DOWN (screen)
const pp = plotPolar(() => 10, { domain: [0, 90], samples: 2, center: { x: 0, y: 0 } })
check('polar 90° → y+10', pp.points[1]!.y, 10, 1e-9)

// plotParametric unit circle
const para = plotParametric((t) => [Math.cos(t), Math.sin(t)], { domain: [0, 2 * Math.PI], samples: 200 })
check('parametric radius ≈ 1', para.points[50]!.length, 1, 1e-3)

// ── Segment intersection respects endpoints ─────────────────────────
const s1 = intersectSegmentSegment(line(point(0, 0), point(1, 0)), line(point(2, 0), point(3, 0))).points
check('disjoint segments: no hit', s1.length, 0)
const s2 = intersectSegmentCircle(line(point(5, 0), point(6, 0)), circle(origin, 1)).points
check('segment missing circle: no hit', s2.length, 0)

// arcThrough: semicircle through (0,0),(0,10),(10,0)? pick 3 pts on circle r=5 c=(5,0)
const at = arcThrough(point(0, 0), point(5, 5), point(10, 0))
check('arcThrough center x', at.center.x, 5, 1e-6)
check('arcThrough radius', at.radius, 5, 1e-6)

// lineFromAngle: 90° = down
const lfa = lineFromAngle(point(0, 0), 90, 10)
check('lineFromAngle 90° down', lfa.end.y, 10, 1e-9)

// Transform: translation then point transform
const T = Transform.translation(100, 50)
check('translation maps origin', JSON.stringify(T.apply(origin).toArray()), JSON.stringify([100, 50]))

// ── Edge routing: bend left of travel ───────────────────────────────
// A→B going east (+x). bendAngle>0 should bow the path DOWN-screen?
// TikZ: bend left of travel = toward north for eastward travel (y-up).
// Screen: left of +x travel is -y (up on screen). Control point should
// have y < start y.
const pic = picture()
pic.edge(point(0, 100), point(100, 100), { bendAngle: 45 })
const svg = pic.toSVG({ width: 200, height: 200 })
const m = svg.match(/d="M ([\d.]+) ([\d.]+) [QC] ([\d.]+) ([\d.-]+)/)
if (m) {
  const cy = parseFloat(m[4]!)
  check('bend left of eastward travel curves UP-screen (cy < 100)', cy < 100, true)
} else {
  check('bend edge path parse', 'no match', 'matched')
}

console.log(results.join('\n'))
const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`\n${results.length - fails.length} pass, ${fails.length} FAIL`)
