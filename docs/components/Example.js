import { t, r } from '/dist/index.js'

function htmlEntities (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default function (example, component, language = 'javascript') {
  const data = r({
    warning: false,
    error: false
  })
  const template = t`
  <div class="stage">
    ${() =>
      data.warning &&
      t`<div class="warning"><img src="/img/warning.svg" role="presentation">${data.warning}</div>`}
    ${() =>
      data.error &&
      t`<div class="error"><img src="/img/stop.svg" role="presentation">${data.error}</div>`}
    <pre><code class="language-${language}">${htmlEntities(
    example
  )}</code></pre>
    ${() => !!component && t`<div class="example">${component}</div>`}
  </div>`

  template.warning = message => {
    data.warning = message
    return template
  }

  template.error = message => {
    data.error = message
    return template
  }

  return template
}
