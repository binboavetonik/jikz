# Reference: ext/dataviz

The data-visualization extension — jikz's
`\usetikzlibrary{datavisualization}`. Scaled axes with nice ticks and
gridlines, a legend, and line/scatter/bar series builders. Ships in
the package; nothing to register — it is pure drawing on the public
container verbs, so it composes with any shape set. Full API:
<a href="../api/index.html" target="_blank">generated reference</a> (`npm run docs:api`).

## Setup

```ts
import { picture, point } from '@ozan.e/jikz'
import { chart, axes, legend } from '@ozan.e/jikz/dataviz'

const pic = picture()
```

Two levels, like TikZ's: `chart()` infers and draws everything;
`axes()` + `legend()` are the pieces for layouts the builder doesn't
anticipate.

## The one-call builder

```ts
chart(pic, {
  at: point(50, 230), width: 320, height: 180,
  x: { label: 'n', ticks: 5 },
  y: { label: 'ms', grid: true },
  series: [
    { data: [[1, 4], [2, 9], [3, 15]], label: 'measured',
      style: { stroke: '#2563eb' }, marks: 'o' },
    { data: [[1, 5], [2, 8], [3, 14]], label: 'predicted',
      style: { stroke: '#dc2626', dash: 'dashed' }, smooth: true },
  ],
  legend: true,
})
```

Domains default to `'auto'` — the data extent of all series, widened
to nice tick boundaries (bar series pin the y baseline at 0). Pass
`[min, max]` per axis to pin the range.

Labeled series collect into a legend. `legend: true` frames it and
auto-places it in whichever inside corner of the plot area holds the
fewest series samples — on a rising line that is the north-west, not
the conventional north-east, which is where the data is. Name a
placement with `legend: { place: 'below' }` (see the legend section),
pin one with `legend: { at: point(…) }`, and drop the box with
`legend: { frame: false }`. Series without a `style` take their colour
from the style sheet (below), and the legend shows the effective paint.

## The pieces: axes() and the ChartFrame

`axes()` draws gridlines, axes, ticks and labels, and returns a
`ChartFrame` — the two scales (data → picture coords) plus series
builders, so custom drawing stays in data space:

```ts
const frame = axes(pic, {
  at: point(50, 220), width: 360, height: 180,
  x: { domain: [0.5, 4.5], exact: true, tickValues: [1, 2, 3, 4],
       format: (v) => `Q${v}` },
  y: { domain: [0, 80], grid: true },
})

frame.line(series, { style: { stroke: '#2563eb' }, marks: 'o' })
frame.scatter(samples, { marks: { name: 'cross', size: 6 } })
frame.bars([[1, 42], [2, 58]], { style: { fill: '#f59e0b', stroke: 'none' } })

// the frame's scales are yours too — a goal line that can't drift
// from the grid:
pic.draw(line(frame.point(0, 50), frame.point(4.5, 50)), { style: { stroke: '#dc2626', dash: 'dashed' } })
```

