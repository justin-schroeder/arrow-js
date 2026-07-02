# Arrow API Notes

Use this reference when you need the main runtime semantics quickly.

## `reactive()`

- Turns objects and arrays into live reactive state.
- Reads inside callable template expressions stay reactive.
- Plain values in template expressions render once.

## `html`

- Use the `html` tagged template literal to render DOM.
- `${data.foo}` is static.
- `${() => data.foo}` stays live.
- Return arrays of templates to render lists.
  - Reactive lists need a callable wrap: `${() => items.map(item => html\`...\`.key(item.id))}`. A bare `${items.map(...)}` renders once.
- Use `.key(...)` when DOM identity must survive reorders.
- Event handlers must be assignable to `EventListener`.
  - Narrower TS signatures like `(e: KeyboardEvent) => void` fail typecheck — Widen and cast inside: `const onKey: EventListener = (e) => { const key = (e as KeyboardEvent).key; ... }`.
- **Attribute expressions must be the entire attribute value.** Partial interpolation like `id="tab-${key}"` throws `Invalid HTML position`.
  - Precompute: `const tabId = \`tab-${key}\`` → `id="${tabId}"`. Applies to class, `data-*`, hrefs, etc.
  - Text slots (`<span>tab-${key}</span>`) are unaffected.

## `component()`

- Wraps a plain function and gives it stable instance semantics per render slot.
- Pass reactive objects as props.
- Read props lazily with callable expressions.
- Component props are live proxies, so `'foo' in props` and `Object.keys(props)` reflect the current source object.

## `watch()`

- Use for side effects, not primary rendering.
- Prefer template expressions for UI updates and `watch()` for imperative work.

## Framework + SSR

- `render(root, view)` mounts a view to the DOM.
- `boundary(view, options)` gives async and hydration recovery boundaries.
- `renderToString(view)` returns `{ html, payload }`.
- `serializePayload(payload)` writes the SSR payload into the page.
- `hydrate(root, view, payload)` adopts matching SSR DOM in the browser.
