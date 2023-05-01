import { describe, it, expect } from 'vitest'
import { createPool, Pool, PoolNode } from '../pool'

type Item = { value: string | null } & PoolNode<Item>

function allocate(this: Pool<Item, typeof allocate>, value: string) {
  const item = this.next()
  item.value = value
  this.head = item.next!
  return item
}

const create = (): Item => ({ value: null })

describe('memory pool', () => {
  it('it can create a new pool of items of the correct size', () => {
    const pool = createPool(5, create, allocate)
    expect(pool.data.length).toBe(5)
  })

  it('it explicitly grow new pool of items of the correct size', () => {
    const pool = createPool(5, create, allocate).grow(10)
    expect(pool.data.length).toBe(15)
  })

  it('can allocate items and auto grow', () => {
    const pool = createPool(3, create, allocate)
    const item = pool.allocate('a')
    expect(item).toMatchObject({ value: 'a' })
    expect(pool.data[0]).toEqual({ value: null })
    expect(pool.data.indexOf(item)).toBe(2)
    pool.allocate('b')
    pool.allocate('c')
    expect(pool.data.map((item) => item.value)).toEqual(['c', 'b', 'a'])
    pool.allocate('d')
    expect(pool.data.length).toBe(6)
  })

  it('can free items and re-allocate', () => {
    const pool = createPool(3, create, allocate)
    pool.allocate('a')
    const middle = pool.allocate('b')
    pool.allocate('c')
    pool.free(middle)
    pool.allocate('d')
    expect(pool.data.map((item) => item.value)).toEqual(['c', 'd', 'a'])
    pool.allocate('e')
    expect(pool.data.map((item) => item.value)).toEqual([
      'c',
      'd',
      'a',
      null,
      null,
      'e',
    ])
    pool.allocate('f')
    expect(pool.data.map((item) => item.value)).toEqual([
      'c',
      'd',
      'a',
      null,
      'f',
      'e',
    ])
  })
})
