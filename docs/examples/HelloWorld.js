import { r, t } from '/dev/index.js'

const data = r({
  clicks: 0
})

export default t`
  <button @click="${() => data.clicks++}">
    Fired ${() => data.clicks} arrows
  </button>
`

export const HelloWorldCode = `\
import { reactive, html } from '@arrow-js/core'

const data = reactive({
  clicks: 0
});

html\`
  <button @click="\${() => data.clicks++}">
    Fired \${() => data.clicks} arrows
  </button>
\``
