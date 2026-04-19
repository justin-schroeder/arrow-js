# Arrow Examples

## Counter

```ts
import { html, reactive } from '@arrow-js/core'

const state = reactive({ count: 0 })

html`
  <button @click="${() => state.count++}">
    Clicked ${() => state.count} times
  </button>
`
```

## Component composition

```ts
import { component, html, reactive } from '@arrow-js/core'

const Counter = component((props) =>
  html`<strong>${() => props.count}</strong>`
)

const state = reactive({ count: 1 })

html`<p>Current count: ${Counter(state)}</p>`
```

## Scaffolded routing

```ts
import { html } from '@arrow-js/core'

export function routeToPage(url: string) {
  if (url === '/about') {
    return {
      title: 'About',
      view: html`<main><h1>About</h1></main>`,
      status: 200,
    }
  }

  return {
    title: 'Home',
    view: html`<main><h1>Home</h1></main>`,
    status: 200,
  }
}
```

## Disclosure with reactive ARIA

```ts
import { html, reactive } from '@arrow-js/core'

const state = reactive({ open: false })

html`
  <button
    aria-expanded="${() => (state.open ? 'true' : 'false')}"
    aria-controls="panel"
    @click="${() => (state.open = !state.open)}"
  >
    Details
  </button>
  <div id="panel" hidden="${() => !state.open}">…</div>
`
```

## Live region

```ts
import { html, reactive } from '@arrow-js/core'

const status = reactive({ message: '' })

html`<div role="status">${() => status.message}</div>`
```

## Tabs with APG keyboard handler

```ts
import { html, reactive } from '@arrow-js/core'

const labels = ['Overview', 'Details', 'History']
const state = reactive({ active: 0 })

const onKey: EventListener = (e) => {
  const ev = e as KeyboardEvent
  const max = labels.length - 1
  const next =
    ev.key === 'ArrowRight' ? (state.active === max ? 0 : state.active + 1) :
    ev.key === 'ArrowLeft'  ? (state.active === 0 ? max : state.active - 1) :
    ev.key === 'Home' ? 0 : ev.key === 'End' ? max : -1
  if (next < 0) return
  ev.preventDefault()
  state.active = next
  queueMicrotask(() => (e.currentTarget as HTMLElement).children[next]?.focus())
}

html`
  <div role="tablist" aria-label="Sections" @keydown="${onKey}">
    ${() => labels.map((label, i) => html`<button
      role="tab"
      aria-selected="${() => (state.active === i ? 'true' : 'false')}"
      tabindex="${() => (state.active === i ? '0' : '-1')}"
      @click="${() => (state.active = i)}"
    >${label}</button>`.key(i))}
  </div>
`
```

Roving tabindex (string values!), Arrow/Home/End keys, and focus following selection via `queueMicrotask` so it runs after the DOM update. Roles and `aria-selected` without this handler leave the widget unreachable by keyboard.

## Imperative DOM bridge (native `<dialog>`)

```ts
import { html, reactive, watch } from '@arrow-js/core'

const state = reactive({ open: false })

html`
  <button @click="${() => (state.open = true)}">Delete</button>
  <dialog id="confirm" @close="${() => (state.open = false)}">
    <form method="dialog">
      <p>Delete this item?</p>
      <button value="cancel">Cancel</button>
      <button value="confirm">Delete</button>
    </form>
  </dialog>
`(document.body)

watch(() => {
  const dlg = document.getElementById('confirm') as HTMLDialogElement | null
  if (!dlg) return
  state.open ? !dlg.open && dlg.showModal() : dlg.open && dlg.close()
})
```

Arrow has no ref primitive. To drive an imperative API (`<dialog>.showModal()`, `<video>.play()`, `.focus()`) from reactive state, use `watch()` + `querySelector` after mount. `@close` syncs state back when Escape or a `method="dialog"` form submits.

## SSR + hydration

```ts
import { renderToString, serializePayload } from '@arrow-js/ssr'
import { hydrate, readPayload } from '@arrow-js/hydrate'
import { routeToPage } from './page'

const page = routeToPage(url)
const ssr = await renderToString(page.view)
const payloadScript = serializePayload(ssr.payload)

await hydrate(
  document.getElementById('app')!,
  routeToPage(window.location.pathname).view,
  readPayload()
)
```
