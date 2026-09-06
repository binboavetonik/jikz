import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'jikz',
  description: 'TikZ-inspired coordinate and drawing library for JavaScript/TypeScript',
  // The TypeDoc output (docs/api) is generated separately by
  // `npm run docs:api` and excluded from VitePress's markdown pipeline.
  srcExclude: ['api/**'],
  // Cookbook/tutorial pages link to ../../examples/*.ts, which live
  // outside the VitePress root — they're repo links, not site pages.
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Concepts', link: '/concepts/tikz-mapping' },
      { text: 'Tutorials', link: '/tutorials/01-first-picture' },
      { text: 'Reference', link: '/reference/picture' },
      { text: 'Cookbook', link: '/cookbook/' },
    ],
    sidebar: [
      {
        text: 'Concepts',
        items: [
          { text: 'TikZ → jikz mapping', link: '/concepts/tikz-mapping' },
          { text: 'Coordinate system', link: '/concepts/coordinate-system' },
          { text: 'Two API levels', link: '/concepts/two-api-levels' },
          { text: 'ViewBox, sizing & fit', link: '/concepts/viewbox-and-fit' },
          { text: 'Node, SSR & browser', link: '/concepts/node-ssr-browser' },
        ],
      },
      {
        text: 'Tutorials',
        items: [
          { text: '1. Your first picture', link: '/tutorials/01-first-picture' },
          { text: '2. Points & coordinates', link: '/tutorials/02-points-and-coordinates' },
          { text: '3. Nodes, anchors & labels', link: '/tutorials/03-nodes-anchors-labels' },
          { text: '4. Edges & routing', link: '/tutorials/04-edges-and-routing' },
          { text: '5. Paths & pen', link: '/tutorials/05-paths-and-pen' },
          { text: '6. Styling', link: '/tutorials/06-styling' },
          { text: '7. Layouts', link: '/tutorials/07-layouts' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'picture', link: '/reference/picture' },
          { text: 'core', link: '/reference/core' },
          { text: 'geometry', link: '/reference/geometry' },
          { text: 'node', link: '/reference/node' },
          { text: 'path', link: '/reference/path' },
          { text: 'render', link: '/reference/render' },
          { text: 'layout', link: '/reference/layout' },
          { text: 'text & math', link: '/reference/text' },
          { text: 'ext/circuits', link: '/reference/ext-circuits' },
        ],
      },
      {
        text: 'Cookbook',
        link: '/cookbook/',
      },
    ],
    socialLinks: [
      { icon: 'bitbucket', link: 'https://bitbucket.org/binboavetonik/jikz' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@ozan.e/jikz' },
    ],
  },
})
