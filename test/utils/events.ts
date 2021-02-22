export function setValue(input: HTMLInputElement | null, value: string): void {
  if (!input) return;
  input.value = value;
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(inputEvent);
}
