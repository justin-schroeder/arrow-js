import { reactive, watch } from '../dev/index.js'

const store = reactive({
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
watch(() => {
  if (store.section === undefined) {
    store.section = store.navigation[0].id
  }
})

export default store
