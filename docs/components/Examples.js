import { html } from '@src/index'

export default function () {
  return html`<h1 id="examples">Examples</h1>
    <section class="examples">
      <p>
        To spice up your imagination of what Arrow can do, check out the
        following basic examples.
      </p>

      <h3>Calculator</h3>
      <p>A simple point and click calculator.</p>
      <ul>
        <li><a href="/demos/calculator.html">Demo</a></li>
        <li>
          <a
            href="https://github.com/justin-schroeder/arrow-js/blob/master/docs/demos/components/calculator.js"
            >Source code</a
          >
        </li>
      </ul>

      <h3>Performance</h3>
      <p>
        A performance demonstration (Vue vs Arrow) with 500 nodes changing
        reactively.
      </p>
      <ul>
        <li><a href="/demos/fast-text.html">Demo</a></li>
        <li>
          <a
            href="https://github.com/justin-schroeder/arrow-js/blob/master/docs/demos/fast-text.html"
            >Source code</a
          >
        </li>
      </ul>

      <h3>Dropdown</h3>
      <p>
        A simple synthetic (not a native select element) dropdown list component
        written with Arrow. Demonstrates Arrow’s ability to reuse code via
        components.
      </p>
      <ul>
        <li><a href="/demos/dropdowns.html">Demo</a></li>
        <li>
          <a
            href="https://github.com/justin-schroeder/arrow-js/blob/master/docs/demos/components/dropdowns.js"
            >Source code</a
          >
        </li>
      </ul>

      <h3>Carousel</h3>
      <p>A simple, interactive image carousel.</p>
      <ul>
        <li><a href="/demos/carousel.html">Demo</a></li>
        <li>
          <a
            href="https://github.com/justin-schroeder/arrow-js/blob/master/docs/demos/components/carousel.js"
            >Source code</a
          >
        </li>
      </ul>

      <h3>Tabs</h3>
      <p>A basic example of navigating through content with tabs.</p>
      <ul>
        <li><a href="/demos/tabs.html">Demo</a></li>
        <li>
          <a
            href="https://github.com/justin-schroeder/arrow-js/blob/master/docs/demos/components/tabs.js"
            >Source code</a
          >
        </li>
      </ul>

      <h3>min-gzip</h3>
      <p>
        Quickly check how your code compresses with gzip, brotli, and
        minification.
      </p>
      <ul>
        <li><a href="https://min-gzip.com" target="_blank">min-gzip.com</a></li>
        <li>
          <a href="https://github.com/arrow-js/min-gzip">Source code</a>
        </li>
      </ul>
    </section>`
}
