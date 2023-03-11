import { html } from '/dev/index.js'

export default function () {
  return html`
    <footer>
      <div class="container">
        <div class="copyright">
          &copy; ${() => new Date().getFullYear()} - Justin Schroeder
        </div>
      </div>
    </footer>
  `
}
