/**
 * One-off migration of examples/, test/, docs/ and README.md to the
 * 0.9 vocabulary. AST-driven (TypeScript compiler API); Markdown files
 * are rewritten fence by fence. Kept in the repo as the executable
 * record of the change — see CHANGELOG "Upgrading to 0.9".
 *
 *   npx vite-node scripts/codemod-0.9.ts [--dry]
 */
import ts from 'typescript'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY = process.argv.includes('--dry')

const EXT: Record<string, string[]> = {
  circuits: 'TwoTerminalSymbol twoTerminalPorts TWO_TERMINAL_PORTS OPAMP_PORTS GROUND_PORTS CIRCUIT_PORTS junctionDot wire circuit Resistor resistor RESISTOR_DEFAULT_WIDTH RESISTOR_DEFAULT_HEIGHT Capacitor capacitor CAPACITOR_DEFAULT_WIDTH CAPACITOR_DEFAULT_HEIGHT Inductor inductor INDUCTOR_DEFAULT_WIDTH INDUCTOR_DEFAULT_HEIGHT Diode diode DIODE_DEFAULT_WIDTH DIODE_DEFAULT_HEIGHT Switch createSwitch SWITCH_DEFAULT_WIDTH SWITCH_DEFAULT_HEIGHT VoltageSource CurrentSource voltageSource currentSource SOURCE_DEFAULT_WIDTH SOURCE_DEFAULT_HEIGHT Ground ground GROUND_DEFAULT_WIDTH GROUND_DEFAULT_HEIGHT OpAmp opAmp OPAMP_DEFAULT_WIDTH OPAMP_DEFAULT_HEIGHT circuitShapes CircuitShapeName CircuitBuilder TwoTerminalPort OpAmpPort GroundPort CircuitPort ResistorOptions ResistorVariant CapacitorOptions CapacitorVariant InductorOptions DiodeOptions DiodeVariant SwitchOptions SwitchVariant SourceOptions GroundOptions OpAmpOptions'.split(' '),
  gates: 'LogicGate UnaryGate BinaryGate isUnaryGate gate andGate nandGate orGate norGate xorGate xnorGate notGate bufferGate GATE_DEFAULT_WIDTH GATE_DEFAULT_HEIGHT gates gateShapes UNARY_GATE_PORTS BINARY_GATE_PORTS GATE_PORTS GateShapeName GatePort UnaryGatePort BinaryGatePort GateBuilder GateKind UnaryGateKind BinaryGateKind GateVariant LogicGateOptions'.split(' '),
  dataviz: 'chart axes ChartFrame legend legendSize linearScale niceNumber niceTicks dataDomain includeInDomain formatTick mapSeries ChartOptions ChartSeriesSpec ChartAxisOptions ChartLegendOptions AxesOptions AxisOptions FrameLineOptions FrameScatterOptions FrameBarOptions LegendOptions LegendEntry Scale NiceTicks DataSeries'.split(' '),
  petri: 'PLACE_MIN_SIZE TRANSITION_MIN_SIZE TOKEN_SIZE TOKEN_DISTANCE_RATIO TOKEN_DISTANCE_DEFAULT TOKEN_COLOR_DEFAULT TOKEN_TEXT_COLOR_DEFAULT TOKEN_FONT_SIZE PETRI_INNER_SEP MAX_LAID_OUT_TOKENS petriShapes petri petriArcs tokenPositions tokens PetriShapeName PetriBuilder Token TokenOptions'.split(' '),
  styles: 'ultraThin veryThin thin semithick thick veryThick ultraThick solid dashed dotted dashdotted denselyDashed looselyDashed denselyDotted looselyDotted red blue green orange purple black gray white fillRed fillBlue fillGreen fillOrange fillPurple fillGray fillWhite draw fillOnly patternHorizontalLines patternVerticalLines patternNorthEastLines patternNorthWestLines patternGrid patternCrosshatch patternDots patternCrosshatchDots patternFivepointedStars patternSixpointedStars patternBricks patternCheckerboard shadow shadowSm shadowLg rounded roundedSm roundedLg roundedXl roundedFull double PRESET_OBJECTS'.split(' '),
}
const ROOT_PKG = ['jikz', '@ozan.e/jikz']
const FONT_KEYS = new Set(['fontSize', 'fontFamily', 'fontWeight'])

