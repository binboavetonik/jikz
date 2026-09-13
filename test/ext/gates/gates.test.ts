/**
 * Logic-gate extension — dogfoods the same public seams as ext/circuits:
 * registerShape, port interception under strict anchors, rotate,
 * anchor-based placement, and typed builders.
 */
import { describe, it, expect } from 'vitest'
import {
  gateShapes,
  GATE_PORTS,
  UNARY_GATE_PORTS,
  BINARY_GATE_PORTS,
  LogicGate,
  UnaryGate,
  BinaryGate,
  isUnaryGate,
  gate,
  andGate,
  notGate,
  bufferGate,
  xorGate,
  gates,
} from '../../../src/ext/gates'
import { AnchorError } from '../../../src/core/Anchor'
import { pathFromSVG } from '../../../src/path/svgPath'
import { Node } from '../../../src/node/Node'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { allShapes } from '../../../src/geometry/shapes'
import { gateShapes } from '../../../src/ext/gates'
const SHAPES = { ...allShapes, ...gateShapes }

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('gateShapes', () => {
  it('carries a kind per gate, none of them text-sizing', () => {
    for (const [name, kind] of Object.entries(gateShapes)) {
      expect(kind.kindName).toBe(name)
      expect(kind.textAutoSize).toBe(false)
    }
  })

  it('resolves by name once handed to a picture', () => {
    const pic = picture({ shapes: gateShapes })
    pic.node('A', { shape: 'nand', at: point(50, 50) })
    expect(pic.toSVG({ width: 100, height: 100 })).toContain('A 5 5 0 1 0')
  })
})

describe('gate symbol', () => {
  it('has an intrinsic default size of 70×50', () => {
    const n = new Node({ shape: SHAPES['and'], at: point(100, 100) })
    expect(n.width).toBeCloseTo(70, 6)
    expect(n.height).toBeCloseTo(50, 6)
  })

  it('honors explicit width/height and variant via shapeOptions', () => {
    const n = new Node({
      shape: SHAPES['and'],
      at: point(0, 0),
      width: 90,
      height: 40,
      shapeOptions: { variant: 'iec' },
    })
    expect(n.width).toBeCloseTo(90, 6)
    expect(n.height).toBeCloseTo(40, 6)
    const shape = n.shape as LogicGate
    expect(shape.variant).toBe('iec')
  })

  it('exposes typed ports for two-input gates', () => {
    const g = andGate()
    expectPt(g.in1, -35, -12.5, 'in1')
    expectPt(g.in2, -35, 12.5, 'in2')
    expectPt(g.out, 35, 0, 'out')
  })

  it('exposes typed in/out ports for not/buffer', () => {
    const n = notGate()
    expectPt(n.in, -35, 0, 'in')
    expectPt(n.out, 35, 0, 'out')
  })

  it('throws AnchorError for ports that do not exist', () => {
    const g = andGate()
    expect(() => g.anchor('in')).toThrow(AnchorError)
    expect(() => g.anchor('outt')).toThrow(AnchorError)
  })

  it('the error names the ports this shape does answer to', () => {
    expect(() => andGate().anchor('outt')).toThrow(/"in1", "in2", "out"/)
    expect(() => notGate().anchor('in1')).toThrow(/"in", "out"/)
  })
})

/**
 * Arity split: a gate's CLASS carries exactly the ports it has, so
 * `andGate().in` is a compile error rather than an AnchorError at
 * render time. The compile half is pinned by assertType guards in
 * ext/gates/index.ts (tests are outside tsconfig's include); this is
 * the runtime half — the classes, the port tables, and the constants
 * that mirror them.
 */
