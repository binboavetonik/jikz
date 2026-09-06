/**
 * Audit probes — numerical sanity checks against known values.
 * Not a test file: prints PASS/FAIL lines for manual review.
 */
import {
  point, polar, circle, ellipse, line, triangle, arc,
  intersectLineCircle, intersectCircleCircle, intersectLineLine,
  circleThrough, rectFit, path, smoothPath, subPath, offsetPath,
  snakePath, zigzagPath, arcFromBulge,
} from '../src/index'

const results: string[] = []
function check(name: string, actual: unknown, expected: unknown, eps = 1e-6) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e || (typeof actual === 'number' && typeof expected === 'number' && Math.abs(actual - expected) < eps)
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${a} want ${e}`)
}

// polar: 0°=east, 90°=south (screen)
check('polar(0,10).x', polar(0, 10).x, 10)
check('polar(0,10).y', polar(0, 10).y, 0)
check('polar(90,10).y', polar(90, 10).y, 10)
check('polar(270,10).y', polar(270, 10).y, -10)

// point ops
check('toward 0.5 x', point(0, 0).toward(point(10, 20), 0.5).x, 5)
check('horAt = (this.x, other.y)', JSON.stringify(point(1, 2).horAt(point(3, 4)).toArray()), JSON.stringify([1, 4]))
check('verAt = (other.x, this.y)', JSON.stringify(point(1, 2).verAt(point(3, 4)).toArray()), JSON.stringify([3, 2]))

// circle-line intersection: unit circle at origin, horizontal line y=0 → ±1
const hits = intersectLineCircle(line(point(-2, 0), point(2, 0)), circle(point(0, 0), 1)).points
check('line∩circle count', hits.length, 2)
check('line∩circle x0', hits[0]?.x ?? 0, -1, 1e-9)

// circle-circle: two unit circles at (±0.5,0) → x=0, y=±√(1-0.25)
const cc = intersectCircleCircle(circle(point(-0.5, 0), 1), circle(point(0.5, 0), 1)).points
check('circle∩circle count', cc.length, 2)
check('circle∩circle y', Math.abs(cc[0]?.y ?? 0), Math.sqrt(0.75), 1e-9)

// circleThrough: right triangle 3-4-5 → hypotenuse is diameter
const c = circleThrough(point(0, 0), point(3, 0), point(0, 4))!
check('circleThrough center x', c.center.x, 1.5, 1e-9)
check('circleThrough center y', c.center.y, 2, 1e-9)
check('circleThrough r', c.radius, 2.5, 1e-9)

// ellipse foci: a=5,b=3 → c=4
const el = ellipse(point(0, 0), 5, 3)
check('ellipse focus x', el.foci[0]?.x ?? 0, -4, 1e-9)

// triangle centers: equilateral → all coincide
const eq = triangle(point(0, 0), point(2, 0), point(1, Math.sqrt(3)))
check('equilateral G≡O', eq.centroid.equals(eq.circumcenter, 1e-9), true)
check('equilateral G≡I', eq.centroid.equals(eq.incenter, 1e-9), true)

// right triangle: circumcenter = midpoint of hypotenuse
const rt = triangle(point(0, 0), point(6, 0), point(0, 8))
check('right tri O x', rt.circumcenter.x, 3, 1e-9)
check('right tri O y', rt.circumcenter.y, 4, 1e-9)
// incenter r = (a+b-c)/2 for right triangle: (6+8-10)/2 = 2
check('right tri inradius', rt.incenter.x, 2, 1e-9)
check('right tri incenter y', rt.incenter.y, 2, 1e-9)

// arc: quarter circle from east to south (sweep cw in screen)
const q = arc(point(0, 0), 10, 0, 90)
const mid = q.pointAt(0.5)
check('arc quarter mid x', mid.x, 10 * Math.cos(Math.PI / 4), 1e-9)
check('arc quarter mid y', mid.y, 10 * Math.sin(Math.PI / 4), 1e-9)

// rectFit
const fit = rectFit([point(0, 0), point(10, 4), point(6, 8)])!
check('rectFit', JSON.stringify([fit.x, fit.y, fit.width, fit.height]), JSON.stringify([0, 0, 10, 8]))

// path length: unit square outline
const sq = path().moveTo(point(0, 0)).lineTo(point(1, 0)).lineTo(point(1, 1)).lineTo(point(0, 1)).close()
check('square perimeter', sq.length, 4, 1e-9)

// subPath of a line: middle half
const ln = path().moveTo(point(0, 0)).lineTo(point(10, 0))
const sub = subPath(ln, 0.25, 0.75)
check('subPath length', sub.length, 5, 1e-9)

// offsetPath of a horizontal line: ±d vertical shift
const off = offsetPath(ln, 5)
check('offsetPath starts at y=-5 or +5', Math.abs(off.pointAt(0).y), 5, 1e-9)

// arcFromBulge: bulge 1 = semicircle
const bulge = arcFromBulge(point(0, 0), point(10, 0), 1)
check('bulge semicircle radius', bulge.radius, 5, 1e-9)
check('bulge semicircle center y', Math.abs(bulge.center.y), 5, 1e-9)

console.log(results.join('\n'))
const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`\n${results.length - fails.length} pass, ${fails.length} FAIL`)
