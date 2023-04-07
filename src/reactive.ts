import { isR } from './common'

interface ReactiveAPI<T> {
  /**
   * Adds an observer to a given property.
   * @param p - The property to watch.
   * @param c - The callback to call when the property changes.
   * @returns
   */
  $on: <P extends keyof T>(p: P, c: PropertyObserver<T[P]>) => void
  /**
   * Removes an observer from a given property.
   * @param p - The property to stop watching.
   * @param c - The callback to stop calling when the property changes.
   * @returns
   */
  $off: <P extends keyof T>(p: P, c: PropertyObserver<T[P]>) => void
}

/**
 * A reactive object is a proxy of an original object.
 */
export type Reactive<T> = T & ReactiveAPI<T>

/**
 * A callback used to observe a property changes on a reactive object.
 */
export interface PropertyObserver<T> {
  (newValue: T, oldValue: T): void
}

/**
 * A map of objects to their reactive proxies.
 */
const reactiveMemo = new WeakMap<object, Reactive<unknown>>()

/**
 * A reactive object is a proxy of the original object that allows for
 * reactive dependency watching. It is created by calling `reactive()` and
 * should be used to store reactive data in your app and components.
 *
 * @param data - The data to make reactive, typically a plain object.
 * @returns A reactive proxy of the original data.
 */
export function reactive<T extends object>(data: T): Reactive<T> {
  // The data is already a reactive object, so return it.
  if (isR(data)) return data as Reactive<T>
  // This object already has a proxy, return it.
  if (reactiveMemo.has(data)) return reactiveMemo.get(data) as Reactive<T>
  // Create the actual reactive proxy.
  return new Proxy(data, { has, get, set }) as Reactive<T>
}

/**
 * Determines if a certain key is in the target object.
 * @param target - The object to check.
 * @param key - The property to check.
 * @returns
 */
function has(target: object, key: PropertyKey): boolean {
  return key in target
}

/**
 * Gets a property from the target object.
 * @param target - The object to get the property on.
 * @param key - The property to get.
 * @param receiver - The proxy object.
 * @returns
 */
function get(target: object, key: PropertyKey, receiver: any): unknown {
  return Reflect.get(target, key, receiver)
}

/**
 * Gets a property from the target object.
 * @param target - The object to get the property on.
 * @param key - The property to get.
 * @param receiver - The proxy object.
 * @returns
 */
function set(
  target: object,
  key: PropertyKey,
  value: unknown,
  receiver: any
): boolean {
  return Reflect.set(target, key, value, receiver)
}

const x = reactive({ a: 1, b: '123' })
