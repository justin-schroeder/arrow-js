import { r, t } from '/dev/index.js'

export default {
  intro: {
    code: `import { reactive } from '@arrow-js/core'

const data = reactive({
  price: 25,
  quantity: 10
})

console.log(data.price);`,
    example: () => {
      const data = r({
        price: 25,
        quantity: 10,
      })
      return t`<code class="console">// outputs ${data.price}</code>`
    },
  },

  on: {
    code: `import { reactive } from '@arrow-js/core'

const data = reactive({
  price: 25,
  quantity: 10
})

data.$on('price', (value) => {
  console.log(\`Price changed to \${value}\`)
})

data.price = 35
`,
    example: '<code class="console">// outputs \'Price changed to 35\' </code>',
  },
  calculator: {
    code: `import { reactive } from '@arrow-js/core'

const data = reactive({
  price: 25,
  quantity: 10,
  logTotal: true
})

function total () {
  if (data.logTotal) {
    console.log(\`Total: \${data.price * data.quantity}\`);
  }
}

data.$on('price', total)
data.$on('quantity', total)
data.$on('logTotal', total)
total()
data.price = 35
`,
    example:
      "<code class=\"console\">// outputs:<br>'Total: 250'<br>'Total: 350'</code>",
  },
  watcher: {
    code: `import { reactive, watch } from '@arrow-js/core'

const data = reactive({
  price: 25,
  quantity: 10,
  logTotal: true
})

function total () {
  if (data.logTotal) {
    console.log(\`Total: \${data.price * data.quantity}\`);
  }
}

watch(total)

data.price = 35`,
    example:
      "<code class=\"console\">// outputs:<br>'Total: 250'<br>'Total: 350'</code>",
  },
  watcher2: {
    code: `import { reactive, watch } from '@arrow-js/core'

const data = reactive({
  price: 25,
  quantity: 10,
  logTotal: true
})

watch(
  () => data.logTotal && data.price * data.quantity,
  (total) => total !== false && console.log(\`Total: \${total}\`)
)

data.price = 35`,
    example:
      "<code class=\"console\">// outputs:<br>'Total: 250'<br>'Total: 350'</code>",
  },
}
