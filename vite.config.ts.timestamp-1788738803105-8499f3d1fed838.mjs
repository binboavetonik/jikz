// vite.config.ts
import { defineConfig } from "file:///Users/ozanerdemir/projects/jikz/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import dts from "file:///Users/ozanerdemir/projects/jikz/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/ozanerdemir/projects/jikz";
var vite_config_default = defineConfig({
  // Lets examples/ import from 'jikz' and resolve to the live source —
  // the demo page tracks the working tree during development. Unused
  // inside src/ itself, so the library build is unaffected.
  resolve: {
    alias: { jikz: resolve(__vite_injected_original_dirname, "src/index.ts") }
  },
  plugins: [
    dts({
      include: ["src"],
      // NOTE: rollupTypes must stay OFF. api-extractor drops the
      // `declare module` augmentation in ext/circuits that adds circuit
      // shape names to ShapeRegistry; per-file .d.ts output preserves
      // it (dist/ext/circuits/index.d.ts augments ../../node/Node).
      rollupTypes: false
    })
  ],
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      name: "Jikz",
      fileName: "jikz"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvb3phbmVyZGVtaXIvcHJvamVjdHMvamlrelwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL296YW5lcmRlbWlyL3Byb2plY3RzL2ppa3ovdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL296YW5lcmRlbWlyL3Byb2plY3RzL2ppa3ovdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cydcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgLy8gTGV0cyBleGFtcGxlcy8gaW1wb3J0IGZyb20gJ2ppa3onIGFuZCByZXNvbHZlIHRvIHRoZSBsaXZlIHNvdXJjZSBcdTIwMTRcbiAgLy8gdGhlIGRlbW8gcGFnZSB0cmFja3MgdGhlIHdvcmtpbmcgdHJlZSBkdXJpbmcgZGV2ZWxvcG1lbnQuIFVudXNlZFxuICAvLyBpbnNpZGUgc3JjLyBpdHNlbGYsIHNvIHRoZSBsaWJyYXJ5IGJ1aWxkIGlzIHVuYWZmZWN0ZWQuXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczogeyBqaWt6OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC50cycpIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBkdHMoe1xuICAgICAgaW5jbHVkZTogWydzcmMnXSxcbiAgICAgIC8vIE5PVEU6IHJvbGx1cFR5cGVzIG11c3Qgc3RheSBPRkYuIGFwaS1leHRyYWN0b3IgZHJvcHMgdGhlXG4gICAgICAvLyBgZGVjbGFyZSBtb2R1bGVgIGF1Z21lbnRhdGlvbiBpbiBleHQvY2lyY3VpdHMgdGhhdCBhZGRzIGNpcmN1aXRcbiAgICAgIC8vIHNoYXBlIG5hbWVzIHRvIFNoYXBlUmVnaXN0cnk7IHBlci1maWxlIC5kLnRzIG91dHB1dCBwcmVzZXJ2ZXNcbiAgICAgIC8vIGl0IChkaXN0L2V4dC9jaXJjdWl0cy9pbmRleC5kLnRzIGF1Z21lbnRzIC4uLy4uL25vZGUvTm9kZSkuXG4gICAgICByb2xsdXBUeXBlczogZmFsc2UsXG4gICAgfSksXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcbiAgICAgIG5hbWU6ICdKaWt6JyxcbiAgICAgIGZpbGVOYW1lOiAnamlreicsXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWtSLFNBQVMsb0JBQW9CO0FBQy9TLFNBQVMsZUFBZTtBQUN4QixPQUFPLFNBQVM7QUFGaEIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJMUIsU0FBUztBQUFBLElBQ1AsT0FBTyxFQUFFLE1BQU0sUUFBUSxrQ0FBVyxjQUFjLEVBQUU7QUFBQSxFQUNwRDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLE1BQ0YsU0FBUyxDQUFDLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BS2YsYUFBYTtBQUFBLElBQ2YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsTUFDeEMsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLElBQ1o7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
