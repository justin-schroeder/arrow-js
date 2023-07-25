import { html, reactive } from '@src/index'

const data = reactive({
  location: 'World',
  progress: 0,
  textInput: '',
  items: [
    { id: 1, task: 'Check email' },
    { id: 2, task: 'Get groceries' },
    { id: 3, task: 'Make dinner' },
  ],
})

export const intro = {
  code: `import { html } from '@arrow-js/core'

const appElement = document.getElementById('app');

const template = html\`Hello <em>World</em>\`

template(appElement)`,
  example: html`Hello <em>World</em>`,
}

export const expressions = {
  code: `import { html } from '@arrow-js/core'
html\`
  <ul>
    <li>Hello \${data.location} (🪨 static expression)</li>
    <li>Hello \${() => data.location} (⚡ dynamic expression)</li>
  </ul>
\``,
  example: html`
    <label><code>data.location</code> = </label>
    <select
      id="change-location"
      @change="${(e) => {
        data.location = e.target.value
      }}"
    >
      <option value="World">World</option>
      <option value="Mars">Mars</option>
      <option value="Pluto">Pluto</option>
    </select>
    <ul>
      <li>Hello ${data.location} (🪨 static)</li>
      <li>Hello ${() => data.location} (⚡ dynamic)</li>
    </ul>
  `,
}

export const invalid = `html\`<p>
  A list of items:
  <\${() => data.ordered ? 'ol' : 'ul'} class="list">
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
  </ul>
</p>\``

const updateProgress = () =>
  setTimeout(
    () => ++data.progress && data.progress < 100 && updateProgress(),
    20
  )

export const attributes = {
  code: `const upload = reactive({
  progress: 0
})

const updateProgress = () => setTimeout(
  () => upload.progress++ && upload.progress < 100 && updateProgress()
, 20)

html\`<progress value="\${() => upload.progress}" max="100"></progress>\``,
  example: html` <button
      @click="${() => {
        data.progress = 0
        updateProgress()
      }}"
    >
      Start
    </button>
    <progress value="${() => data.progress}" max="100"></progress>`,
}

export const events = {
  code: `const data = reactive({
  value: ''
})

html\`
<input type="text" @input="\${e => { data.value = e.target.value }}">
<br>
<em>\${() => data.value}</em>
\``,
  example: html`
    <input
      type="text"
      @input="${(e) => {
        data.textInput = e.target.value
      }}"
    />
    <br />
    <em>${() => data.textInput}</em>
  `,
}
export const idl = {
  code: `const data = reactive({
  colors: ['red', 'green', 'blue']
})

html\`
<my-custom-element .colors="\${() => data.colors}"></my-custom-element>
\``,
}

export const list = {
  code: `import { html, reactive } from '@arrow-js/core'

const data = reactive({
  items: [
    { id: 17, task: 'Check email' },
    { id: 21, task: 'Get groceries' },
    { id: 44, task: 'Make dinner' },
  ]
})

function addItem(e) {
  e.preventDefault()
  const input = document.getElementById('new-item')
  data.items.push({
    id: Math.random(),
    task: input.value,
  })
  input.value = ''
}

html\`
<ul>
  \${() => data.items.map(
      item => html\`<li>\${item.task}</li>\`.key(item.id)
    )}
</ul>

<form @submit="\${addItem}">
  <input type="text" id="new-item">
  <button>Add</button>
</form>\``,

  example: html`
    <ul>
      ${() =>
        data.items.map((item) => html`<li>${item.task}</li>`.key(item.id))}
    </ul>
    <form
      @submit="${(e) => {
        e.preventDefault()
        data.items.push({
          id: Math.random(),
          task: document.getElementById('new-item').value,
        })
        document.getElementById('new-item').value = ''
      }}"
    >
      <input type="text" placeholder="Add item..." id="new-item" />
      <button>Add</button>
    </form>
  `,
}
