import { r, t } from '../../dev/index.js'

const store = r({
  list: [
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
  ],
})

t`<ul>
  ${() =>
    store.list.map((item) =>
      t`<li>
          ${() => item.name}
          <input type="text" @input="${(e) => {
            item.name = e.target.value
          }}">
        </li>`.key(item.id)
    )}
</ul>`(document.getElementById('arrow'))