type Edit = { start: number; end: number; text: string }

function applyEdits(src: string, edits: Edit[]): string {
  edits.sort((a, b) => b.start - a.start)
  let out = src
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  return out
}

function parse(src: string) {
  return ts.createSourceFile('x.ts', src, ts.ScriptTarget.Latest, true)
}
const txt = (n: ts.Node, sf: ts.SourceFile) => n.getText(sf)
const propName = (p: ts.ObjectLiteralElementLike) =>
  p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined
const isCall = (n: ts.Node, name: string): n is ts.CallExpression =>
  ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === name

/** Text of an object literal's members, without the braces, trimmed. */
function members(o: ts.ObjectLiteralExpression, sf: ts.SourceFile): string {
  return o.properties.map((p) => txt(p, sf)).join(', ')
}

/** Merge `extra` (object literal or expression) into object literal `into`; returns new text. */
function mergeInto(into: ts.Expression, extra: ts.Expression, sf: ts.SourceFile): string {
  const spreadOf = (e: ts.Expression) =>
    ts.isObjectLiteralExpression(e) ? members(e, sf) : `...${txt(e, sf)}`
  const a = spreadOf(into)
  const b = spreadOf(extra)
  if (!a) return `{ ${b} }`
  if (!b) return `{ ${a} }`
  if (ts.isObjectLiteralExpression(into) && txt(into, sf).includes('\n')) {
    // keep the original's multi-line shape: drop a trailing comma, then
    // append the new members as one more line.
    const ind = indentOf(into, sf)
    return txt(into, sf).replace(/,?\s*}$/, `,\n${ind}  ${b}\n${ind}}`)
  }
  return `{ ${a}, ${b} }`
}
function indentOf(n: ts.Node, sf: ts.SourceFile): string {
  const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf))
  const lineText = sf.text.split('\n')[line] ?? ''
  return lineText.match(/^\s*/)![0]
}

