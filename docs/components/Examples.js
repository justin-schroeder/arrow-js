import { t } from '/dev/index.js'

export default function () {
  return t`<section>
    <h1 id="examples">Examples</h1>
    <p>To spice up your imagination of what Arrow can do checkout the following basic examples.</p>

    <h3>Calculator</h3>
    <p>A simple point and click calculator.</p>
    <ul>
      <li><a href="/demos/calculator.html">Demo</a></li>
      <li><a href="https://github.com/justin-schroeder/arrow-js">Source code</a></li>
    </ul>
    <h3>Performance</h3>
    <p>A performance demonstration (Vue vs Arrow) of a updating 500 nodes reactively.</p>
    <ul>
      <li><a href="/demos/fast-text.html">Demo</a></li>
      <li><a href="https://github.com/justin-schroeder/arrow-js">Source code</a></li>
    </ul>

    <h3>Dropdown</h3>
    <p>A simple synthetic (not a native select element) dropdown list written with Arrow.</p>
    <ul>
      <li><a href="/demos/dropdown.html">Demo</a></li>
      <li><a href="https://github.com/justin-schroeder/arrow-js">Source code</a></li>
    </ul>

  </section>`
}
