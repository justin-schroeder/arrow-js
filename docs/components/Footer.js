import { html } from '@src/index'

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
