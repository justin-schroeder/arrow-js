import { t } from '/dev/index.js';
import example from './example.js';
import HelloWorld, { HelloWorldCode } from '../examples/HelloWorld';
import ListExample, { ListExampleCode } from '../examples/ListExample';

export default function() {
  return t`
    <h1 id="intro">Introduction</h1>
    <h2 id="what-is-arrow">What is Arrow?</h2>
    <section>
      <p>
        ArrowJS is a tool and methodology for programming reactive interfaces
        using native JavaScript. It’s not really a framework, but not less
        powerful than a framework either. At it’s core — ArrowJS is an admission
        that while we developers were falling in love with UI frameworks —
        JavaScript itself got good, really good.
      </p>
      <p>
        If JavaScript is so good, then what does a tool like arrow bring to the
        table? So glad you asked. Arrow has 2 primary features:
      </p>
      <ul>
        <li>Observable data.</li>
        <li>Declarative/Reactive DOM rendering.</li>
      </ul>
      <p>
        How can you build a full app with such a short feature list? Read on
        because this site serves as documentation for Arrow's utilities but also
        as an opinionated guide to implementing components, events, routes,
        plugins, state management, server side rendering, and nearly everything
        else required ot build apps using Arrow and modern <em>native</em>
        JavaScript.
      </p>
      <p>Additionally, Arrow boasts a few more important talking points:</p>
      <ul>
        <li>Zero dependencies.</li>
        <li>No build tools required (or even suggested).</li>
        <li>
          Less than <code>3KB</code> min+gzip. (22x smaller than this itty bitty gif →
          <img src="/img/mind-blown.gif" />)
        </li>
      </ul>
      <p>Got time for a quick example? Great.</p>
      ${example(HelloWorldCode, HelloWorld)}
    </section>
    <h2 id="key-commitments">Key Commitments</h2>
    <section>
      <h3>Commitment to JavaScript</h3>
      <p>
        Arrow relies heavily on modern features of JavaScript such as
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals"
          >template literals</a
        >,
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules"
          >modules</a
        >
        (think <code>import</code> and <code>export</code>), and
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy"
          >Proxies</a
        >. For example, you'll immediately notice that Arrow does not have a
        special template "language" like so many other frameworks. Instead it
        relies on template literals (tick marks <code>\`</code>) — specifically
        tagged template literals — to interpolate expressions and render DOM
        elements. For example:
      </p>
      ${example(ListExampleCode, ListExample)}
      <p>
        We’ll go in depth on templates in a bit, but a key concept to understand
        here is that template literals, and tagged template literals, are
        <strong>native features of JavaScript</strong>.
      </p>
      <p>
        Why does this matter? Well for one it makes Arrow fast — most of the
        parsing is done using language-level features. More importantly
        however, learning Arrow is mostly learning how to use modern native
        JavaScript to create UI systems, so the concepts here are portable.
      </p>
      <p>
        Already fancy yourself a great JavaScript developer? Great! Then learning
        Arrow won't take you any time at all.
      </p>
      <h3>Commitment to no build tools</h3>
      <p>
        Build tools can be useful. Arrow itself is written in TypeScript so it
        necessitates a build script to compile, but while there is no restriction
        against using a build tool, Arrow <em>will never require
        one</em>. Arrow removes the need for complex operations that are
        best left to compilers, like converting templates to render functions. It
        does this by making some assumptions:
        <ul>
          <li>It's ok to ship modern JS (no IE support)</li>
          <li>You’re writing HTML (not native voodoo)</li>
        </ul>
      </p>
      <p>
        It will always be good and right to pull in Arrow from a CDN and start
        building your project right away.
      </p>
      <h3>Commitment to performance</h3>
      <p>
        Arrow is <em>fast.</em> Downloading, booting, and patching are all fast.
        In fact, you can generally expect on-par-or-better performance than
        its bigger JS framework counterparts. Arrow will always be a guilt-free
        choice for those under a performance budget.
      </p>
      <h3>Commitment to Open Source</h3>
      <p>
        Arrow is built by a team of passionate engineers who love JavaScript and
        the Open Source community that has made it such a successful language.
        Arrow will always be Open Source.
      </p>
    </section>
    <h2 id="why-not">Why not...</h2>
    <section>
      <p>[TK]</p>
    </section>
  `;
}
