import { html } from '@src/index'
import dropdown from './dropdown'

const planets = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]

const rivers = ['Amazon', 'Danube', 'Mississippi', 'Nile', 'Yangtze']

const cities = [
  'Atlanta',
  'Berlin',
  'London',
  'Los Angeles',
  'Moscow',
  'New York',
  'Rome',
]

html`
  <ul class="dropdown-demo">
    <li>${dropdown(planets)}</li>
    <li>${dropdown(rivers)}</li>
    <li>${dropdown(cities)}</li>
  </ul>
`(document.getElementById('arrow'))
