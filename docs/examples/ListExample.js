import { html } from '/dev/index.js'

const third = 'Third'

export default html`
  <ul>
    <li>First</li>
    <li>Second</li>
    <li>${third}</li>
  </ul>
`

export const ListExampleCode = `\
const third = 'Third';

html\`
  <ul>
    <li>First</li>
    <li>Second</li>
    <li>\${third}</li>
  </ul>
\``
