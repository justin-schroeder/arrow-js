document.documentElement.style.backgroundColor = 'var(--c-body-bg)'

if (typeof window !== 'undefined') {
  // assumes a Light Mode default
  if (
    window.localStorage.getItem('arrowjs-theme') === 'dark' ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches &&
      !window.localStorage.getItem('arrowjs-theme'))
  ) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  const toggle = document.getElementById('theme-toggle')
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light')
        window.localStorage.setItem('arrowjs-theme', 'light')
      } else {
        document.documentElement.setAttribute('data-theme', 'dark')
        window.localStorage.setItem('arrowjs-theme', 'dark')
      }
    })
  }
}
