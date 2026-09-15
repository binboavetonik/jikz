<script setup lang="ts">
/**
 * The landing page: every example in examples/ rendered live, as a
 * showcase grid. The data comes straight from examples/manifest.ts —
 * each card's preview is the module's default export run against a
 * container, and its Code panel is the module's raw source — so the
 * gallery can never drift from the library.
 *
 * Rendering is lazy: a card renders the first time it scrolls near the
 * viewport (100 examples, some animated or with pan/zoom controllers).
 * Category chips hide and show cards; they never re-render them.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { demos, CATEGORY_INFO, type Demo, type DemoCategory } from '../../../examples/manifest'

const REPO = 'https://github.com/binboavetonik/jikz'

type Filter = 'all' | DemoCategory
const selected = ref<Filter>('all')
const showingCode = reactive(new Set<string>())
const copied = ref<string | null>(null)
const errors = reactive(new Map<string, string>())

const counts = computed(() => {
  const c = new Map<string, number>()
  for (const d of demos) c.set(d.category, (c.get(d.category) ?? 0) + 1)
  return c
})
const chips = computed(() => [
  { key: 'all' as Filter, title: 'All', count: demos.length },
  ...CATEGORY_INFO.map(([key, title]) => ({ key: key as Filter, title, count: counts.value.get(key) ?? 0 })),
])
const blurb = computed(() => CATEGORY_INFO.find(([key]) => key === selected.value)?.[2] ?? '')
const visible = (d: Demo) => selected.value === 'all' || d.category === selected.value

// ── lazy rendering ──────────────────────────────────────────────────────
const containers = new Map<string, HTMLElement>()
const rendered = new Set<string>()
let observer: IntersectionObserver | undefined

function setContainer(id: string, el: unknown) {
  if (el instanceof HTMLElement) {
    containers.set(id, el)
    observer?.observe(el)
  }
}

function renderInto(id: string) {
  if (rendered.has(id)) return
  const el = containers.get(id)
  const demo = demos.find((d) => d.id === id)
  if (!el || !demo) return
  rendered.add(id)
  try {
    demo.render(el)
  } catch (e) {
    errors.set(id, e instanceof Error ? e.message : String(e))
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const id = (entry.target as HTMLElement).dataset.demo
        if (id) {
          renderInto(id)
          observer?.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '800px 0px' },
  )
  for (const el of containers.values()) observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

// A category is at most a couple of dozen cards and each renders in about
// a millisecond, so when one is chosen render all of it at once: no empty
// frames while the observer catches up with the new layout.
watch(selected, (cat) => {
  if (cat === 'all') return
  for (const d of demos) if (d.category === cat) renderInto(d.id)
})

// ── card actions ────────────────────────────────────────────────────────
function toggleCode(id: string) {
  if (showingCode.has(id)) showingCode.delete(id)
  else showingCode.add(id)
}

async function copy(d: Demo) {
  try {
    await navigator.clipboard.writeText(d.source)
    copied.value = d.id
    setTimeout(() => { if (copied.value === d.id) copied.value = null }, 1500)
  } catch {
    /* clipboard unavailable (insecure context); the text is selectable */
  }
}

const sourceUrl = (d: Demo) => `${REPO}/blob/master/examples/${d.id}.ts`
</script>

<template>
  <div class="jz-gallery">
    <header class="jz-hero">
      <div>
        <span class="jz-wordmark">jikz</span>
        <p class="jz-tagline">TikZ-style diagrams in TypeScript, rendered to SVG.</p>
      </div>
      <div class="jz-actions">
        <a class="jz-btn jz-btn-primary" :href="withBase('/tutorials/01-first-picture')">Get started</a>
        <a class="jz-btn" :href="REPO" target="_blank" rel="noopener">GitHub</a>
      </div>
    </header>

    <nav class="jz-chips" aria-label="Example categories">
      <button
        v-for="chip in chips"
        :key="chip.key"
        class="jz-chip"
        :class="{ active: selected === chip.key }"
        @click="selected = chip.key"
      >
        {{ chip.title }} <span class="jz-count">{{ chip.count }}</span>
      </button>
    </nav>
    <p v-if="blurb" class="jz-blurb">{{ blurb }}</p>

    <div class="jz-grid">
      <article
        v-for="d in demos"
        v-show="visible(d)"
        :key="d.id"
        class="jz-card"
        :class="{ 'is-code': showingCode.has(d.id) }"
      >
        <div v-show="!showingCode.has(d.id)" class="jz-preview" :title="d.description">
          <div :ref="(el) => setContainer(d.id, el)" :data-demo="d.id" class="jz-canvas"></div>
          <pre v-if="errors.get(d.id)" class="jz-error">{{ errors.get(d.id) }}</pre>
        </div>
        <div v-if="showingCode.has(d.id)" class="jz-codewrap">
          <div class="jz-codehead">
            <span class="jz-desc">{{ d.description }}</span>
            <button class="jz-copy" @click="copy(d)">{{ copied === d.id ? 'Copied' : 'Copy' }}</button>
          </div>
          <pre class="jz-code">{{ d.source }}</pre>
          <p class="jz-hint">
            Drop it into <code>diagram.ts</code>, then
            <code>import render from './diagram'; render(el)</code>.
          </p>
        </div>
        <footer class="jz-foot">
          <h3 class="jz-title">{{ d.title }}</h3>
          <button
            class="jz-toggle"
            :class="{ active: showingCode.has(d.id) }"
            :aria-pressed="showingCode.has(d.id)"
            title="Show the code"
            @click="toggleCode(d.id)"
          >&lt;/&gt;</button>
          <a class="jz-src" :href="sourceUrl(d)" target="_blank" rel="noopener">source ↗</a>
        </footer>
      </article>
    </div>
  </div>
</template>
