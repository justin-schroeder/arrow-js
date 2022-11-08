import { r } from '../dev/index.js'
import { w } from '../src/index.js'

const store = r({
  section: 'intro',
  navigation: [
    {
      title: 'Introduction',
      id: 'intro',
      children: [
        { title: 'What is Arrow?', id: 'what-is-arrow' },
        { title: 'Key Commitments', id: 'key-commitments' },
      ],
    },
    {
      title: 'Getting Started',
      id: 'getting-started',
      children: [
        { title: 'Installation', id: 'installation' },
        { title: 'Reactive data (r)', id: 'reactive-data' },
        { title: 'Watching data (w)', id: 'watching-data' },
        { title: 'Templates (t)', id: 'templates' },
      ],
    },
    {
      title: 'Examples',
      id: 'examples',
    },
  ],
})

// Always set the store section to the first navigation item.
w(() => {
  if (store.section === undefined) {
    store.section = store.navigation[0].id
  }
})

export default store
