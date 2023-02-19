import { t } from '/dev/index.js'
import example from './Example'
import reactiveData from './ReactiveData'
import watchingData from './WatchingData'
import templates from './Templates'
import InstallationExamples from '../examples/InstallationExamples'
import examples from './Examples'

export default function () {
  return t`
    <h1 id="getting-started">Getting Started</h1>
    <h2 id="installation">Installation</h2>
    <section>
      <p>
        Arrow can be used with simple <code>&lt;script&gt;</code>
        tags or from <code>npm</code>/<code>yarn</code> with a bundler.
      </p>
      <h3>From npm or yarn (using a bundler)</h3>
      <p>
        Even though Arrow does not require any build tools, it is often
        desirable to build your projects using tools that support Hot Module
        Reloading. Because Arrow is an ESM it works very well with newer build
        and dev tools like <a href="https://vitejs.dev/">Vite</a>.
      </p>
      <strong>From NPM:</strong>
      ${example(InstallationExamples.npm, null, 'shell')}
      <strong>From Yarn:</strong>
      ${example(InstallationExamples.yarn, null, 'shell')}
      <h3>From a CDN</h3>
      <p>
        You can install arrow directly from a CDN. We recommend using <a href="https://esm.sh/">esm.sh</a>
        since it is optimized for loading ESM modules. Just plop this into your
        <code>.html</code> file.
      </p>
      ${example(InstallationExamples.cdn, null, 'html')}
      <h3>On your local filesystem</h3>
      ${example(InstallationExamples.local, null, 'html')}
    </section>
    ${reactiveData}
    ${watchingData}
    ${templates}
    ${examples}
  `
}
