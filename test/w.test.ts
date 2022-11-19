import { nextTick, r, w } from '../src'

type Data = {
  value: number | null
}

describe('w', () => {
  it('should call when depencency changes', async () => {
    const d = r({ value: 0 })

    const callback = jest.fn(() => {
      d.value
    })

    w(callback)

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
    const d = r<Data>({ value: null })

    const inner = jest.fn()

    function callback() {
      if (d.value !== null) {
        inner()
      }
    }

    w(callback)

    await nextTick()
    expect(inner).toHaveBeenCalledTimes(0) // if value is null, inner should not be called

    d.value = 10
    await nextTick()
    expect(inner).toHaveBeenCalledTimes(1)

    d.value = null
    await nextTick()
    expect(inner).toHaveBeenCalledTimes(1)
  })
})
