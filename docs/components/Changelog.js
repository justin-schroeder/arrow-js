import { html } from '/dev/index.js'

export default function () {
  return html`
    <h1 id="changelog">Changelog</h1>
    <h2>Alpha 2</h2>
    <ul>
      <li>
        Improved markup sanitation (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/18"
          >#18</a
        >).
      </li>
      <li>
        Improved token replacement to prevent incorrectly structured tables (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/17"
          >#17</a
        >).
      </li>
      <li>
        Adds <code>reactive</code>, <code>watch</code>, and
        <code>html</code> aliases.
      </li>
    </ul>
    <h2>Alpha 1</h2>
    <ul>
      <li>Initial public release of ArrowJS.</li>
    </ul>
  `
}
