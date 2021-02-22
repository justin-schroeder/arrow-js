import { r, t } from '/dev/index.js'

const data = r({
  location: 'World',
  progress: 0,
  textInput: ''
})

export const intro = {
  code: `import { t } from '@arrow-js/core'

const appElement = document.getElementById('app');

const template = t\`Hello <em>World</em>\`

template(appElement)`,
  example: t`Hello <em>World</em>`
}

export const expressions = {
  code: `import { t } from '@arrow-js/core'
t\`
  <ul>
    <li>Hello \${data.location} (🪨 static expression)</li>
    <li>Hello \${() => data.location} (⚡ dynamic expression)</li>
  </ul>
\``,
  example: t`
    <label><code>data.location</code> = </label>
    <select id="change-location" @change="${(e) => { data.location = e.target.value }}">
      <option value="World">World</option>
      <option value="Mars">Mars</option>
      <option value="Pluto">Pluto</option>
    </select>
    <ul>
      <li>Hello ${data.location} (🪨 static)</li>
      <li>Hello ${() => data.location} (⚡ dynamic)</li>
    </ul>
  `
}

export const invalid = `t\`<p>
  A list of items:
  <\${() => data.ordered ? 'ol' : 'li'} class="list">
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
  </ul>
</p>\``

const updateProgress = () => setTimeout(
  () => ++data.progress && data.progress < 100 && updateProgress()
  , 20)

export const attributes = {
  code: `const upload = r({
  progress: 0
})

const updateProgress = () => setTimeout(
  () => upload.progress++ && upload.progress < 100 && updateProgress()
, 20)

t\`<progress value="\${() => upload.progress}" max="100"></progress>\``,
  example: t`
  <button @click="${() => {
    data.progress = 0
    updateProgress()
  }}">Start</button>
  <progress value="${() => data.progress}" max="100"></progress>`
}

export const events = {
  code: `const data = r({
  value: ''
})

t\`
<input type="text" @input="\${e => { data.value = e.target.value }}">
<br>
<em>\${() => data.value}</em>
\``,
  example: t`
    <input type="text" @input="${e => { data.textInput = e.target.value }}">
    <br>
    <em>${() => data.textInput}</em>
  `
}
