import { t } from '/dev/index.js'
import dropdown from './dropdown'

const planets = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune'
]

const rivers = [
  'Amazon',
  'Danube',
  'Mississippi',
  'Nile',
  'Yangtze'
]

const cities = [
  'Atlanta',
  'Berlin',
  'London',
  'Los Angeles',
  'Moscow',
  'New York',
  'Rome'
]

t`
  <ul class="dropdown-demo">
    <li>${dropdown(planets)}</li>
    <li>${dropdown(rivers)}</li>
    <li>${dropdown(cities)}</li>
  </ul>
`(document.getElementById('arrow'))
