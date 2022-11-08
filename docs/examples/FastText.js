import { t, r } from '../dist/index.js'

export default function () {
  const token = () => Math.random().toString(36).substring(2, 5)
  const data = r({
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
  return t`<ul>
            ${() => data.list.map((item) => t`<li>${() => item.name}</li>`)}
          </ul>`
}
