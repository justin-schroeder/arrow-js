import { html, reactive } from '/dev/index.js'

export default function dropdown(items) {
  const state = reactive({
    isOpen: false,
    selection: items[0],
  })

  return html` <div
    class="dropdown"
    @click="${() => {
      state.isOpen = !state.isOpen
    }}"
  >
    <ul class="dropdown-list" data-is-open="${() => state.isOpen}">
      ${() =>
        items.map(
          (item) =>
            html` <li
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