describe('gate arity', () => {
  it('factories return the class matching the gate arity', () => {
    expect(andGate()).toBeInstanceOf(BinaryGate)
    expect(xorGate()).toBeInstanceOf(BinaryGate)
    expect(notGate()).toBeInstanceOf(UnaryGate)
    expect(bufferGate()).toBeInstanceOf(UnaryGate)
    expect(gate('nor')).toBeInstanceOf(BinaryGate)
    expect(gate('not')).toBeInstanceOf(UnaryGate)
    // Both are LogicGates — the shared geometry half.
    expect(andGate()).toBeInstanceOf(LogicGate)
    expect(notGate()).toBeInstanceOf(LogicGate)
  })

  it('builds the right class through the shape registry', () => {
    expect(gateShapes.or({ center: point(0, 0) })).toBeInstanceOf(BinaryGate)
    expect(gateShapes.not({ center: point(0, 0) })).toBeInstanceOf(UnaryGate)
    expect(new Node({ shape: SHAPES['buffer'], at: point(0, 0) }).shape).toBeInstanceOf(
      UnaryGate
    )
  })

  it('moveTo/resize preserve the subclass', () => {
    expect(andGate().moveTo(point(10, 10))).toBeInstanceOf(BinaryGate)
    expect(andGate().resize(90, 60)).toBeInstanceOf(BinaryGate)
    expect(notGate().moveTo(point(10, 10))).toBeInstanceOf(UnaryGate)
    expect(notGate().resize(90, 60)).toBeInstanceOf(UnaryGate)
  })

  it('reports its input count', () => {
    expect(andGate().inputs).toBe(2)
    expect(notGate().inputs).toBe(1)
  })

  it('isUnaryGate matches the classes it picks', () => {
    for (const kind of Object.keys(gateShapes) as (keyof typeof gateShapes)[]) {
      const g = gate(kind)
      expect(isUnaryGate(kind)).toBe(g instanceof UnaryGate)
    }
  })

  it('port constants mirror the runtime port tables', () => {
    expect([...notGate().portNames].sort()).toEqual([...UNARY_GATE_PORTS].sort())
    expect([...andGate().portNames].sort()).toEqual(
      [...BINARY_GATE_PORTS].sort()
    )
    expect([...GATE_PORTS].sort()).toEqual(
      [...new Set([...UNARY_GATE_PORTS, ...BINARY_GATE_PORTS])].sort()
    )
  })

  it("a gate answers only its own arity's input ports", () => {
    expect(() => andGate().anchor('in')).toThrow(AnchorError)
    expect(() => notGate().anchor('in1')).toThrow(AnchorError)
    expect(() => notGate().anchor('in2')).toThrow(AnchorError)
  })
})

describe('gate geometry', () => {
  it('and/nand draw a D-shape body with two input leads', () => {
    const d = andGate().toSVGPath()
    expect(d).toContain('M -35 -12.5 L -25 -12.5')
    expect(d).toContain('M -35 12.5 L -25 12.5')
    expect(d).toContain('M -25 -25 L -25 25 L 0 25 A 25 25 0 0 0 0 -25 Z')
    expect(d).toContain('M 25 0 L 35 0') // output lead
  })

  it('or/nor draw a concave-left pointed-right body', () => {
    const d = gate('or').toSVGPath()
    expect(d).toContain('A 31.25 31.25 0 0 1 -25 25 L 25 0 Z')
    // Leads run past x1 (-25) onto the concave back, not short of it.
    expect(d).toContain('M -35 -12.5 L -15.109 -12.5')
    expect(d).toContain('M -35 12.5 L -15.109 12.5')
  })

  it('xor/xnor add the exclusive arc', () => {
    const d = xorGate().toSVGPath()
    expect(d).toContain(
      'M -33 -25 A 31.25 31.25 0 0 1 -33 25 A 31.25 31.25 0 0 0 -33 -25'
    )
  })

  it('not/buffer draw a triangle', () => {
    const d = notGate().toSVGPath()
    expect(d).toContain('M -25 -25 L 25 0 L -25 25 Z')
  })

  it('negated gates draw a bubble at the output', () => {
    const d = notGate().toSVGPath()
    // The bubble is a Circle's own outline — one spelling, shared with
    // the circuit symbols that draw small circles.
    expect(d).toContain('M 25 0 A 5 5 0 1 0 35 0 A 5 5 0 1 0 25 0')
  })
})

/**
 * Structural invariants, checked by sampling the emitted path data —
 * the properties that make a gate LOOK like one gate rather than
 * disconnected strokes. These hold for every kind and variant, so they
 * catch geometry regressions the pinned path strings above cannot.
 */
