import { t } from '/dev/index.js'

const demos = [
  { href: '/demos/fast-text.html', label: 'DOM Patching' },
  { href: '/demos/calculator.html', label: 'Calculator' },
  { href: '/demos/dropdowns.html', label: 'Dropdowns' }
]

t`<ul class="demo-nav">
  ${demos.map(demo => t`<li><a href="${demo.href}">${demo.label}</a></li>`)}
</ul>`(document.getElementById('demo-nav'))