// ── pass 1: node(3 args) / edge(4 args) → one bag ─────────────────────
function passOptionBag(src: string): string {
  const sf = parse(src)
  const edits: Edit[] = []
  const visit = (n: ts.Node) => {
    if (isCall(n, 'node') && n.arguments.length === 3) {
      const [, geom, render] = n.arguments as unknown as [ts.Expression, ts.Expression, ts.Expression]
      edits.push({ start: geom.getStart(sf), end: render.getEnd(), text: mergeInto(geom, render, sf) })
    } else if (isCall(n, 'edge') && n.arguments.length === 4) {
      const [, , opts, render] = n.arguments as unknown as ts.Expression[]
      edits.push({ start: opts!.getStart(sf), end: render!.getEnd(), text: mergeInto(opts!, render!, sf) })
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return applyEdits(src, edits)
}

// ── pass 2: labels — `options` → `style`, nested style.stroke → fill ──
function labelStyleText(options: ts.ObjectLiteralExpression, sf: ts.SourceFile): string {
  const parts: string[] = []
  for (const p of options.properties) {
    const name = propName(p)
    if (name === 'style' && ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
      for (const q of p.initializer.properties) {
        const qn = propName(q)
        if (qn === 'stroke' && ts.isPropertyAssignment(q)) parts.push(`fill: ${txt(q.initializer, sf)}`)
        else parts.push(txt(q, sf))
      }
    } else parts.push(txt(p, sf))
  }
  return `style: { ${parts.join(', ')} }`
}
function passLabels(src: string): string {
  const sf = parse(src)
  const edits: Edit[] = []
  const isLabelLiteral = (o: ts.ObjectLiteralExpression) => {
    if (o.properties.some((p) => propName(p) === 'text')) return true
    const parent = o.parent
    return isCall(parent, 'label') && parent.arguments[1] === o
  }
  const visit = (n: ts.Node) => {
    if (ts.isObjectLiteralExpression(n) && isLabelLiteral(n)) {
      for (const p of n.properties) {
        if (propName(p) === 'options' && ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
          edits.push({ start: p.getStart(sf), end: p.getEnd(), text: labelStyleText(p.initializer, sf) })
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return applyEdits(src, edits)
}

// ── pass 3: pic.text(p, s, { fontSize, style: { stroke } }) ───────────
function passText(src: string): string {
  const sf = parse(src)
  const edits: Edit[] = []
  const visit = (n: ts.Node) => {
    if (isCall(n, 'text') && n.arguments.length === 3 && ts.isObjectLiteralExpression(n.arguments[2]!)) {
      const o = n.arguments[2] as ts.ObjectLiteralExpression
      const font: string[] = []
      const rest: string[] = []
      let styleProps: string[] = []
      let touched = false
      for (const p of o.properties) {
        const name = propName(p)
        if (name && FONT_KEYS.has(name)) { font.push(txt(p, sf)); touched = true }
        else if (name === 'style' && ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
          for (const q of p.initializer.properties) {
            const qn = propName(q)
            if (qn === 'stroke' && ts.isPropertyAssignment(q)) { styleProps.push(`fill: ${txt(q.initializer, sf)}`); touched = true }
            else styleProps.push(txt(q, sf))
          }
        } else rest.push(txt(p, sf))
      }
      if (!touched) return
      const style = [...font, ...styleProps]
      const all = [...rest, style.length ? `style: { ${style.join(', ')} }` : ''].filter(Boolean)
      edits.push({ start: o.getStart(sf), end: o.getEnd(), text: `{ ${all.join(', ')} }` })
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return applyEdits(src, edits)
}

// ── pass 4: edge labelPos/labelOffset → label: { text, pos, offset } ─
function passEdgeLabels(src: string): string {
  const sf = parse(src)
  const edits: Edit[] = []
  const visit = (n: ts.Node) => {
    if (ts.isObjectLiteralExpression(n)) {
      const pos = n.properties.find((p) => propName(p) === 'labelPos') as ts.PropertyAssignment | undefined
      const off = n.properties.find((p) => propName(p) === 'labelOffset') as ts.PropertyAssignment | undefined
      const label = n.properties.find((p) => propName(p) === 'label') as ts.PropertyAssignment | undefined
      if ((pos || off) && label) {
        const parts = [`text: ${txt(label.initializer, sf)}`]
        if (pos) parts.push(`pos: ${txt(pos.initializer, sf)}`)
        if (off) parts.push(`offset: ${txt(off.initializer, sf)}`)
        edits.push({ start: label.getStart(sf), end: label.getEnd(), text: `label: { ${parts.join(', ')} }` })
        for (const p of [pos, off]) {
          if (!p) continue
          // remove the property and its trailing comma/whitespace or leading comma
          const s = p.getFullStart()
          let e = p.getEnd()
          const after = src.slice(e).match(/^\s*,/)
          if (after) e += after[0].length
          edits.push({ start: s, end: e, text: '' })
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return applyEdits(src, edits)
}

// ── pass 5: style key renames (any object literal) ────────────────────
function passStyleKeys(src: string): string {
  return src
    .replace(/'fill-opacity':/g, 'fillOpacity:')
    .replace(/'stroke-opacity':/g, 'strokeOpacity:')
    .replace(/\bborderRadius(X|Y)?:/g, 'roundedCorners:')
}

// ── pass 6: imports — ext and preset names move to subpaths ───────────
function passImports(src: string): string {
  const sf = parse(src)
  const edits: Edit[] = []
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue
    const spec = st.moduleSpecifier.text
    if (!ROOT_PKG.includes(spec)) continue
    const clause = st.importClause
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue
    const typeOnly = clause.isTypeOnly
    const keep: string[] = []
    const moved: Record<string, string[]> = {}
    for (const el of clause.namedBindings.elements) {
      const name = (el.propertyName ?? el.name).text
      const sub = Object.keys(EXT).find((k) => EXT[k]!.includes(name))
      const text = txt(el, sf)
      if (sub) (moved[sub] ??= []).push(text)
      else keep.push(text)
    }
    if (Object.keys(moved).length === 0) continue
    const lines: string[] = []
    const kw = typeOnly ? 'import type' : 'import'
    if (keep.length) lines.push(`${kw} { ${keep.join(', ')} } from '${spec}'`)
    for (const [sub, names] of Object.entries(moved)) lines.push(`${kw} { ${names.join(', ')} } from '${spec}/${sub}'`)
    edits.push({ start: st.getStart(sf), end: st.getEnd(), text: lines.join('\n') })
  }
  return applyEdits(src, edits)
}

// ── pass 7: examples relied on the arrow default — make it explicit ──
function passArrowDefault(src: string): string {
  const sf = parse(src)
  const edits: Edit[] = []
  const visit = (n: ts.Node) => {
    if (isCall(n, 'edge') && ts.isPropertyAccessExpression(n.expression) && isPictureChain(n.expression.expression)) {
      const args = n.arguments
      const opts = args[2]
      if (args.length === 2) {
        edits.push({ start: args[1]!.getEnd(), end: args[1]!.getEnd(), text: ", { arrowEnd: 'stealth' }" })
      } else if (opts && ts.isObjectLiteralExpression(opts)) {
        // A spread may carry the tip already (`...petriArcs.post`); leave those alone.
        const has = opts.properties.some(
          (p) => ts.isSpreadAssignment(p) || ['arrowEnd', 'arrowStart'].includes(propName(p) ?? '')
        )
        if (!has) {
          const b = members(opts, sf)
          edits.push({ start: opts.getStart(sf), end: opts.getEnd(), text: b ? txt(opts, sf).replace(/^\{\s*/, "{ arrowEnd: 'stealth', ") : "{ arrowEnd: 'stealth' }" })
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return applyEdits(src, edits)
}

/** Whether a member chain hangs off a picture/scope (not a layout builder). */
function isPictureChain(e: ts.Expression): boolean {
  let cur: ts.Node = e
  while (ts.isCallExpression(cur) || ts.isPropertyAccessExpression(cur)) {
    cur = ts.isCallExpression(cur) ? cur.expression : cur.expression
  }
  if (!ts.isIdentifier(cur)) return false
  return ['pic', 'picture', 's', 'scope', 'sc', 'inner', 'outer'].includes(cur.text)
}

function migrateTs(src: string, opts: { arrows: boolean }): string {
  let s = src
  s = passOptionBag(s)
  s = passLabels(s)
  s = passText(s)
  s = passEdgeLabels(s)
  s = passStyleKeys(s)
  s = passImports(s)
  if (opts.arrows) s = passArrowDefault(s)
  return s
}

function migrateMd(src: string): string {
  return src.replace(/```(ts|typescript)\n([\s\S]*?)```/g, (_m, lang, code) => {
    try {
      return '```' + lang + '\n' + migrateTs(code, { arrows: false }) + '```'
    } catch {
      return _m
    }
  })
}

function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? ['node_modules', '.vitepress', 'api', 'cookbook', 'public'].includes(e.name) ? [] : walk(join(d, e.name))
      : /\.(ts|md)$/.test(e.name) ? [join(d, e.name)] : []
  )
}

const files = [...walk('examples'), ...walk('test'), ...walk('docs'), 'README.md']
let changed = 0
for (const f of files) {
  const before = readFileSync(f, 'utf8')
  const after = f.endsWith('.md')
    ? migrateMd(before)
    : migrateTs(before, { arrows: f.startsWith('examples') })
  if (after !== before) {
    changed++
    if (!DRY) writeFileSync(f, after)
    else console.log('would change', f)
  }
}
console.log(`codemod-0.9: ${changed} of ${files.length} files changed${DRY ? ' (dry)' : ''}`)
