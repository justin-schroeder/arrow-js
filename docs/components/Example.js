import { html, reactive } from '/dev/index.js'

function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default function (example, component, language = 'javascript') {
  const data = reactive({
    warning: false,
    error: false,
  })
  const template = html` <div class="stage">
    ${() =>
      data.warning &&
      html`<div class="warning">
        <img
          src="/img/warning.svg"
          alt="warning"
          role="presentation"
        />${data.warning}
      </div>`}
    ${() =>
      data.error &&
      html`<div class="error">
        <img src="/img/stop.svg" alt="stop" role="presentation" />${data.error}
      </div>`}
    <pre><code class="language-${language}">${htmlEntities(
      example
    )}</code></pre>
    ${() => !!component && html`<div class="example">${component}</div>`}
  </div>`

  template.warning = (message) => {
    data.warning = message
    return template
  }

  template.error = (message) => {
    data.error = message
    return template
  }

  return template
}
