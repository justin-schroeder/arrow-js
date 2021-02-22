import { t } from '/dev/index.js'

const third = 'Third'

export default t`
  <ul>
    <li>First</li>
    <li>Second</li>
    <li>${third}</li>
  </ul>
`

export const ListExampleCode = `\
const third = 'third';

export default t\`
  <ul>
    <li>First</li>
    <li>Second</li>
    <li>\${third}</li>
  </ul>
\``