| AxisOptions | meaning |
|---|---|
| `domain: [min, max]` | data range; widened to nice steps unless `exact` |
| `categories: [...]` | a band axis — one band per name (see below) |
| `logarithmic: true` | TikZ `logarithmic`: positions linear in log₁₀, decades as major ticks, 2…9 as minor, domain widened to whole decades; must be positive |
| `scale: { forward, inverse? }` | TikZ's axis `function`: positions linear in `forward(value)`. Ticks are round data values chosen to sit **evenly on the page** (±10 through a winning-chance sigmoid gives −10, −3, 0, 3, 10, not the data-even −10, −5, 0, 5, 10 bunched at the ends); a steep function with meaningful levels still wants `tickValues`. `inverse` is optional — a monotone `forward` is inverted numerically |
| `time: true` or `{ timeZone, locale }` | a time axis (see below) |
| `ticks: n` | desired tick count (default 5) — the step is the round one whose count on this axis is nearest `n` |
| `about` | which round steps are allowed: `'standard'` (1/2/5, and 2.5 when clearly nearer the count), `'decimal'`, `'half'`, `'quarter'`, `'int'` (never fractional) — TikZ's `about strategy`; `'heckbert'` for the pre-0.10 rounding |
| `minTicks: n` | the fewest ticks a step may leave (default 2) |
| `tickValues: [...]` | explicit ticks |
| `alsoAt: [...]` | extra labelled ticks — TikZ `also at` |
| `minorTicks: n` | n minor ticks between majors — TikZ `minor steps between steps` |
| `includeValue` | widen the domain to include a value or values — TikZ `include value` |
| `padding` | extra room beyond the domain, data units, one value or `[min, max]` |
| `exact: true` | keep the domain verbatim; outlying ticks drop off |
| `label` | axis label |
| `grid` | `true`/`'major'`, `'minor'`, `'both'` |
| `format: (v) => string` | tick label formatter |
| `tickLabels: false` | ticks without labels |
| `labelEvery: n` | label every n-th tick |
| `rotateLabels: deg` | rotate tick labels (x labels anchor at the tick) |
| `stackLabels: true` | stagger x labels over two rows — TikZ `stack` |

And on `axes()` itself: `axisSystem: 'scientific' | 'schoolBook'`
(TikZ's two systems — the default puts the axes on the low edges;
school book runs them through the origin with arrow tips, centred
ticks, end labels and a single 0, the function-plot look),
`tickSide: 'outer' | 'inner' | 'both'`, `labelStyle: 'standard' |
'end'`, `arrows`, `minorTickSize`, `minorGridStyle`, and `clip: true`
to clip everything drawn through the frame to the plot area (recharts'
default; TikZ never clips, so neither does jikz unless asked).

```ts
const frame = axes(pic, {
  at, width: 380, height: 220,
  axisSystem: 'schoolBook',
  x: { domain: [-6, 6], exact: true, label: 'x', minorTicks: 1 },
  y: { domain: [-5, 5], exact: true, label: 'y', about: 'int' },
  clip: true,
})
frame.fn((x) => Math.sin(x) * x, { label: 'x·sin x', labelInData: 'end' })
```

**Too few ticks?** `ticks` is honoured by searching the round steps
for the count nearest it, so a padded hundred-point range asked for
four gets four at 25 rather than two at 50. `about: 'quarter'` allows
the 2.5 rung freely, `minTicks` sets a floor, and `tickValues` or
`alsoAt` place ticks by hand.

`clip: true` also means labels follow the clip: a direct label, value
label or reference label anchored off the plot area is not drawn, and
`hitTest` only returns samples on it. `frame.clipped` says which.

`frame.xMinorTicks`/`yMinorTicks` list the minor ticks drawn;
`logScale()`, `logTicks()`, `minorTicksBetween()` and
`formatLogTick()` (`10ⁿ` beyond a thousandth and ten thousand) are
exported.

Flat domains (`tickValues: [5]`, `domain: [3, 3]`) widen by ±0.5
instead of throwing. A non-finite sample (NaN, ±Infinity, a missing
field) is a **gap**: it is never drawn, and a line breaks there — TikZ's
`outlier`, recharts' `connectNulls={false}`. Pass `connectGaps: true`
to join the neighbours instead.

## Data: pairs or records

Every series builder takes `[x, y]` pairs or records with accessors —
a field name or a function per axis. A `Date` becomes epoch
milliseconds; anything else non-numeric becomes a gap:

```ts
frame.line({ rows, x: 'week', y: 'tickets' })
frame.line({ rows, x: (r) => new Date(r.day), y: (r) => r.hits / 1000 })
```

`toSeries(data)` is the normalizer, exported for custom drawing.

## The chart model

The frame **remembers** every series it draws. Each builder takes an
`id` (default `series-<n>`, unique within the frame) and a `label`,
and records the drawable samples in data and picture space:

```ts
frame.line(a, { id: 'measured', label: 'measured', marks: 'o' })
frame.series                 // [{ id, kind, label, style, data, points, className }]
frame.seriesById('measured')
```

