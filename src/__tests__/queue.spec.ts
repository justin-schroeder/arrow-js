import { describe, it, vi, expect } from 'vitest'
import { createQueueable, queue } from '../scheduler'

describe('queue', () => {
  it('each call to queue returns an incremented pointer', () => {
    const pointer1 = createQueueable(vi.fn())
    const pointer2 = createQueueable(vi.fn())
    expect(pointer2).toBe(pointer1 + 1)
  })
  it('calling a queue multiple times results in a single call', async () => {
    const callback = vi.fn()
    const pointer = createQueueable(callback)
    queue(pointer)
    queue(pointer)
    queue(pointer)
    expect(callback).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it('can queue an item inside a queued item', async () => {
    let maxRecursion = 10
    const callback = vi.fn(() => {
      if (--maxRecursion > 0) {
        queue(queuePointer)
      }
    })
    const queuePointer = createQueueable(callback)
    queue(queuePointer)
    await new Promise((r) => setTimeout(r, 10))
    expect(callback).toHaveBeenCalledTimes(10)
  })
})
