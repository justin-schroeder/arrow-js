import { codeToHtml } from 'https://esm.sh/shiki@1.1.6'

export default async function () {
  const langs = {
    javascript: 'js',
    js: 'js',
    html: 'html',
  }

  const codeBlocks = document.querySelectorAll('pre code[class*="language-"]')
  const observer = new window.MutationObserver(theme)
  observer.observe(document.documentElement, {
    attributes: true,
    subtree: false,
  })
  function theme() {
    const colorMode = document.documentElement.getAttribute('data-theme')
    codeBlocks.forEach(async (block) => {
      const lang = block.className.replace('language-', '')
      const html = await codeToHtml(block.textContent, {
        theme: colorMode === 'light' ? 'github-light' : 'monokai',
        lang: langs[lang] || lang,
      })
      block.innerHTML = html
    })
  }
  theme()
}
