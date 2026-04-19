# Arrow Accessibility Notes

## Principles

- Semantic HTML first: `<button>`, `<a href>`, `<details>`, `<dialog>`, `<label>`, landmarks. No ARIA is better than wrong ARIA.
- Every interactive element needs an accessible name: visible text, `<label>` for inputs, `alt` for images (empty `alt=""` if decorative), `aria-label` only for icon-only controls.
- Keep `:focus-visible` styles. Never strip the outline without an equivalent.
- Keyboard parity: if `@click` isn't on a native `<button>`/`<a>`, you should be using one.
- Use `.key(...)` on dynamic lists so focused items survive reorders.
- `role="menu"` is for desktop-app action menus only, not nav or generic dropdowns.

## Reactive ARIA

- Callable expressions (`${() => ...}`) keep attributes reactive. Plain values render once.
- Arrow removes an attribute when an expression returns JS `false`. Correct for boolean HTML attributes (`hidden`, `disabled`, `readonly`). Wrong for enumerated ARIA states where absence ≠ `"false"`.
- For `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-checked`, `aria-current`, pass strings:
  - ✅ `aria-expanded="${() => state.open ? 'true' : 'false'}"`
  - ❌ `aria-expanded="${() => state.open}"` (removes attribute when closed)

## Widget patterns

- Prefer a native element when one exists (`<details>`, `<dialog>`, `<input type="checkbox" role="switch">`) before reaching for an APG pattern.
- Before building accordions, dialogs, comboboxes, tabs, etc., check the WAI-ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/patterns/
- Implement the pattern's keyboard section (arrow keys, Home/End, Escape, typeahead). Roles and state without keyboard handlers leave the widget unusable.
