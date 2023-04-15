import { nextTick, reactive, watch } from '..'
import { describe, it, expect, vi } from 'vitest'
import { Reactive } from '../reactive'
describe('reactive', () => {
  it('allows simple property access', () => {
    const data = reactive({ x: 123, y: 'abc' })
    expect(data.x).toBe(123)
    expect(data.y).toBe('abc')
  })

  it('allows setting properties', () => {
    const data = reactive<{ x?: string }>({})
    expect(data.x).toBe(undefined)
    data.x = 'foo'
    expect(data.x).toBe('foo')
  })

  it('can record dependencies', async () => {
    const data = reactive<Record<string, any>>({
      a: 'foo',
      b: 'boo',
      c: 'can',
      bar: {
        baz: 'caz',
      },
    })
    const x = vi.fn(() => data.a + data.c)
    watch(x)
    data.foo = 'bar' // should not trigger since it wasnt recorded.
    data.a = 'hello'
    await Promise.resolve()
    expect(x).toHaveBeenCalledTimes(2)
    expect(x.mock.results[1].value).toBe('hellocan')
  })

  it('allows simple observation registration', async () => {
    const data = reactive({
      foo: 'bar',
      bar: 'foo',
    })
    const listener = vi.fn()
    data.$on('bar', listener)
    data.foo = 'hello'
    await Promise.resolve()
    expect(listener).toHaveBeenCalledTimes(0)
    data.bar = 'baz'
    await Promise.resolve()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]).toEqual(['baz', 'foo'])
  })

  it('can stop listening to changes', async () => {
    const data = reactive({
      foo: 'bar',
      bar: 'foo',
    })
    const listener = vi.fn()
    data.$on('bar', listener)
    data.bar = 'baz'
    await Promise.resolve()
    expect(listener).toHaveBeenCalledTimes(1)
    data.$off('bar', listener)
    data.bar = 'fizz'
    await Promise.resolve()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('can track dependencies on shadow properties when they are lit up', async () => {
    const data = reactive({
      value: 0,
      name: 'Bob',
    })
    const hasName = () => (data.value > 0.5 ? data.name : 'nothing')
    const setValue = vi.fn()
    watch(hasName, setValue)
    expect(setValue).toHaveBeenCalledTimes(1)
    data.name = 'Jonny'
    await Promise.resolve()
    expect(setValue).toHaveBeenCalledTimes(1)
    data.value = 1
    await Promise.resolve()
    expect(setValue).toHaveBeenCalledTimes(2)
    data.name = 'Jill'
    await Promise.resolve()
    expect(setValue).toHaveBeenCalledTimes(3)
  })

  it('consolidates identical watcher expressions', async () => {
    const data = reactive({
      list: ['a', 'b', 'c'],
    })
    const callback = vi.fn()
    watch(() => data.list.map((item: string) => item), callback)
    expect(callback).toHaveBeenCalledTimes(1)
    data.list.unshift('first')
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('untracks dependencies that fall back into shadow', async () => {
    const data = reactive({
      value: 0,
      name: 'Bob',
    })
    const hasName = () => (data.value > 0.5 ? data.name : 'nothing')
    const setValue = vi.fn()
    watch(hasName, setValue)
    expect(setValue).toHaveBeenCalledTimes(1)
    data.value = 1
    data.name = 'hello'
    await Promise.resolve()
    expect(setValue).toHaveBeenCalledTimes(2)
    data.value = 0
    await Promise.resolve()
    expect(setValue).toHaveBeenCalledTimes(3)
    data.name = 'molly'
    await Promise.resolve()
    expect(setValue).toHaveBeenCalledTimes(3)
  })

  it('is able to track dependencies on nested tracking calls', async () => {
    const data = reactive({
      value: 0,
      name: 'Bob',
      location: 'Big City',
    })
    const hasNameCb = vi.fn()
    const printNameCb = vi.fn()

    function printName() {
      return data.name
    }
    function hasName(): void | string {
      if (data.value > 1) {
        watch(printName, printNameCb)
      }
    }
    watch(hasName, hasNameCb)
    expect(hasNameCb).toHaveBeenCalledTimes(1)
    expect(printNameCb).toHaveBeenCalledTimes(0)
    data.value = 2
    await Promise.resolve()
    expect(printNameCb).toHaveBeenCalledTimes(1) // Previously shadowed
    expect(hasNameCb).toHaveBeenCalledTimes(2)
    data.name = 'hello'
    await Promise.resolve()
    // should not be called since the new object is not directly observed.
    expect(hasNameCb).toHaveBeenCalledTimes(2)
  })

  it('is able to react to nested reactive object mutations', async () => {
    const data = reactive({
      first: 'Justin',
      user: { last: 'Schroeder', username: 'bob1999' },
    })
    const callback = vi.fn()
    watch(() => data.user.last, callback)
    expect(callback).toHaveBeenCalledTimes(1)
    data.user.last = 'Poppies'
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.calls[1][0]).toBe('Poppies')
  })

  it('can does not call observers from previous reactive objects that didnt change', () => {
    const data = reactive({
      list: [{ name: 'fred' }],
    })
    const callback = vi.fn()
    ;(data.list[0] as Reactive<{ name: string }>).$on('name', callback)
    data.list[0] = { name: 'fred' }
    expect(callback).toHaveBeenCalledTimes(0)
  })

  it('can merge existing recursive object observers', () => {
    const user = reactive({ name: 'fred' })
    const data = reactive({
      users: [{ name: 'ted' }],
    })
    const listObserver = vi.fn()
    const userObserver = vi.fn()
    const listPropertyObserver = vi.fn()
    data.$on('users', listObserver)
    ;(data.users as Reactive<{ name: string }[]>).$on(0, listPropertyObserver)
    user.$on('name', userObserver)
    data.users[0] = user
    expect(listObserver).toHaveBeenCalledTimes(0)
    expect(listPropertyObserver).toHaveBeenCalledTimes(1)
    expect(userObserver).toHaveBeenCalledTimes(0)
    data.users[0].name = 'bob'
    expect(userObserver).toHaveBeenCalledTimes(1)
    expect(listObserver).toHaveBeenCalledTimes(0)
    expect(listPropertyObserver).toHaveBeenCalledTimes(1)
  })

  it('is able to de-register nested dependencies when they move into logical shadow', async () => {
    const data = reactive({
      first: 'Bob',
      user: { last: 'Schroeder', username: 'bob1999' },
    })
    const callback = vi.fn()
    watch(
      () => (data.first === 'Justin' ? '@jpschroeder' : data.user.username),
      callback
    )
    expect(callback).toHaveBeenCalledTimes(1)
    data.user.username = 'poppy22'
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.calls[1][0]).toBe('poppy22')
    data.first = 'Justin'
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(3)
    data.user.username = 'jenny33'
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('will notify the root property of array mutations', () => {
    const data = reactive({
      list: ['a', 'b'],
    })
    const callback = vi.fn()
    data.$on('list', callback)
    data.list.push('c')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('will notify the root property when the array is empty', () => {
    const data = reactive({
      list: ['a', 'b'],
    })
    const callback = vi.fn()
    data.$on('list', callback)
    data.list.length = 0
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('will notify the root property when the array spliced to empty', async () => {
    const data = reactive({
      list: [] as { name: string; id: number }[],
    })
    const callback = vi.fn()
    data.$on('list', callback)
    data.list = [
      { name: 'a', id: 145 },
      { name: 'b', id: 567 },
    ] as Reactive<{ name: string; id: number }[]>
    expect(callback).toHaveBeenCalledTimes(1)
    data.list.splice(0, 1)
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(2)
    data.list.splice(0, 1)
    expect(callback).toHaveBeenCalledTimes(3)
    expect(data.list).toEqual([])
  })

  it('will notify the root property of array mutations on newly assigned nested r', () => {
    const data = reactive({
      list: [] as string[],
    })
    const callback = vi.fn()
    data.$on('list', callback)
    data.list.push('c')
    expect(callback).toHaveBeenCalledTimes(1)
    data.list = ['a', 'b']
    expect(callback).toHaveBeenCalledTimes(2)
    data.list.push('c')
    expect(callback).toHaveBeenCalledTimes(3)
    data.list = reactive(['a', 'b'])
    expect(callback).toHaveBeenCalledTimes(4)
    data.list.push('c')
    expect(callback).toHaveBeenCalledTimes(5)
  })

  it('will notify root observers on objects of property additions', () => {
    const initData = {
      food: {
        fruit: 'apple',
      } as Record<string, string>,
    }
    const data = reactive(initData)
    const callback = vi.fn()
    data.$on('food', callback)
    data.food.breakfast = 'eggs'
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('can automatically swap object dependency and update listeners on it’s properties', () => {
    const data = reactive({
      user: {
        name: 'Justin',
      },
    })
    const callback = vi.fn()
    const callback2 = vi.fn()
    ;(data.user as Reactive<{ name: string }>).$on('name', callback)
    data.$on('user', callback2)
    expect(callback).toHaveBeenCalledTimes(0)
    expect(callback2).toHaveBeenCalledTimes(0)
    data.user.name = 'Dustin'
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(0)
    data.user = { name: 'Frank' } as Reactive<{ name: 'Frank' }>
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
  })

  it('can observe multiple data objects in watcher', async () => {
    const a = reactive({ price: 45 })
    const b = reactive({ quantity: 25 })
    const callback = vi.fn()
    watch(() => a.price * b.quantity, callback)
    expect(callback.mock.calls[0][0]).toBe(1125)
    a.price = 100
    await Promise.resolve()
    expect(callback.mock.calls[1][0]).toBe(2500)
    b.quantity = 5
    await Promise.resolve()
    expect(callback.mock.calls[2][0]).toBe(500)
  })
})
