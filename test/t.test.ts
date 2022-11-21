import { t, r, nextTick, ArrowTemplate } from '../src'
import { setValue } from './utils/events'

interface User {
  name: string
  id: number
}

describe('t', () => {
  it('can render simple strings', () => {
    const nodes = t`foo bar`().childNodes
    expect(nodes.length).toBe(1)
    expect(nodes[0].nodeName).toBe('#text')
  })

  it('can render simple numeric expressions', () => {
    const nodes = t`${10 * 10}`().childNodes
    expect(nodes.length).toBe(1)
    expect(nodes[0].nodeName).toBe('#text')
    expect(nodes[0].nodeValue).toBe('100')
  })

  it('can render simple text with expressions', async () => {
    const world = 'World'
    const nodes = t`Hello ${world}`().childNodes
    await nextTick()
    expect(nodes.length).toBe(1)
    expect(nodes[0].nodeName).toBe('#text')
    expect(nodes[0].nodeValue).toBe('Hello World')
  })

  it('can render reactive data once without arrow fn', async () => {
    const data = r({ name: 'World' })
    const node = t`Hello ${data.name}`()
    expect(node.childNodes.length).toBe(1)
    expect(node.childNodes[0].nodeValue).toBe('Hello World')
    data.name = 'Justin'
    await nextTick()
    expect(node.childNodes[0].nodeValue).toBe('Hello World')
  })

  it('automatically updates expressions with arrow fn', async () => {
    const data = r({ name: 'World' })
    const parent = document.createElement('div')
    t`Hello ${() => data.name}`(parent)
    expect(parent.textContent).toBe('Hello World')
    data.name = 'Justin'
    await nextTick()
    expect(parent.textContent).toBe('Hello Justin')
  })

  it('can create a token expression at the beginning of template', async () => {
    const data = r({ name: 'Hello' })
    const parent = document.createElement('div')
    t`${() => data.name} Worldilocks`(parent)
    expect(parent.textContent).toBe('Hello Worldilocks')
    data.name = 'Justin'
    await nextTick()
    expect(parent.textContent).toBe('Justin Worldilocks')
  })

  it('can place expression nested inside some elements inside a string', async () => {
    const data = r({ name: 'Hello' })
    const parent = document.createElement('div')
    t`This is cool <div>And here is more text <h2>Name: ${() =>
      data.name} ok?</h2></div><span>${data.name}</span>`(parent)
    expect(parent.innerHTML).toBe(
      'This is cool <div>And here is more text <h2>Name: Hello ok?</h2></div><span>Hello</span>'
    )
    data.name = 'Justin'
    await nextTick()
    expect(parent.innerHTML).toBe(
      'This is cool <div>And here is more text <h2>Name: Justin ok?</h2></div><span>Hello</span>'
    )
  })

  it('can sub-render templates without reactivity.', async () => {
    const data = r({ name: 'World' })
    const parent = document.createElement('div')
    t`Hello ${t`<div>${data.name}</div>`}`(parent)
    expect(parent.innerHTML).toBe('Hello <div>World</div>')
    data.name = 'Justin'
    await nextTick()
    expect(parent.innerHTML).toBe('Hello <div>World</div>')
  })

  it('can render a simple non-reactive list', async () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`Hello <ul>${data.list.map((item: string) => t`<li>${item}</li>`)}</ul>`(
      parent
    )
    expect(parent.innerHTML).toBe(
      'Hello <ul><li>a</li><li>b</li><li>c</li></ul>'
    )
    data.list[1] = 'Justin'
    await nextTick()
    // We shouldn't see any changes because that list was non-reactive.
    expect(parent.innerHTML).toBe(
      'Hello <ul><li>a</li><li>b</li><li>c</li></ul>'
    )
  })

  it('can render a simple reactive list', async () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`Hello <ul>${() =>
      data.list.map((item: string) => t`<li>${item}</li>`)}</ul>`(parent)
    expect(parent.innerHTML).toBe(
      'Hello <ul><li>a</li><li>b</li><li>c</li></ul>'
    )
    data.list.push('next')
    await nextTick()
    expect(parent.innerHTML).toBe(
      'Hello <ul><li>a</li><li>b</li><li>c</li><li>next</li></ul>'
    )
  })

  it('can render a list with multiple repeated roots.', () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`<div>
      ${() => data.list.map((item: string) => t`<h2>${item}</h2><p>foobar</p>`)}
    </div>`(parent)
    expect(parent.innerHTML).toBe(`<div>
      <h2>a</h2><p>foobar</p><h2>b</h2><p>foobar</p><h2>c</h2><p>foobar</p>
    </div>`)
  })

  it('can render a list with new values un-shifted on', async () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`<ul>
      ${() => data.list.map((item: string) => t`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.unshift('z', 'x')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>z</li><li>x</li><li>a</li><li>b</li><li>c</li>
    </ul>`)
  })

  it('can render a list with new values pushed', async () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`<ul>
      ${() => data.list.map((item: string) => t`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.push('z', 'x')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li><li>z</li><li>x</li>
    </ul>`)
  })

  it('can render a list with new values spliced in', async () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`<ul>
      ${() => data.list.map((item: string) => t`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.splice(1, 2, 'z', 'y', 'x', 'l')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>z</li><li>y</li><li>x</li><li>l</li>
    </ul>`)
  })

  it('can render a list with new values spliced in', async () => {
    const data = r({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    t`<ul>
      ${() => data.list.map((item: string) => t`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.splice(1, 2, 'z', 'y', 'x', 'l')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>z</li><li>y</li><li>x</li><li>l</li>
    </ul>`)
  })

  it('can render a list with a for loop', async () => {
    const data = r({ list: ['a', 'b', 'c'] as string[] })
    const parent = document.createElement('div')
    function list(items: any[]): Array<CallableFunction> {
      const els: ArrowTemplate[] = []
      for (const i in items) {
        els.push(t`<li>${items[i]}</li>`)
      }
      return els
    }
    t`<ul>
      ${() => list(data.list)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.push('item')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li><li>item</li>
    </ul>`)
  })

  it('can render a list from an object', async () => {
    const data = r({
      food: {
        main: 'Pizza',
        desert: 'ice cream',
      },
    })
    const parent = document.createElement('div')
    function list(items: any): Array<CallableFunction> {
      const els: ArrowTemplate[] = []
      for (const i in items) {
        els.push(t`<li>${i}: ${items[i]}</li>`)
      }
      return els
    }
    t`<ul>
      ${() => list(data.food)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>main: Pizza</li><li>desert: ice cream</li>
    </ul>`)
    data.food.breakfast = 'bacon'
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>main: Pizza</li><li>desert: ice cream</li><li>breakfast: bacon</li>
    </ul>`)
  })

  it('re-uses nodes that had sub value change.', async () => {
    const data = r({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 1 },
        { name: 'Andrew', id: 2 },
      ],
    })
    const parent = document.createElement('div')
    t`<ul>
      ${() => data.list.map((user: User) => t`<li>${() => user.name}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>Justin</li><li>Luan</li><li>Andrew</li>
    </ul>`)
    const first = parent.querySelector('li')
    data.list[0].name = 'Bob'
    await nextTick()
    expect(first).toBe(parent.querySelector('li'))
    expect(parent.innerHTML).toBe(`<ul>
      <li>Bob</li><li>Luan</li><li>Andrew</li>
    </ul>`)
  })

  it('can move keyed nodes in a list', async () => {
    const data = r({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 0 },
        { name: 'Andrew', id: 0 },
      ] as Array<{ name: string; id: number }>,
    })
    const parent = document.createElement('div')
    t`<ul>
      ${() =>
        data.list.map((user: User) =>
          t`<li>${() => user.name}</li>`.key(user.id)
        )}
    </ul>`(parent)

    parent.querySelector('li')?.setAttribute('data-is-justin', 'true')
    data.list.splice(0, 1)
    data.list.push(r({ name: 'Justin', id: 3 }), r({ name: 'Fred', id: 0 }))
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>Luan</li><li>Andrew</li><li data-is-justin="true">Justin</li><li>Fred</li>
    </ul>`)
  })

  it('can sort keyed nodes in a list', async () => {
    const data = r({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 1 },
        { name: 'Andrew', id: 2 },
      ],
    })
    const parent = document.createElement('div')
    t`<ul>
      ${() =>
        data.list.map((user: User) =>
          t`<li>${() => user.name}</li>`.key(user.id)
        )}
    </ul>`(parent)
    parent.querySelector('li')?.setAttribute('data-is-justin', 'true')
    parent
      .querySelector('li:nth-child(2)')
      ?.setAttribute('data-is-luan', 'true')
    parent
      .querySelector('li:nth-child(3)')
      ?.setAttribute('data-is-andrew', 'true')
    data.list.sort((a: User, b: User) => {
      return a.name > b.name ? 1 : -1
    })
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li data-is-andrew="true">Andrew</li><li data-is-justin="true">Justin</li><li data-is-luan="true">Luan</li>
    </ul>`)
  })

  it('can update the values in keyed nodes', async () => {
    const data = r({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 1 },
        { name: 'Andrew', id: 2 },
      ],
    })
    const parent = document.createElement('div')
    t`<ul>
      ${() =>
        data.list.map((user: User) =>
          t`<li>${() => user.name}</li>`.key(user.id)
        )}
    </ul>`(parent)
    data.list[0].name = 'Bob'
    data.list[1] = { name: 'Jeff', id: 1 }
    data.list[2].name = 'Fred'
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>Bob</li><li>Jeff</li><li>Fred</li>
    </ul>`)
  })

  it('can render results of multiple data objects', async () => {
    const a = r({ price: 45 })
    const b = r({ quantity: 25 })
    const parent = document.createElement('div')
    t`${() => a.price * b.quantity}`(parent)
    expect(parent.innerHTML).toBe('1125')
    a.price = 100
    await nextTick()
    expect(parent.innerHTML).toBe('2500')
  })

  it('can conditionally swap nodes', async () => {
    const data = r({
      price: 100,
      promo: 'free',
      showPromo: false,
    })
    const parent = document.createElement('div')
    const componentA = t`Price: ${() => data.price}`
    const componentB = t`Promo: <input type="text">`
    t`<div class="checkout">
      ${() => (data.showPromo ? componentB : componentA)}
    </div>`(parent)
    expect(parent.innerHTML).toBe(`<div class="checkout">
      Price: 100
    </div>`)
    data.showPromo = true
    await nextTick()
    expect(parent.innerHTML).toBe(`<div class="checkout">
      Promo: <input type="text">
    </div>`)
  })

  it('can conditionally show/remove nodes', async () => {
    const data = r({
      showPromo: false,
    })
    const parent = document.createElement('div')
    // Note: this test seems obtuse but it isn't since it performing this toggle
    // action multiple times stress tests the underlying placeholder mechanism.
    const promo = t`Promo: <input type="text">`
    t`<div class="checkout">
      ${() => data.showPromo && promo}
    </div>`(parent)
    expect(parent.innerHTML).toBe(`<div class="checkout">
      <!---->
    </div>`)
    data.showPromo = true
    await nextTick()
    expect(parent.innerHTML).toBe(`<div class="checkout">
      Promo: <input type="text">
    </div>`)
    data.showPromo = false
    await nextTick()
    expect(parent.innerHTML).toBe(`<div class="checkout">
      <!---->
    </div>`)
    data.showPromo = true
    await nextTick()
    expect(parent.innerHTML).toBe(`<div class="checkout">
      Promo: <input type="text">
    </div>`)
  })

  it('outputs the boolean true, but not the boolean false', () => {
    const parent = document.createElement('div')
    expect((t`${() => true}${() => false}`(parent) as Element).innerHTML).toBe(
      'true<!---->'
    )
  })

  it('can render an attribute', () => {
    const parent = document.createElement('div')
    const data = r({
      org: 'braid',
    })
    expect(
      (t`<div data-org="${() => data.org}"></div>`(parent) as Element).innerHTML
    ).toBe(`<div data-org="braid"></div>`)
  })

  it('can remove and re-add multiple attributes', async () => {
    const parent = document.createElement('div')
    const data = r({
      org: 'braid' as boolean | string,
      precinct: false as boolean | string,
      state: 'virginia',
    })
    t`<div x-precinct="${() => data.precinct}" data-org="${() =>
      data.org}">${() => data.state}</div>`(parent) as Element
    await nextTick()
    expect(parent.innerHTML).toBe(`<div data-org="braid">virginia</div>`)
    data.precinct = 'cville'
    await nextTick()
    expect(parent.innerHTML).toBe(
      '<div data-org="braid" x-precinct="cville">virginia</div>'
    )
    data.org = false
    await nextTick()
    expect(parent.innerHTML).toBe('<div x-precinct="cville">virginia</div>')
    data.org = 'other'
    data.state = 'california'
    await nextTick()
    expect(parent.innerHTML).toBe(
      '<div x-precinct="cville" data-org="other">california</div>'
    )
  })

  it('can render nested nodes with attribute expressions', async () => {
    const parent = document.createElement('div')
    const data = r({
      country: 'usa',
      states: [
        { name: 'virginia', abbr: 'va' },
        { name: 'nebraska', abbr: 'ne' },
        { name: 'california', abbr: 'ca' },
      ],
    })
    t`<ul data-country="${data.country}">
        ${() =>
          data.states.map(
            (state: any) =>
              t`<li data-abbr="${() => state.abbr}">${() => state.name}</li>`
          )}
          <li data-first-abbr="${() => data.states[0].abbr}">${() =>
      data.states[0].name}</li>
      </ul>
    `(parent)
    expect(parent.innerHTML).toBe(`<ul data-country="usa">
        <li data-abbr="va">virginia</li><li data-abbr="ne">nebraska</li><li data-abbr="ca">california</li>
          <li data-first-abbr="va">virginia</li>
      </ul>
    `)
    data.states.sort((a: any, b: any) => {
      return a.abbr > b.abbr ? 1 : -1
    })
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul data-country="usa">
        <li data-abbr="ca">california</li><li data-abbr="ne">nebraska</li><li data-abbr="va">virginia</li>
          <li data-first-abbr="ca">california</li>
      </ul>
    `)
  })

  it('can render the number zero', async () => {
    const parent = document.createElement('div')
    t`${() => 0}|${0}`(parent)
    expect(parent.innerHTML).toBe('0|0')
  })

  it('can bind to native events as easily as pecan pie', async () => {
    const parent = document.createElement('div')
    const data = r({ value: '' })
    const update = (event: InputEvent) => {
      data.value = (event.target as HTMLInputElement).value
    }
    t`<input type="text" @input="${update}">${() => data.value}`(parent)
    setValue(parent.querySelector('input'), 'pizza')
    await nextTick()
    expect(parent.innerHTML).toBe('<input type="text">pizza')
  })

  it('defaults to the proper option select element', () => {
    const parent = document.createElement('div')
    const data = r({ selected: 'b' })
    t`<select>
        <option value="a" selected="${() => 'a' === data.selected}">A</option>
        <option value="b" selected="${() => 'b' === data.selected}">B</option>
        <option value="c" selected="${() => 'c' === data.selected}">C</option>
      </select>`(parent)
    expect(parent.querySelector('select')?.value).toBe('b')
  })

  it('can create a table with dynamic columns and rows', () => {
    const parent = document.createElement('div')
    const rows = [
      ['Detroit', 'MI'],
      ['Boston', 'MA'],
    ]
    t`<table>
      <tbody>
        ${rows.map(
          (row) => t`<tr>${row.map((column) => t`<td>${column}</td>`)}</tr>`
        )}
      </tbody>
    </table>`(parent)
    expect(parent.innerHTML).toBe(`<table>
      <tbody>
        <tr><td>Detroit</td><td>MI</td></tr><tr><td>Boston</td><td>MA</td></tr>
      </tbody>
    </table>`)
  })

  it('renders sanitized HTML when reading from a variable.', () => {
    const data = r({
      foo: '<h1>Hello world</h1>'
    })
    expect(t`<div>${() => data.foo}</div>`().querySelector('h1')).toBe(null)
  })
  it('renders sanitized HTML when updating from a variable.', async () => {
    const data = r({
      html: 'foo'
    })
    const stage = document.createElement('div')
    t`<div>${() => data.html}</div>`(stage)
    data.html = '<h1>Some text</h1>'
    await nextTick()
    expect(stage.querySelector('h1')).toBe(null)
  })
})
