import { t, r } from '../../dev/index.js'

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const currentTime = new Date().getTime()
const day = 86400000

const mailPanel = t`
<div class="panel">
  <h4>Your Emails</h4>
  <ul style="padding: 0px;">
    <li class="email">
      <span></span>
      Welcome to ArrowJS!
    </li>
  </ul>
</div>
`
const calendarPanel = t`
<div class="panel">
  <h4>Upcoming Events</h4>
  <ul style="padding-left: 3px;list-style: none;">
    <li>
      <time>${days[new Date(currentTime).getDay()]}</time>
      Practise vanilla JS.
    </li>
    <li>
      <time>${days[new Date(currentTime + (day * 1)).getDay()]}</time>
      Make an awesome UI.
    </li>
    <li>
      <time>${days[new Date(currentTime + (day * 2)).getDay()]}</time>
      Deploy a new website.
    </li>
  </ul>
</div>
`
const tasksPanel = t`
<div class="panel">
  <h4>Tasks Due</h4>
  <ul style="list-style-image: url(https://fonts.gstatic.com/s/i/materialicons/done/v19/24px.svg)">
    <li>Download ArrowJS.</li>
    <li>Enjoy an amazing development experience.</li>
    <li>Have fun with lightning-fast reactivity.</li>
    <li>Go to the moon 🚀.</li>
  </ul>
</div>
`

const state = r({
  tabs: [
    { name: 'Mail', icon: 'https://fonts.gstatic.com/s/i/materialicons/mail/v16/24px.svg', element: mailPanel },
    { name: 'Calendar', icon: 'https://fonts.gstatic.com/s/i/materialicons/today/v17/24px.svg', element: calendarPanel },
    { name: 'Tasks', icon: 'https://fonts.gstatic.com/s/i/materialicons/task_alt/v6/24px.svg', element: tasksPanel }
  ],
  selectedTab: 0
})

function indicatorPosition () {
  const activeTabElement = document.querySelector('.tabs button.active')
  if (activeTabElement) {
    return `
      top: ${activeTabElement.offsetTop || 0}px;
      height: ${activeTabElement.clientHeight || 0}px;
    `
  }
  return `top: 0px;height: ${100 / state.tabs.length}%;`
}

t`
<div class="container">
  <div class="tabs">
    ${() => state.tabs.map((tab, index) =>
      t`
        <button
          class="${() => index === state.selectedTab ? 'active' : ''}"
          @click="${() => (state.selectedTab = index)}"
        >
          <span class="icon" role="img" style="background-image: url(${tab.icon});"></span>
          <p>${tab.name}</p>
        </button>
      `
    )}
    <div
      class="tab-indicator"
      style="${() => indicatorPosition(state.selectedTab)}"
    ></div>
  </div>
  <div class="tab-panels">
    ${() => state.tabs[state.selectedTab].element}
  </div>
</div>`(document.getElementById('arrow'))
