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
        { title: 'Why not...', id: 'why-not' }
      ]
    },
    {
      title: 'Getting Started',
      id: 'getting-started',
      children: [
        { title: 'Installation', id: 'installation' },
        { title: 'Reactive data (r)', id: 'reactive-data' },
        { title: 'Watching data (w)', id: 'watching-data' },
        { title: 'Templates (t)', id: 'templates' }
      ]
    },
    {
      title: 'Guides',
      id: 'guides',
      children: [
        { title: 'Components', id: 'components' },
        { title: 'State management', id: 'state-management' },
        { title: 'Routing', id: 'routing' },
        { title: 'SSR', id: 'server-side-rendering' }
      ]
    }
  ]
})

// Always set the store section to the first navigation item.
w(() => {
  if (store.section === undefined) {
    store.section = store.navigation[0].id
  }
})

export default store
