import { html } from '/dev/index.js'

export default function () {
  return html`
    <div class="the-home-hero">
      <div class="hero-headline">
        <h1>Reactivity without the Framework</h1>
        <h2>
          A tiny <em>~2kb</em> library for building reactive interfaces in
          native JavaScript
        </h2>
      </div>
      <div class="actions">
        <a href="#why" class="button button--hollow">But why?</a>
        <a href="/docs.html" class="button">Get Started</a>
      </div>
    </div>
  `
}
