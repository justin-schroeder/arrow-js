import { html, reactive } from '@src/index'

const data = reactive({
  number: '',
  ops: [],
})

const operations = {
  '+': (carry, input) => carry + input,
  '-': (carry, input) => carry - input,
  '&#xf7;': (carry, input) => carry / input,
  '&times;': (carry, input) => carry * input,
}

function calculate() {
  data.ops.push(parseFloat(data.number) || 0)
  data.number = String(
    data.ops.reduce(
      (carry, op, index, ops) =>
        isNaN(op) ? operations[op](carry, ops[index + 1]) : carry,
      data.ops.shift()
    )
  )
  data.ops = []
}

const operation = (op) => {
  return html`<button
    @click="${() => {
      if (data.number) {
        data.ops.push(parseFloat(data.number), op)
        data.number = ''
      }
    }}"
  >
    ${op}
  </button>`
}

const clear = () => {
  data.number = ''
  data.ops = []
}

const digit = (number) => {
  return html`<button
    @click="${() => {
      data.number += number
    }}"
  >
    ${number}
  </button>`
}

html`<div class="calculator">
  <div class="screen">
    <div class="number">${() => data.number}</div>
    <div class="operations">
      ${() => data.ops.join(' ') + ' ' + data.number}
    </div>
  </div>
  ${() => [7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0].map((n) => digit(n))}
  ${() => Object.keys(operations).map((n) => operation(n))}
  <button @click="${clear}">C</button>
  <button @click="${calculate}">&equals;</button>
</div>`(document.getElementById('arrow'))
