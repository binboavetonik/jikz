<script setup lang="ts">
/**
 * TikZ on the left; the picture and the ejected TypeScript on the
 * right. Runs the parser from the repository (`parser/src`) against
 * the live library, so the playground is exactly what `tikz(pic)`
 * does — errors included, with their line and column.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { katexAdapter } from 'jikz'
import { tikzPicture, toTypeScript } from '../../../parser/src/index'
import paths from '../../../parser/corpus/paths.tex?raw'
import nodes from '../../../parser/corpus/nodes.tex?raw'
import options from '../../../parser/corpus/options.tex?raw'
import styles from '../../../parser/corpus/styles.tex?raw'
import structure from '../../../parser/corpus/structure.tex?raw'

const DEFAULT = String.raw`\begin{tikzpicture}[>=stealth, node distance=2cm]
  \tikzset{state/.style={draw, circle, minimum size=1cm}}
  \node[state] (a) at (0,0) {$q_0$};
  \node[state, right=of a] (b) {$q_1$};
  \node[state, accepting/.style={double}, double, right=of b] (c) {$q_2$};
  \draw[->] (a) to[bend left] node[above] {0} (b);
  \draw[->] (b) to[bend left] node[below] {1} (a);
  \draw[->] (b) -- node[above] {0} (c);
  \path[->] (c) edge[loop above] node {1} (c);
  \draw[thick, red] (0,-1.5) -- +(1,0) -- +(1,0.5) coordinate (p);
  \draw[dashed] (p) -- (c.south);
\end{tikzpicture}`

const PRESETS: { title: string; tex: string }[] = [
  { title: 'Automaton', tex: DEFAULT },
  { title: 'Paths', tex: paths },
  { title: 'Nodes', tex: nodes },
  { title: 'Options', tex: options },
  { title: 'Styles', tex: styles },
  { title: 'Scopes, foreach, calc', tex: structure },
]

const source = ref(DEFAULT)
const svg = ref('')
const code = ref('')
const error = ref('')
const tab = ref<'picture' | 'code'>('picture')
const copied = ref(false)

/** KaTeX, when the site's script has loaded it (see config.mts). */
function math() {
  const katex = (globalThis as { katex?: Parameters<typeof katexAdapter>[0] }).katex
  return katex ? { mathRenderer: katexAdapter(katex) } : {}
}

function run() {
  try {
    const pic = tikzPicture.source(source.value, math())
    svg.value = pic.toSVG({ fit: true, padding: 12 })
    code.value = toTypeScript(source.value, { shape: 'module' })
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(source, () => {
  clearTimeout(timer)
  timer = setTimeout(run, 150)
})
run()
// KaTeX is a deferred script: render again once it is there.
onMounted(() => {
  if (!('katex' in globalThis)) window.addEventListener('load', run, { once: true })
})

const lines = computed(() => source.value.split('\n').length)

async function copy() {
  await navigator.clipboard.writeText(code.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <div class="tz-play">
    <header class="tz-head">
      <div>
        <h1 class="tz-title">TikZ playground</h1>
        <p class="tz-sub">
          TikZ notation on the left, what <code>tikz(pic)</code> makes of it on the right —
          the picture, or the TypeScript it stands for.
          <a href="./reference/tikz">Reference</a> ·
          <a href="./concepts/tikz-support">what is supported</a>.
        </p>
      </div>
      <label class="tz-preset">
        Example
        <select @change="source = PRESETS[Number(($event.target as HTMLSelectElement).value)]!.tex">
          <option v-for="(p, i) in PRESETS" :key="p.title" :value="i">{{ p.title }}</option>
        </select>
      </label>
    </header>

    <div class="tz-panes">
      <div class="tz-pane">
        <textarea v-model="source" class="tz-editor" spellcheck="false" :rows="Math.max(18, lines + 1)"></textarea>
      </div>
      <div class="tz-pane">
        <nav class="tz-tabs">
          <button class="tz-tab" :class="{ active: tab === 'picture' }" @click="tab = 'picture'">Picture</button>
          <button class="tz-tab" :class="{ active: tab === 'code' }" @click="tab = 'code'">TypeScript</button>
          <button v-if="tab === 'code'" class="tz-copy" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
        </nav>
        <pre v-if="error" class="tz-error">{{ error }}</pre>
        <div v-show="tab === 'picture'" class="tz-canvas" :class="{ stale: error }" v-html="svg"></div>
        <pre v-show="tab === 'code'" class="tz-code" :class="{ stale: error }">{{ code }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tz-play { padding: 24px 32px 48px; max-width: 1400px; margin: 0 auto; }
.tz-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
.tz-title { font-size: 28px; font-weight: 600; margin: 0 0 4px; }
.tz-sub { margin: 0; color: var(--vp-c-text-2); max-width: 60ch; }
.tz-preset { display: flex; gap: 8px; align-items: center; font-size: 14px; color: var(--vp-c-text-2); }
.tz-preset select { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 4px 8px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.tz-panes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .tz-panes { grid-template-columns: 1fr; } }
.tz-pane { min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; background: var(--vp-c-bg-soft); }
.tz-editor { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 0; resize: vertical; font: 13px/1.5 var(--vp-font-family-mono); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); outline: none; }
.tz-tabs { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid var(--vp-c-divider); align-items: center; }
.tz-tab { padding: 4px 12px; border-radius: 6px; border: 0; background: transparent; color: var(--vp-c-text-2); font-size: 13px; cursor: pointer; }
.tz-tab.active { background: var(--vp-c-bg); color: var(--vp-c-text-1); box-shadow: 0 0 0 1px var(--vp-c-divider); }
.tz-copy { margin-left: auto; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-2); font-size: 12px; cursor: pointer; }
.tz-error { margin: 0; padding: 10px 14px; font: 12px/1.5 var(--vp-font-family-mono); color: var(--vp-c-danger-1); background: var(--vp-c-danger-soft); white-space: pre-wrap; border-bottom: 1px solid var(--vp-c-divider); }
.tz-canvas { padding: 16px; background: #fff; min-height: 300px; display: grid; place-items: center; overflow: auto; }
.tz-canvas :deep(svg) { max-width: 100%; height: auto; }
.tz-code { margin: 0; padding: 12px 14px; font: 12.5px/1.5 var(--vp-font-family-mono); white-space: pre; overflow: auto; min-height: 300px; max-height: 70vh; }
.stale { opacity: 0.45; }
</style>
