import { t, r } from '/dev/index.js'

export default function dropdown (items) {
  const state = r({
    isOpen: false,
    selection: items[0]
  })

  return t`
  <div
    class="dropdown"
    @click="${() => { state.isOpen = !state.isOpen }}"
  >
    <ul
      class="dropdown-list"
      data-is-open="${() => state.isOpen}"
    >
      ${() => items.map(item =>
        t`
        <li
          data-selected="${() => item === state.selection}"
          @click="${() => {
            state.selection = item
          }}"
        >
          ${item}
        </li>`
      )}
    </ul>
  </div>`
}
