export function setValue(input: HTMLInputElement | null, value: string): void {
  if (!input) return
  input.value = value
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true,
  })
  input.dispatchEvent(inputEvent)
}

export function click(el: HTMLElement): void {
  const event = new Event('click', {
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(event)
}
