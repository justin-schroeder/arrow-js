import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { readdir } from 'fs/promises'
import { execa } from 'execa'
import chalk from 'chalk'

const info = (m: string) => console.log(chalk.blue(m))
const error = (m: string) => console.log(chalk.red(m))
const success = (m: string) => console.log(chalk.green(m))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '../')

async function clean() {
  await execa('shx', ['rm', '-rf', `${rootDir}/dist`])
}

async function baseBuild() {
  info('Rolling up primary package')
  await execa('npx', [
    'rollup',
    '-c',
    'rollup.config.ts',
    '--configPlugin',
    'typescript',
  ])
}

async function typesBuild() {
  info('Rolling up types')
  await execa('npx', [
    'rollup',
    '-c',
    'rollup.config.ts',
    '--configPlugin',
    'typescript',
    '--environment',
    'BUILD:types',
  ])
}

async function removeArtifacts() {
  const files = await (await readdir(`${rootDir}/dist`))
    .filter((file) => file.endsWith('.d.ts') && !file.startsWith('index.'))
    .map((file) => `${rootDir}/dist/${file}`)
  await execa('shx', ['rm', ...files])
}

;(async () => {
  try {
    await clean()
    await baseBuild()
    await typesBuild()
    await removeArtifacts()
    success('Build complete')
  } catch (e) {
    error('A build error occurred')
    console.log(e)
  }
})()
