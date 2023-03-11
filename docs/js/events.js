import store from '../store'

export default function () {
  const visibleSections = new Set()

  const observer = new window.IntersectionObserver(
    function (entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleSections.add(entry.target.previousElementSibling.id)
        } else {
          visibleSections.delete(entry.target.previousElementSibling.id)
        }
      })
      store.section = [...visibleSections][visibleSections.size - 1]
    },
    {
      rootMargin: '-40px 0px -60% 0px',
      threshold: 0,
    }
  )
  document
    .querySelectorAll('h1[id] + section, h2[id] + section')
    .forEach((heading) => observer.observe(heading))
}
