/**
 * Contact sheets of the example gallery — the eyeball half of "does it
 * look right", for the judgements the layout checker cannot make
 * (is the figure the thing it claims to be, is it legible, is it
 * balanced).
 *
 * Renders every example headlessly, tiles them into square sheets of
 * nine as ONE svg per sheet, and rasterises each sheet so it can be
 * opened — or handed to a model — without a browser. Rasterising uses
 * whichever of `rsvg-convert`, `resvg` or macOS `qlmanage` is on PATH;
 * with none, the .svg sheets are still written.
 *
 * Output goes to a gitignored scratch dir — these are review artifacts,
 * not deliverables. The deliverable thumbnails are docs/cookbook/img/,
 * written by `npm run docs:cookbook`. NEITHER is ever hand-edited: fix
 * `examples/*.ts` and regenerate.
 *
 * Run: npm run preview:examples            (all, 3×3 sheets)
 *      npm run preview:examples -- venn free-body
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { renderExamples } from './render-examples'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.preview')

const COLS = 3, PER_SHEET = 9, CELL_W = 380, CELL_H = 300, PAD = 12, CAPTION = 18

/** First rasteriser on PATH, as [command, args(input, output)]. */
function rasteriser(): ((svg: string, png: string) => void) | undefined {
  const has = (bin: string) => {
    try {
      execFileSync('which', [bin], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
  if (has('rsvg-convert'))
    return (svg, png) => execFileSync('rsvg-convert', ['-w', '2000', '-o', png, svg])
  if (has('resvg')) return (svg, png) => execFileSync('resvg', ['-w', '2000', svg, png])
  if (has('qlmanage'))
    // Writes <name>.svg.png into the -o directory, hence the rename step.
    return (svg, png) =>
      execFileSync('qlmanage', ['-t', '-s', '2000', '-o', dirname(png), svg], {
        stdio: 'ignore',
      })
  return undefined
}

const rendered = renderExamples(process.argv.slice(2))
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const sheets: (typeof rendered)[] = []
for (let i = 0; i < rendered.length; i += PER_SHEET) {
  sheets.push(rendered.slice(i, i + PER_SHEET))
}

const raster = rasteriser()
for (const [index, group] of sheets.entries()) {
  const rows = Math.ceil(group.length / COLS)
  // Square: the macOS thumbnailer crops a non-square page to fit.
  const size = Math.max(
    COLS * (CELL_W + PAD) + PAD,
    rows * (CELL_H + PAD + CAPTION) + PAD
  )
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
      `viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#fff"/>`,
  ]

  group.forEach(({ demo, html }, i) => {
    const col = i % COLS, row = Math.floor(i / COLS)
    const cx = PAD + col * (CELL_W + PAD)
    const cy = PAD + row * (CELL_H + PAD + CAPTION)

    // Flattened into a <g transform>, not a nested <svg>: not every
    // rasteriser honours width/height on an inner svg, and a cell that
    // silently renders 1:1 reads as "the example is clipped".
    const open = html.match(/<svg([^>]*)>/)
    const vb = open?.[1]?.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${CELL_W} ${CELL_H}`
    const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number) as [number, number, number, number]
    const body = html.slice(html.indexOf('>', html.indexOf('<svg')) + 1, html.lastIndexOf('</svg>'))
    const scale = Math.min(CELL_W / vw, CELL_H / vh)

    parts.push(
      `<text x="${cx}" y="${cy + 13}" font-family="sans-serif" font-size="13" fill="#b91c1c">${demo.id}</text>`,
      `<rect x="${cx}" y="${cy + CAPTION}" width="${CELL_W}" height="${CELL_H}" fill="none" stroke="#e2e8f0"/>`,
      `<g transform="translate(${(cx + (CELL_W - vw * scale) / 2 - vx * scale).toFixed(2)} ` +
        `${(cy + CAPTION + (CELL_H - vh * scale) / 2 - vy * scale).toFixed(2)}) ` +
        `scale(${scale.toFixed(4)})">${body}</g>`
    )
  })

  parts.push('</svg>')
  const name = `sheet-${String(index).padStart(2, '0')}`
  const svgPath = join(OUT, `${name}.svg`)
  writeFileSync(svgPath, parts.join(''))
  raster?.(svgPath, join(OUT, `${name}.png`))
}

console.log(
  `${rendered.length} examples → ${sheets.length} sheet(s) in .preview/` +
    (raster ? '' : '\n(no rasteriser found — install rsvg-convert or resvg for PNGs)')
)
