import { t } from '/dev/index.js'
import example from './Example'
import collapsable from './Collapsable'
import * as TemplateExamples from '../examples/TemplateExamples'
import { r } from '../../src'

export default function () {
  return t`
    <h2 id="templates">Templates <code>t</code></h2>
    <section>
      <p>
        Arrow uses a <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals">tagged template literal</a>
        to declaratively render content. To tag a template literal as an
        <code>ArrowTemplate</code> prefix the tick marks with the
        <code>t</code> function. To mount a template to the DOM, you call the
        return value with an <code>Element</code> as the argument.
      </p>
      ${example(TemplateExamples.intro.code, TemplateExamples.intro.example)}
      <p>
        There are some interesting things about this simple example.
      </p>
      <ul>
        <li>You can use <code>t</code> without <code>r</code> or&nbsp;<code>w</code>.</li>
        <li>You can use HTML.</li>
        <li>There is no need for root elements or fragment tags.</li>
        <li>Templates are portable (even though we chose to mount our template to the DOM in this example, we could have passed it around like any variable).</li>
      </ul>
      <p>
        Since template literals are a native JavaScript feature, you probably
        already know you can use placeholders denoted by
        <code>\${expression}</code>. Arrow uses this expression placeholder to
        render variable and reactive content.
      </p>
      <h3>Reactivity</h3>
      <p class="key-concept">
        Arrow makes a distinction between <strong>static expressions</strong>,
        and <strong>reactive expressions</strong>. Reactive expressions are
        <em>callable functions</em>, everything else is a static expression.
      </p>
      ${example(
        TemplateExamples.expressions.code,
        TemplateExamples.expressions.example
      )}
      <p>
        In other words, <strong>Arrow is static by default and reactive by choice</strong>.
        This is an intentional decision that improves performance and helps
        developers make intentional choices about which pieces of their app
        <em>should</em> be reactive. Template expressions will update
        automatically ("react") when 2 conditions are met:
        <ol>
          <li>
            The template expression is a function.
          </li>
          <li>
            The template expression uses
            <a href="#reactive-data">reactive data</a>.
          </li>
        </ol>
      </p>
      ${collapsable(t`
        <p>
          In the real world, you’ll find a large swath of dynamic data does not
          need to be "reactive". Let’s say we're building a product page — just
          because we fetched the product’s data from the back end does not mean
          the page elements need to be reactive. They should be injected into
          the DOM only once on initial page load. In fact most of the page
          probably shouldn't be reactive.
        </p>
        <p>
          A shopping cart’s details on the other hand probably <em>should</em> be
          reactive. Which products are in the cart, their quantities, the total
          price — these are all items that may dynamically change as a user
          interacts with the page.
        </p>
      `)}
      <p>
        Reactive expressions can be used:
        <ul>
          <li>In text content.</li>
          <li>As the inner content of an <code>Element</code></li>
          <li>As attribute values.</li>
        </ul>
      </p>
      <p>
        Reactive expressions <strong>cannot</strong> be used to alter the types
        of DOM nodes being rendered. This is an invalid template:<br>
      </p>
      ${example(TemplateExamples.invalid).error(
        'Don’t use reactive expressions as <code>Element</code> types. Instead use <a href="#nested-templates">nested templates</a>.'
      )}
      <h3>Attributes</h3>
      <p>
        Reactive expressions can be used to alter the value of attributes
        dynamically by using an expression as the attribute value.
      </p>
      ${example(
        TemplateExamples.attributes.code,
        TemplateExamples.attributes.example
      )}
      <aside class="tip">
        Returning <code>false</code> from an attribute expression will remove
        the attribute. This makes it easy to toggle attributes.
      </aside>
      <h3>Events</h3>
      <p>
        You can bind an event listener to a DOM element by using the
        <code>@eventName</code> short hand. This automatically performs a
        <code>document.addEventListener('eventName')</code> and registers your
        expression as the event handler.
      </p>
      ${example(TemplateExamples.events.code, TemplateExamples.events.example)}
    </section>
  `
}
