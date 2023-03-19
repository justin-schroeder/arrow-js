import { defineConfig } from 'vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  resolve: {
    alias: {
      '@src': resolve(__dirname, '../src'),
    },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        docs: resolve(__dirname, 'docs/index.html'),
        benchmarks: resolve(__dirname, 'benchmarks/index.html'),
        benchmarks_creating: resolve(__dirname, 'benchmarks/creating.html'),
        benchmarks_textNodes: resolve(__dirname, 'benchmarks/textNodes.html'),
        demos_calculator: resolve(__dirname, 'demos/calculator.html'),
        demos_carousel: resolve(__dirname, 'demos/carousel.html'),
        demos_dropdowns: resolve(__dirname, 'demos/dropdowns.html'),
        demos_fast_text: resolve(__dirname, 'demos/fast-text.html'),
        demos_tabs: resolve(__dirname, 'demos/tabs.html'),
      },
      output: {
        dir: resolve(__dirname, '../public'),
      },
    },
  },
})