Every element a series paints carries `class="jikz-series
jikz-series-<id>"` and `data-series="<id>"`; per-point elements (marks,
bars) add `data-index`. That is the hook for CSS (`.jikz-series-measured
{ opacity: .3 }`) and for the interaction layer — highlight, hide, or
find a series without re-deriving anything from the SVG. `chart()`
takes the same `id` per series spec.

The scales map **both ways**. `frame.xScale`/`yScale` are `Scale`
objects — `kind`, `domain`, `range`, `map(v)`, `invert(px)`,
`ticks(count)`, `format(v)` — and `frame.invertX(px)`/`invertY(py)`
are the shortcuts. `frame.contains(p)` tests the plot area.

`frame.plotArea` is the plot rectangle and `frame.outerArea` the
rectangle including the axis decorations. `frame.hitTest(p, options)`
is what a tooltip asks: the samples nearest a picture point.

```ts
const hit = frame.hitTest(cursor)                       // per-series nearest x
const one = frame.hitTest(cursor, { mode: 'nearest', maxDistance: 12 })
hit?.samples   // [{ seriesId, index, x, y, at, distance }]
hit?.at        // where a crosshair snaps (the nearest sample overall)
```

| HitTestOptions | meaning |
|---|---|
| `mode: 'x'` (default) | each series' sample nearest in x — line and bar tooltips |
| `mode: 'y'` | the same along y, for horizontal layouts |
| `mode: 'nearest'` | the single sample nearest in the plane — scatter plots |
| `maxDistance` | px beyond which the result is `null` |
| `ids` | restrict to these series (hidden series stay out) |

Outside the plot area, or with nothing drawn, `hitTest` returns `null`.
Everything here is pure — the model is node-tested without a DOM.

## Themes

Every ink that is not a series colour comes from the **theme**: axes,
grid, tick and label text, legend, reference marks, the canvas colour
that gaps and rings are cut in — and the interactive layer's tooltip,
crosshair, brush and zoom box, because the frame carries its theme to
`attachChart` and `chartView`.

```ts
chart(pic, { ..., theme: 'dark' })
chart(pic, { ..., theme: { base: 'dark', surface: '#101418', accent: '#f59e0b' } })
pie(pic, { ..., theme: 'dark' }); legend(pic, { ..., theme: 'dark' }); sparkline(pic, data, { ..., theme: 'dark' })
```

`'light'` is the default and what dataviz always drew. `'dark'` is the
same roles stepped for a dark slate canvas, with `varyHueDark` as its
style sheet. An object overrides roles on a `base`; set `surface` to
the colour the chart actually sits on. The explicit options — `style`,
`gridStyle`, `textStyle`, `styleSheet`, a series' `style` — still win.

| role | paints |
|---|---|
| `axis`, `grid`, `minorGrid` | axis lines and ticks (and the crosshair), gridlines |
| `tickText`, `labelText`, `legendText` | tick and value labels; axis and direct labels; legend labels |
| `legendFrame { fill, stroke }` | the legend box |
| `reference`, `referenceArea` | reference lines, dots, error bars; reference areas and sparkline bands |
| `ink`, `bar` | unstyled series when there is no style sheet |
| `surface`, `onSeries` | the canvas colour (gaps, dot rings, hollow candles, brush handles); text on a series colour |
| `accent`, `brushStrip { stroke, fill }` | the brush window and zoom box; the brush strip |
| `candle { up, down }` | candlesticks |
| `tooltip { background, text, muted, border, shadow }` | the tooltip |
| `styleSheet` | the series palette when none is named |

`lightTheme`, `darkTheme` and `resolveTheme()` are exported;
`frame.theme` is the one a frame was built with.

**A theme of CSS variables.** A role is an opaque string, so it can
be `var(--…)`: the app defines the variables per theme and the chart
follows a theme switch live, with no re-render — the tooltip, the
overlay and the brush included, and series colours too through
`styleSheet: { colors: ['var(--series-1)', …] }`.

