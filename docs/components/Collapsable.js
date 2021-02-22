import { t, r } from '/dev/index.js'

export default function (slot) {
  const data = r({
    open: false
  })
  return t`
  <aside
    class="collapsed info"
    data-title="The how and why"
    data-is-open="${() => data.open}"
    @click="${() => { data.open = !data.open }}"
  >
    ${slot}
  </aside>`
}
