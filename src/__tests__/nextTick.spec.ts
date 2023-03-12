import { reactive, nextTick, watch } from '..'

describe('nextTick', () => {
  it('executes callback tick when nothing needs to be done', () => {
    const callback = jest.fn()
    nextTick(callback)
    expect(callback.mock.calls.length).toBe(1)
  })

  it('returns a promise when nothing needs to be done', () => {
    expect(nextTick()).toBeInstanceOf(Promise)
  })

  it('squashes watcher events to a single call', () => {
    const data = reactive({
      l: 100,
    })
    const watchCallback = jest.fn()
    const onCallback = jest.fn()
    data.$on('l', onCallback)
    watch(() => data.l, watchCallback)
    for (let i = 0; i < 100; i++) {
      data.l--
    }
    expect(onCallback.mock.calls.length).toBe(100)
    nextTick(() => expect(watchCallback.mock.calls.length).toBe(2))
  })
})