```ts
const theme = {
  axis: 'var(--chart-axis)', grid: 'var(--chart-grid)',
  tickText: 'var(--text-muted)', labelText: 'var(--text)',
  surface: 'var(--bg)', accent: 'var(--accent)',
  tooltip: { background: 'var(--panel)', text: 'var(--text)', muted: 'var(--text-muted)', border: 'var(--border)' },
  styleSheet: { colors: ['var(--series-1)', 'var(--series-2)'] },
}
```

This is the right tool for an app with more than light and dark;
the presets are fixed hex. It is for live pages: a standalone
`toSVG()` file carries no variables, so its inks fall back to the
browser's defaults.

**Restyling from CSS.** The tooltip's colours are custom properties
with the theme as fallback, so a host sets them on any ancestor and
needs no `!important`:

```css
.my-chart {
  --jikz-tooltip-bg: #111827;  --jikz-tooltip-text: #f9fafb;
  --jikz-tooltip-muted: #9ca3af;  --jikz-tooltip-border: #374151;
  --jikz-tooltip-shadow: 0 4px 12px rgb(0 0 0 / .5);
}
```

`tooltip: { unstyled: true }` emits no colours at all, for a host with
its own `.jikz-tooltip` rules (`-title`, `-row`, `-swatch`, `-label`,
`-value` inside). The SVG parts are painted with attributes, which
ordinary rules outrank: `.jikz-crosshair`, `.jikz-active-dot`,
`.jikz-brush-window`, `.jikz-brush-handle`, `.jikz-zoom-selection`,
and every series under `.jikz-series-<id>`.

## Time axes

`time: true` makes an axis a time axis. Samples are epoch milliseconds
or `Date`s (in pairs, records or the domain); ticks land on calendar
boundaries — midnight, the 1st, January 1st, Mondays — at a spacing
from the ladder seconds → minutes → hours → days → weeks → months →
years chosen for about `ticks` ticks; and each label says only what
changed at it: the year on January 1st, the month on the 1st, the day
at midnight, `HH:mm` within a day.

```ts
chart(pic, {
  at, width: 380, height: 170,
  x: { time: true, ticks: 8 },
  series: [{ data: { rows, x: (r) => new Date(r.day), y: 'visits' } }],
})
frame.referenceArea({ x1: new Date('2026-04-06'), x2: new Date('2026-04-10') })
```

Boundaries follow UTC by default, so a picture is the same wherever it
renders and snapshots stay stable; `time: { timeZone: 'local' }`
follows the viewer's clock and `locale` picks the label language
(`Intl.DateTimeFormat`, no dependency). `exact: true` keeps the domain
as given; otherwise it widens to the enclosing boundaries. `format`
overrides the labels. The pieces are exported: `timeScale()`,
`timeTicks()`, `formatTime()`, `chooseInterval()`, `floorTime()`,
`offsetTime()`.

## Categorical axes, grouped and stacked bars

`categories` makes an axis a **band** axis: one equal band per name,
ticks at the band centres labelled with the names, and string samples
resolving to their band. Bars fill their band by default; unstacked
bar series group side by side inside it, and `stack` piles them:

```ts
chart(pic, {
  at, width: 360, height: 180,
  x: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] },
  y: { grid: true },
  series: [
    { data: [['Q1', 42], ['Q2', 58]], kind: 'bar', label: '2025' },        // grouped …
    { data: [['Q1', 35], ['Q2', 51]], kind: 'bar', label: '2026' },        // … side by side
    { data: [['Q1', 10], ['Q2', 12]], kind: 'bar', stack: 'ops', label: 'a' },   // stacked …
    { data: [['Q1', 4], ['Q2', 6]], kind: 'bar', stack: 'ops', label: 'b' },     // … on 'a'
  ],
})
```

