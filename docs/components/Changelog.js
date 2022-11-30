import { html } from '/dev/index.js'

export default function () {
  return html`
    <h1 id="changelog">Changelog</h1>
    <h2>Alpha 5</h2>
    <ul>
      <li>
        Binding the <code>value</code> attribute of input, textarea, and select
        elements now changes the IDL property instead of the content attribute
        (<a href="https://github.com/justin-schroeder/arrow-js/issues/31">#31</a
        >).
      </li>
      <li>
        Removes event listeners from Nodes that are removed from the DOM (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/11"
          >#11</a
        >).
      </li>
    </ul>
    <h2>Alpha 4</h2>
    <ul>
      <li>Fixes a bug in keyed list rendering when unshifting.</li>
    </ul>
    <h2>Alpha 3</h2>
    <ul>
      <li>
        Fixes a bug that caused unnecessary DOM patches on keyed lists (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/24"
          >#24</a
        >).
      </li>
    </ul>
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
