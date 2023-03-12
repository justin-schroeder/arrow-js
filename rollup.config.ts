import { defineConfig, InputOptions, OutputOptions } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

const plugins: InputOptions['plugins'] = []

const output: OutputOptions = {
  file: 'dist/index.mjs',
}

let input = 'src/index.ts'

if (process.env.BUILD === 'types') {
  plugins.push(dts())
  output.file = 'dist/index.d.ts'
  input = 'dist/index.d.ts'
} else {
  output.sourcemap = true
  plugins.push(
    typescript({
      sourceMap: false,
      exclude: ['rollup.config.ts', 'src/__tests__/**'],
    })
  )
}

const config = defineConfig({
  input,
  output,
  plugins,
})

export default config
