import { r } from '../dev/index.js'
import { w } from '../src/index.js'

const store = r({
  section: 'intro',
  navigation: [
    {
      title: 'Getting Started',
      id: 'getting-started',
      children: [
        { title: 'Installation', id: 'installation' },
        { title: 'Reactive (r)', id: 'reactive-data' },
        { title: 'Watch (w)', id: 'watching-data' },
        { title: 'HTML (t)', id: 'templates' },
      ],
    },
    {
      title: 'Examples',
      id: 'examples',
    },
    {
      title: 'Changelog',
      id: 'changelog',
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
