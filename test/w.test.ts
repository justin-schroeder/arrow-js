import { nextTick, reactive, watch } from '../src'

type Data = {
  value: number | null
}

describe('w', () => {
  it('should call when depencency changes', async () => {
    const d = reactive({ value: 0 })

    const callback = jest.fn(() => {
      d.value
    })

    watch(callback)

    await nextTick()
    expect(callback).toHaveBeenCalledTimes(1)

    d.value = 10
    await nextTick()

    expect(callback).toHaveBeenCalledTimes(2)

    d.value = 20
    await nextTick()

    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('should handle null values', async () => {
    const d = reactive<Data>({ value: null })

    const inner = jest.fn()

    function callback() {
      if (d.value !== null) {
        inner()
      }
    }

    watch(callback)

    await nextTick()
    expect(inner).toHaveBeenCalledTimes(0) // if value is null, inner should not be called

    d.value = 10
    await nextTick()
    expect(inner).toHaveBeenCalledTimes(1)

    d.value = null
    await nextTick()
    expect(inner).toHaveBeenCalledTimes(1)
  })

  it('should handle changes inside a watcher', async () => {
    const d1 = reactive<Data>({ value: 0 })
    const d2 = reactive<Data>({ value: 1 })

    const cb1 = jest.fn()
    const cb2 = jest.fn()

    function callback() {
      if (d1.value === 1) {
        // triggers other watcher
        d2.value = 2
        // triggers itself
        d1.value = 2
      } else if (d1.value === 2) {
        cb1()
      }
    }
    function callback2() {
      if (d2.value === 2) {
        cb2()
      }
    }
    watch(callback2)
    watch(callback)
    expect(cb1).toHaveBeenCalledTimes(0)
    expect(cb2).toHaveBeenCalledTimes(0)

    d1.value = 1
    await nextTick()
    expect(cb1).toHaveBeenCalledTimes(0)
    expect(cb2).toHaveBeenCalledTimes(0)

    await nextTick()
    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenCalledTimes(1)
    expect(d1.value).toStrictEqual(2)
    expect(d2.value).toStrictEqual(2)
  })

  it('should handle own changes inside a watcher on initial call', async () => {
    const d = reactive<Data>({ value: 1 })

    const cb1 = jest.fn()

    function callback() {
      if (d.value === 1) {
        // should trigger itself
        d.value = 2
      } else if (d.value === 2) {
        cb1()
      }
    }

    // this only works if we separate the dependency from the callback
    watch(() => d.value, callback)

    expect(cb1).toHaveBeenCalledTimes(0)

    await nextTick()
    expect(cb1).toHaveBeenCalledTimes(1)
    expect(d.value).toStrictEqual(2)
  })
})