describe('gate geometry invariants', () => {
  type Pt = { x: number; y: number }

  /** Subpaths of a `d` string — one per `M`. */
  function subpaths(d: string): string[] {
    return d.split(/(?=M )/).map((s) => s.trim()).filter(Boolean)
  }

  /** Evenly spaced points along a subpath (pointAt is by arc length). */
  function samples(d: string, n = 400): Pt[] {
    const p = pathFromSVG(d)
    return Array.from({ length: n + 1 }, (_, i) => p.pointAt(i / n))
  }

  function distanceTo(pt: Pt, pts: Pt[]): number {
    return Math.min(...pts.map((q) => Math.hypot(q.x - pt.x, q.y - pt.y)))
  }

  /** toSVGPath emits leads first, then the body, then output/bubble. */
  function bodyOf(g: LogicGate): string {
    return subpaths(g.toSVGPath())[g.inputs]!
  }

  const variants = ['ansi', 'iec'] as const

  for (const variant of variants) {
    for (const kind of Object.keys(gateShapes) as (keyof typeof gateShapes)[]) {
      describe(`${kind} (${variant})`, () => {
        const g = gate(kind, { variant })
        // Box: 70×50 centered on the origin; body spans x1…x2.
        const x1 = -25
        const x2 = 25

        it('every input lead ends on the body outline', () => {
          const body = samples(bodyOf(g))
          const leads = subpaths(g.toSVGPath()).slice(0, g.inputs)
          for (const lead of leads) {
            const end = pathFromSVG(lead).endPoint!
            expect(distanceTo(end, body)).toBeLessThan(0.5)
          }
        })

        it('the body spans x1…x2, so the output lead/bubble meets it', () => {
          const [minX, , maxX] = pathFromSVG(bodyOf(g)).bounds
          expect(maxX).toBeCloseTo(x2, 6)
          expect(minX).toBeCloseTo(x1, 6)
        })

        it('the body stays inside the node box', () => {
          const [, minY, , maxY] = pathFromSVG(bodyOf(g)).bounds
          expect(minY).toBeCloseTo(-25, 6)
          expect(maxY).toBeCloseTo(25, 6)
        })
      })
    }
  }

  it('holds for gates taller than they are wide', () => {
    // halfH (60) exceeds the body width (50): the nose has to flatten
    // into a half-ellipse, or it starts left of x1 and doubles back.
    const tall = gate('and', { width: 70, height: 120 })
    const [minX, , maxX] = pathFromSVG(bodyOf(tall)).bounds
    expect(maxX).toBeCloseTo(25, 6)
    expect(minX).toBeCloseTo(-25, 6)
  })

  it('the exclusive arc encloses no area, so a filled xor stays clean', () => {
    // Traced out and back: same start and end, zero net winding.
    const extra = subpaths(xorGate().toSVGPath())[3]!
    const p = pathFromSVG(extra)
    expect(p.startPoint!.x).toBeCloseTo(p.endPoint!.x, 6)
    expect(p.startPoint!.y).toBeCloseTo(p.endPoint!.y, 6)
  })
})

describe('rotation', () => {
  it('rotates the ports with the shape', () => {
    const n = new Node({ shape: gateShapes.and, at: point(100, 100), rotate: 90 })
    // out sits east when unrotated (135, 100); 90° clockwise puts it south.
    expectPt(n.anchor('out'), 100, 135, 'out')
    expectPt(n.anchor('in1'), 112.5, 65, 'in1')
    expectPt(n.anchor('in2'), 87.5, 65, 'in2')
  })

  it('typed accessors read the UNROTATED instance — go through the picture', () => {
    const g = andGate({ center: point(100, 100) })
    const pic = picture()
    pic.node('A', { shape: g, rotate: 90 })

    // The instance never learns about the rotation: Node rotates a copy.
    expectPt(g.in1, 65, 87.5, 'instance in1')
    // The picture resolves the port on the rotated node.
    expectPt(pic.resolve('A.in1'), 112.5, 65, 'resolved in1')
  })
})

describe('gates.* builders', () => {
  it('carry the gate kind, no shape set needed', () => {
    expect(gates.xnor({ at: point(0, 0) }).shape).toBe(gateShapes.xnor)
  })

  it('pass the variant through as shapeOptions', () => {
    expect(gates.and({ variant: 'iec' }).shapeOptions).toEqual({ variant: 'iec' })
    expect(gates.and().shapeOptions).toBeUndefined()
    const n = new Node(gates.nor({ at: point(0, 0), variant: 'iec' }))
    expect((n.shape as LogicGate).variant).toBe('iec')
  })
})

describe('gates through the picture', () => {
  it('renders gates and wires ports by name', () => {
    const pic = picture({ shapes: SHAPES })
    pic.node('A', gates.and({ at: point(60, 40) }))
    pic.node('N', gates.not({ at: point(160, 40) }))
    pic.edge('A.out', 'N.in', { arrowEnd: 'none' })
    const svg = pic.toSVG({ width: 220, height: 80 })

    expect(svg).toContain('<path') // gate bodies + edge
    expect(svg).toContain('A 25 25 0 0 0') // AND D-shape arc
    expect(svg).toContain('A 5 5 0 1 0') // bubble present
  })

  it('createShape builds gates by name', () => {
    const g = gateShapes.and({ center: point(0, 0) }) as LogicGate
    expect(g.type).toBe('and')
    expectPt(g.out, 35, 0)
  })
})