`chart()` assigns the groups (each unstacked bar series and each stack
is one column) and widens the y domain to the stack totals. On a
`ChartFrame`, `bars()` takes `group: { index, count }` and `stack`
explicitly; grouped bars leave a 2px canvas gap between columns and
stacked segments a 2px gap between parts. `bandPadding` (default 0.2)
is the fraction of each step left empty around its band;
`frame.xScale.bandwidth` is the band in px.

Samples may be `[x, y]` pairs in any mix of numbers, `Date`s and
category names, or records with accessors; `toSeries(data,
categories)` normalizes them. A name that appears more than once in
the categories (month initials, say) is ambiguous and throws — give
such samples the band's index as x, and keep the names as labels.

## Series kinds

| builder / `kind` | draws |
|---|---|
| `line()` | a path through the samples; `interpolation: 'linear' \| 'smooth' \| 'step' \| 'stepBefore' \| 'stepAfter'` (`smooth: true` is the alias), `closed: true` for a cycle, `marks` at the samples |
| `area()` | a fill from the samples down to `baseline` (default 0) or, with `stack`, onto the previous series in the stack; same interpolation choices; the stroke is the top edge alone |
| `above` / `below` on `line()` and `area()` | paints for the parts above and below `baseline`, layered over the series' own — Chart.js's fill target. Each side is the whole series clipped to its half-plane, so the split is exact for any interpolation. A half changes only what it names — `fill` the area, `stroke` the line and its marks |
| `scatter()` | marks only; `style` may be a function of the sample for per-point colour (recharts' `Cell`) |
| `bars()` | vertical bars; `group`, `stack`, `width`, `baseline`, per-bar `style` function |
| `candlestick()` | TikZ's `candle stick plot`: `[x, open, high, low, close]` candles, hollow rising and solid falling (`up`/`down` paint); the series' samples are the closes |
| `fn(f, { samples, domain })` | TikZ's `function` data format: `f` sampled across the x domain and drawn as a line; NaN is a gap |
| `errorBars()` | `[x, y, ±err]` or `[x, y, low, high]` ranges with caps — a decoration, not a series; `seriesId` tags it to one |

**Marks** are `marks: 'o'` or `{ name, size, every, ring }`. `size`
is the diameter of the visible dot. `ring: true` (2px, or a width)
puts a band of the canvas colour — the theme's `surface` — round a
filled mark, *outside* it, so marks on a line and overlapping marks
read as separate dots. (A ring drawn by hand as a stroke straddles
the outline and eats into the dot; this one does not.)
`referenceDot` takes `ring` too.

Every series takes `labelInData` — `'start' \| 'end' \| 'max' \| 'min'`
or sample indices — to put its name beside the data (TikZ `label in
data`), and `valueLabels: true` (or a formatter) to print each
sample's value; bars print above their tops. `labelStyle` restyles
both.

## Reference marks

```ts
frame.referenceLine({ y: 1500, label: 'goal' })            // dashed, label at the right end
frame.referenceLine({ x: 'Q2' })
frame.referenceArea({ x1: 3, x2: 5, label: 'campaign' })  // missing bounds run to the edges
frame.referenceDot(4, 32, { label: 'peak', labelAt: 'east' })
```

recharts' `ReferenceLine`/`ReferenceArea`/`ReferenceDot`: they map
through the frame's scales, so they cannot drift from the grid, and
carry `class="jikz-reference"` (labels `jikz-reference-label`).

## Sparklines and pies

`sparkline(pic, values, { at, width, height })` is TikZ's
`datavisualization.sparklines`: a word-sized line with no axes, from
bare y values, pairs or records, with `fill`, `endMark`, a normal
`band: [low, high]`, and `interpolation`. It returns its scales and
points.

`pie(pic, { at, radius, innerRadius, slices })` draws a pie or donut:
slices take the style sheet's colours in order, sit on a 2px canvas
`gap`, and label themselves (`labels: 'percent' | 'value' | 'label' |
fn | false`) inside when they are wider than `minInsideFraction`, else
outside. Slices carry `jikz-series-<id>` and `data-series` like any
series; the result lists each slice's angles and effective paint, so
`legend()` can be built from it.

## Style sheets

No series has to name a colour. Series drawn without a `style` take
their paint from the frame's **style sheet** — TikZ's `style sheet`
mechanism, with TikZ's names:

```ts
chart(pic, { ..., styleSheet: 'varyHue' })                  // the default
chart(pic, { ..., styleSheet: ['varyHue', 'crossMarks'] })  // composed: colours + marks
chart(pic, { ..., styleSheet: { colors: BRAND } })          // your own
axes(pic,  { ..., styleSheet: null })                       // none: ink lines, slate bars
```

| sheet | varies |
|---|---|
| `varyHue` (default), `varyHueDark` | eight categorical hues, light or dark canvas |
| `strongColors` | saturated primaries (not CVD-validated) |
| `shadesOfBlue`, `shadesOfRed`, `grayScale` | one hue light→dark, for ordered series |
| `varyDashing`, `varyThickness` | line dash patterns; line widths |
| `crossMarks`, `oMark`, `starMark`, `dotMark` | the mark every series gets |

The default palette is eight hues validated for colour-vision
deficiency on adjacent series, in both modes, and assigned **in fixed
order** — series three is aqua whether or not series two is hidden. A
ninth series wraps to slot one with the next dash pattern and a
library warning (`setWarningHandler`); fewer series or small multiples
read better.

The slot is the base paint and a series' own `style` layers over it:
`style: { dash: 'dashed' }` keeps the slot colour, `style: { stroke:
'red' }` replaces it. The slot supplies, by kind: lines `stroke` and a
2px width (plus the slot's dash), bars `fill`, scatter the mark colour.
Marks come from the sheet unless the builder names one; scatter marks
default to 8px, line marks to 6px. `frame.styleSheet` is the resolved
sheet; `slotOf(sheet, i)` and `resolveStyleSheet(spec)` are exported
for custom drawing that wants the same colours.

Axes themselves are recessive — 1px slate lines, secondary ink for
tick labels, primary ink for axis labels — so the data carries the
colour. `textStyle` on `axes()` restyles both label kinds.

## Legends standalone

```ts
legend(pic, {
  at: point(300, 30),
  entries: [
    { label: '2025', style: { stroke: '#2563eb' }, mark: 'o' },
    { label: '2026', style: AMBER, sample: 'box' },   // bar series
  ],
  frame: true,                       // or a StyleSpec merged over the default
})
```

Swatches are `line` (default) or `box`; `mark` adds a plot mark at the
sample's midpoint. `legendSize(options)` returns the box a legend will
occupy — how `chart()` places its legend.

Entries fill a **grid**: one column by default, or `columns: n` /
`rows: n` (the other follows from the entry count), filled
`'downThenRight'` (default) or `'rightThenDown'` — TikZ's names. Each
column is as wide as its widest label. An entry with an `id` tags its
swatch and label with `class="jikz-legend-entry jikz-legend-<id>"` and
`data-series="<id>"`; `chart()` sets it to the series id, so a legend
row and its series share a handle for hover and toggle.

`chart()` places the legend by name — TikZ's `north east inside`,
`east outside`, `below`:

```ts
chart(pic, { ..., legend: { place: 'below' } })          // one row under the axes
chart(pic, { ..., legend: { place: 'eastOutside' } })
chart(pic, { ..., legend: { place: 'southWestInside', columns: 2 } })
```

| `place` | where |
|---|---|
| `'auto'` (default) | the inside corner holding the fewest series samples |
| `'northEastInside'` … `'southWestInside'`, `'northInside'`, `'southInside'` | inside the plot area, inset 8px, framed by default |
| `'eastOutside'`, `'westOutside'`, `'northOutside'`, `'southOutside'` and the corner variants | outside, clearing the axis decorations (`frame.outerArea`) by 10px, unframed by default |
| `'right'`, `'left'`, `'above'`, `'below'` | aliases for the four outside sides |

Above and below the axes the entries lay out in one row unless
`columns`/`rows` say otherwise. An explicit `at` wins over `place`.

## Enter animations

`enter` makes a series draw itself in, grow, or fade — recharts'
`isAnimationActive`, as declarative SMIL:

```ts
chart(pic, { ..., enter: 'draw' })                                     // every series, staggered
chart(pic, { ..., enter: { enter: 'grow', dur: '600ms', stagger: '120ms' } })
frame.line(data, { enter: { enter: 'draw', delay: '200ms', easing: 'ease-in-out' } })
```

| kind | what |
|---|---|
| `'draw'` | a line or area edge draws itself in from its start: `pathLength="1"`, a unit dash, `stroke-dashoffset` 1 → 0; an area's fill fades up to its opacity meanwhile; a dashed stroke falls back to a fade |
| `'grow'` | a bar grows from its baseline (`y` and `height` together); other kinds fade |
| `'fade'` | opacity 0 → 1 |

Timing: `dur` (default 800ms), `delay`, `easing` (`'ease-out'`
default, `'ease-in-out'`, `'linear'`, or four cubic-bezier numbers),
and on the chart `stagger` (default 80ms per series in paint order); a
series' own `enter` wins over the chart's. Marks fade in with their
line.

Every animation begins at 0 and holds its start value through the
delay, and the elements' own attributes are the end values — so a
static `toSVG()` file plays the entrance on open, and a renderer
without SMIL shows the finished chart. `chartView` plays it on the
first render and after `update()`, not on zoom, brush or resize.

## The interactive layer

Two pieces, both opt-in by import: the **adapter** and the **view**.

`attachChart(svg, frame, options)` attaches recharts' interactive
layer to a mounted chart — the svg from `pic.mount()` and the frame
from `chart()`/`axes()`:

```ts
const frame = chart(pic, spec)
const svg = pic.mount(el, { fit: true })
const ui = attachChart(svg, frame, { tooltip: true, crosshair: 'x' })
```

| option | default | what |
|---|---|---|
| `tooltip` | `true` | an HTML tooltip beside the pointer: the x value as title, one row per series with swatch, label and y value through the axes' formatters; `{ format(hit, frame) }` for your own, `className`, `offset`, `overflow` (below) |
| `crosshair` | `'x'` (none in nearest mode) | dashed lines through the hit along x, y or both |
| `activeDots` | `true` | dots on the samples under the pointer, in their series' colour |
| `highlight` | `true` | hovering a legend row dims the other series (`.jikz-dim`, opacity .25) |
| `legendToggle` | `true` | clicking a legend row hides its series (`display: none`, `.jikz-hidden` on the row) and drops it from hits |
| `hitTest` | nearest within 24px for scatter charts, else by x | passed to `frame.hitTest` |
| `cursor`, `cursorDots`, `cursorStyle` | none, `true`, accent 1.5px | a line at an x value that stays put (the current move, a playhead), with a dot on each series' sample there; `cursorStyle: { stroke, width, dash }` |
| `onHover(hit)`, `onClick(hit, event)` | | callbacks: `onClick` gets the samples under a click — `hit.samples[0].index` is the sample to navigate to, no hit rectangles needed |

**Where the tooltip goes.** Beside the pointer — below and to the
right when there is room, flipped to the other side when there is
not, and when neither side has room, on the roomier one, overflowing.
It is never slid back over the pointer. What "room" means is
`tooltip: { overflow }`:

| `overflow` | the tooltip is bounded by |
|---|---|
| `'clamp'` | the chart's container — right for a dashboard card |
| `'escape'` | the viewport: it moves to `document.body`, `position: fixed`, and is kept on screen — for a sparkline or a ribbon too small to hold its own tooltip, and the only way out of an `overflow: hidden` ancestor |
| `'auto'` (default) | the container when it can always seat the tooltip beside the pointer — at least twice the tooltip plus its offset, each way — and the viewport when it cannot |

An escaped tooltip keeps its theme: the `--jikz-tooltip-*` variables
and the swatch colours are resolved inside the chart's container and
carried along, on every show, so a live theme switch is followed.
With `unstyled: true` it carries nothing — style `.jikz-tooltip` with
a rule that reaches `<body>`. `placeTooltip()` and `tooltipFits()` are
exported for a host placing its own.

The controller it returns has `hover(at)` — run the pipeline at a
picture point, or clear it with null — and `setCursor(x)` — move the
persistent cursor, in data units, without a re-render — so two charts
can be linked by passing one's hit along; `highlight(id)`, `setVisible(id, on)`,
`toggle(id)`, `clientToUser(x, y)`, the `overlay` group it paints into
(free for callers too), and `destroy()`. Everything it does is DOM
over the model: `frame.hitTest` says what is under the pointer, the
`data-series` tags say which elements belong to it. It works inside a
pan/zoomed viewport too.

`chartDomains(spec)` returns the x and y domains a chart will have
without drawing it — the data's extent for a host that needs the
range and not the chart; the view uses it, so a render is one chart
build.

`chartView(container, spec, options)` is the loop: it renders a
`chart()` spec, attaches the adapter, and re-renders — a fresh
`picture()` + `chart()` + `mount()`, since the spec is a value — when
the x domain changes, the container resizes, or new data arrives:

```ts
const view = chartView(el, spec, { zoom: 'x', brush: true, responsive: true })
view.update({ ...spec, series: newSeries })   // zoom, hidden series, cursor and hover persist
view.setCursor(ply); view.setDomain([a, b]); view.resetZoom()
view.destroy()
```

| option | what |
|---|---|
| `zoom: 'x'` | drag across the plot area to zoom the x domain; double-click resets |
| `zoomY: 'visible' \| 'full'` | while zoomed, an auto y axis rescales to what shows in the window (default) — the samples in it, and a line's height where it crosses the window's edges, so a spike just outside does not count — or keeps the whole data's range; a pinned y domain stays pinned |
| `brush: true` or `{ height, gap, live }` | a strip under the axes showing the whole range with a window and two handles; drag to pan or resize (re-rendering on release, or live) |
| `responsive: true` | a `ResizeObserver` re-lays the chart out at the container's width |
| `fit`, `padding`, `pictureOptions` | how each render mounts |
| `batchUpdates: true` | `update()` waits for the next animation frame, so data arriving faster than it draws costs one render per frame; `flush()` renders now |
| `onDomainChange(domain \| null)` | after a zoom or brush |
| …and every `attachChart` option | |

A view with `zoom` or `brush` **clips** to the plot area (`clip:
false` in the spec opts out): it shows a window of the data, and
without the clip a zoomed series would run past the axes and drag the
fitted viewBox with it. On a clipped frame, direct labels, value
labels, reference labels and hits whose anchor is off the plot are
dropped, and `labelInData: 'end'` names the last sample still in
view.

**Streaming.** `update(spec)` re-renders with what the view already
holds: the zoom, the hidden series, the cursor, and the hover under
the pointer, so a tooltip does not blink out while results arrive.
The enter animation does not replay — an update is not an entrance —
unless `update(spec, { enter: true })` asks. The click that ends a
zoom drag or a brush drag never reaches `onClick`.

Zoom and brush apply to numeric, time and logarithmic x axes, not to
categorical ones. With a brush, put the legend inside or beside the
axes rather than `below`. The view is the one stateful object in
dataviz; it holds the spec, the domain, the hidden set and the
container's width, and nothing else.

## Under the hood

Ticks come from Heckbert's "nice numbers" (`niceTicks`/`niceNumber` in
`scale.ts` — 1/2/5×10ⁿ steps, float-noise-free); `linearScale()` wraps
them in a `Scale` object. Marks reuse
`PlotMark`; smoothing reuses `Plot`'s Catmull-Rom; legend sizing
reuses `estimateLabelSize`; series colors resolve through
`resolveStyle`, so named styles and presets work in series `style`.
Nothing here registers shapes — dataviz is the proof that a
TikZ-library-sized feature fits on the public container verbs alone.
