import { r, t } from '/dev/index.js'

const data = r({
  clicks: 0
});

export default t`
  <button @click="${() => data.clicks++}">
    Fired ${() => data.clicks} arrows
  </button>
`

export const HelloWorldCode = `\
import { r, t } from '@arrow-js/core'

const data = r({
  clicks: 0
});

t\`
  <button @click="\${() => data.clicks++}">
    Fired \${() => data.clicks} arrows
  </button>
\``;
