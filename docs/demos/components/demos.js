import { html } from '@src/index'

const demos = [
  { href: '/demos/fast-text.html', label: 'DOM Patching' },
  { href: '/demos/calculator.html', label: 'Calculator' },
  { href: '/demos/carousel.html', label: 'Carousel' },
  { href: '/demos/dropdowns.html', label: 'Dropdowns' },
  { href: '/demos/tabs.html', label: 'Tabs' },
]

html`<ul class="demo-nav">
  ${demos.map(
    (demo) => html`<li><a href="${demo.href}">${demo.label}</a></li>`
  )}
</ul>`(document.getElementById('demo-nav'))
