import { html, reactive } from '@src/index'

export default function () {
  const token = () => Math.random().toString(36).substring(2, 5)
  const data = reactive({
    list: [],
  })

  for (let i = 0; i < 500; i++) {
    data.list.push({ name: token(), id: i })
  }

  const rename = function () {
    data.list.forEach((item) => (item.name = token()))
    setTimeout(() => rename(), 10)
  }
  rename()
  return html`<ul>
    ${() => data.list.map((item) => html`<li>${() => item.name}</li>`)}
  </ul>`
}
