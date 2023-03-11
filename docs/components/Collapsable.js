import { html, reactive } from '/dev/index.js'

export default function (slot) {
  const data = reactive({
    open: false,
  })
  return html` <aside
    class="collapsed info"
    data-title="The how and why"
    data-is-open="${() => data.open}"
    @click="${() => {
      data.open = !data.open
    }}"
  >
    ${slot}
  </aside>`
}
