import { r, t } from '/dev/index.js';

export default {
  intro: {
    code: `import { r } from '@arrow-js/core'

const data = r({
  price: 25,
  quantity: 10
})

console.log(data.price);`,
    example: () => {
      const data = r({
        price: 25,
        quantity: 10,
      });
      return t`<code class="console">// outputs ${data.price}</code>`;
    },
  },

  on: {
    code: `import { r } from '@arrow-js/core'

const data = r({
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
    code: `import { r } from '@arrow-js/core'

const data = r({
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
console.log(total())
data.price = 35
`,
    example:
      "<code class=\"console\">// outputs:<br>'Total: 250'<br>'Total: 350'</code>",
  },
  watcher: {
    code: `import { r, w } from '@arrow-js/core'

const data = r({
  price: 25,
  quantity: 10,
  logTotal: true
})

function total () {
  if (data.logTotal) {
    console.log(\`Total: \${data.price * data.quantity}\`);
  }
}

w(total)

data.price = 35`,
    example:
      "<code class=\"console\">// outputs:<br>'Total: 250'<br>'Total: 350'</code>",
  },
  watcher2: {
    code: `import { r, w } from '@arrow-js/core'

const data = r({
  price: 25,
  quantity: 10,
  logTotal: true
})

w(
  () => data.total && data.price * data.quantity,
  (total) => total !== false && console.log(\`Total: \${total}\`)
)

data.price = 35`,
    example:
      "<code class=\"console\">// outputs:<br>'Total: 250'<br>'Total: 350'</code>",
  },
};
