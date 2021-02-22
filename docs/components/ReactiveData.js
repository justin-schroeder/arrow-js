import { t } from '/dev/index.js';
import example from './Example';
import ReactiveDataExamples from '../examples/ReactiveDataExamples';

export default function() {
  return t`
    <h2 id="reactive-data">Reactive Data <code>r</code></h2>
    <section>
      <p>
        The <code>r</code> function's duty is to transform a generic data
        object into an "observed" data object. Let’s call these "reactive" data
        objects. Converting your data object into a reactive object is as simple
        as wrapping it in an call to <code>r()</code>:
      </p>
      ${example(
        ReactiveDataExamples.intro.code,
        ReactiveDataExamples.intro.example
      )}
      <aside class="tip">
        For educational purposes, these reactive data examples don’t use its
        companion <code>t</code> (template) function. This is a totally valid
        way to use <code>r</code>, but to see how it all fits together be sure
        to checkout the <a href="#templates">template documentation</a> too.
      </aside>
      <p>
        Simple enough, but that wasn’t very useful. However, we can now
        "observe" properties of our <code>data</code> object. Reactive data
        objects have an <code>$on</code> and <code>$off</code> methods that
        allow us to observe mutations to their properties.
      </p>
      ${example(ReactiveDataExamples.on.code, ReactiveDataExamples.on.example)}
      <p>
        Ok, that's a bit more interesting! Using this information, lets try to
        make a total cost calculator for a shopping cart. We’ll need to observe
        both the <code>quantity</code> and the <code>price</code>, and perhaps
        we should add a flag to know if we need to log the value or not — we'll
        want to observe that too.
      </p>
      ${example(
        ReactiveDataExamples.calculator.code,
        ReactiveDataExamples.calculator.example
      ).warning(
        'Read on to learn how to do this elegantly with <a href="#watching-data">watchers</a>!'
      )}
      <p>
        Our example is starting to get moderately useful! However, it looks
        a bit messy and if <code>data.logTotal</code> is <code>false</code>
        it will still run our <code>total()</code> function uselessly, so
        really we should use <code>$off</code> to stop observing
        <code>cost</code> and <code>quantity</code> when
        <code>logTotal</code> is <code>false</code>.
      </p>
      <p>
        To solve these issues, it's time we introduce our next hero
        <code>w</code>.
      </p>
    </section>
  `;
}
