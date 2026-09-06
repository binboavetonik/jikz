#!/usr/bin/env node
/**
 * `npm run dev` — start BOTH dev servers with fixed ports and
 * cross-linked headers:
 *
 *   demo page  → http://localhost:5173/demo/index.html
 *   docs site  → http://localhost:5174/
 *
 * (root of :5173 redirects to the demo page)
 */
import { spawn } from 'node:child_process'

const procs = [
  spawn('npx', ['vite', '--port', '5173', '--strictPort'], { stdio: 'inherit' }),
  spawn('npx', ['vitepress', 'dev', 'docs', '--port', '5174', '--strictPort'], { stdio: 'inherit' }),
]

const shutdown = () => {
  for (const p of procs) p.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

for (const p of procs) {
  p.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`dev server exited with code ${code} — shutting down the other`)
      shutdown()
    }
  })
}
