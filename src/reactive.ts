import { isR, isO, queue, measure } from './common'

/**
 * The target of a reactive object.
 */
export type ReactiveTarget = Record<PropertyKey, unknown> | unknown[]

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
export type Reactive<T extends ReactiveTarget> = {
  /**
   * In the future it would be great to have variant types here for
   * accessing vs setting types. For example:
   * ```js
   * const obj = reactive({ x: { a: 123 } })
   * // Assignment should support non-reactive
   * obj.x = { a: 456 }
   * // Accessor should always be reactive:
   * obj.x.$on('a', (value) => console.log(value))
   * ```
   * This requires an update to TypeScript: https://github.com/microsoft/TypeScript/issues/43826
   */
  [P in keyof T]: T[P] extends ReactiveTarget ? Reactive<T[P]> | T[P] : T[P]
} & ReactiveAPI<T>

/**
 * A callback used to observe a property changes on a reactive object.
 */
export interface PropertyObserver<T> {
  (newValue?: T, oldValue?: T): void
}

/**
 * A simple registry of objects containing keys which are the ids of
 * reactive objects and values which are an array of properties.
 */
interface Dependencies {
  [id: number]: Set<PropertyKey>
}

/**
 * A map of objects to their reactive proxies.
 */
const reactiveMemo = new WeakMap<ReactiveTarget, Reactive<ReactiveTarget>>()

/**
 * A registry of reactive objects to their unique numeric index which serves as
 * an unique identifier.
 */
const ids = new WeakMap<ReactiveTarget, number>()

/**
 * A registry of reactive objects to their property observers.
 */
const listeners: {
  [id: number]: {
    [property: PropertyKey]: Set<PropertyObserver<unknown>>
  }
} = {}

/**
 * Gets the unique id of a given target.
 * @param target - The object to get the id of.
 * @returns
 */
const id = (target: ReactiveTarget): number => ids.get(target)!

/**
 * An index counter for the reactive objects.
 */
let index = -1
/**
 * An index counter to identify watchers.
 */
let watchIndex = 0
/**
 * The current key being tracked.
 */
let trackKey = 0

/**
 * A registry of dependencies for each tracked key.
 */
const trackedDependencies: {
  [trackingKey: number]: Dependencies
} = {}

/**
 * A registry of dependencies that are being watched by a given watcher.
 */
const watchedDependencies: {
  [watcherKey: number]: Dependencies
} = {}

/**
 * A map of child ids to their parents (a child can have multiple parents).
 */
const parents: {
  [child: number]: Array<[parent: number, property: PropertyKey]>
} = {}

/**
 * A reactive object is a proxy of the original object that allows for
 * reactive dependency watching. It is created by calling `reactive()` and
 * should be used to store reactive data in your app and components.
 *
 * @param data - The data to make reactive, typically a plain object.
 * @returns A reactive proxy of the original data.
 */
export function reactive<T extends ReactiveTarget>(data: T): Reactive<T> {
  // The data is already a reactive object, so return it.
  if (isR(data)) return data as Reactive<T>
  // This object already has a proxy, return it.
  if (reactiveMemo.has(data)) return reactiveMemo.get(data) as Reactive<T>
  // Only valid objects can be reactive.
  if (!isO(data)) throw Error('Non object passed to reactive.')
  // Create a new slot in the listeners registry and then store the relationship
  // of this object to its index.
  listeners[++index] = {}
  // Create the actual reactive proxy.
  const proxy = new Proxy(data, { has, get, set }) as Reactive<T>
  // let the ids know about the index
  ids.set(data, index).set(proxy, index)
  return proxy
}

/**
 * Determines if a certain key is in the target object.
 * @param target - The object to check.
 * @param key - The property to check.
 * @returns
 */
function has(target: ReactiveTarget, key: PropertyKey): boolean {
  if (key in api) return true
  track(target, key)
  return key in target
}

/**
 * Gets a property from the target object.
 * @param target - The object to get the property on.
 * @param key - The property to get.
 * @param receiver - The proxy object.
 * @returns
 */
function get(target: ReactiveTarget, key: PropertyKey, receiver: any): unknown {
  if (key in api) return api[key as keyof typeof api](target)
  track(target, key)
  const result = Reflect.get(target, key, receiver)
  if (isO(result) && !isR(result)) {
    const child = createChild(result, target, key)
    target[key as number] = child
    return child
  }
  return result
}

/**
 * Gets a property from the target object.
 * @param target - The object to get the property on.
 * @param key - The property to get.
 * @param receiver - The proxy object.
 * @returns
 */
function set(
  target: ReactiveTarget,
  key: PropertyKey,
  value: unknown,
  receiver: any
): boolean {
  // If this is a new property then we need to notify parent properties
  const isNewProperty = !(key in target)
  // If the newly assigned item is not reactive, make it so.
  const newReactive =
    isO(value) && !isR(value) ? createChild(value, target, key) : null
  // Retrieve the old value
  const oldValue = target[key as number]
  // The new value
  const newValue = newReactive ?? value
  // Perform the actual set operation
  const didSucceed = Reflect.set(target, key, newValue, receiver)
  // If the old value was reactive, and the new value is
  if (oldValue !== newValue && isR(oldValue) && isR(newValue))
    reassign(id(target), key, id(oldValue), id(newValue))
  // Notify all listeners
  emit(id(target), key, value, oldValue, isNewProperty)
  return didSucceed
}

/**
 *
 * @param child - Creates a child relationship
 * @param parent
 * @param key
 * @returns
 */
function createChild(
  child: ReactiveTarget,
  parent: ReactiveTarget,
  key: PropertyKey
): Reactive<ReactiveTarget> {
  const r = reactive(child)
  parents[id(child)] ??= []
  parents[id(child)].push([id(parent), key])
  return r
}

/**
 * Transfers listeners from one parent object’s reactive property to another.
 * @param parentId - The parent id
 * @param key - The property key to reassign
 * @param from - The previous reactive id
 * @param to - The new reactive id
 */
function reassign(
  parentId: number,
  key: PropertyKey,
  from: number,
  to: number
) {
  // Remove the old parent relationship
  if (parents[from]) {
    const index = parents[from].findIndex(
      ([parent, property]) => parent == parentId && property == key
    )
    if (index > -1) parents[from].splice(index, 1)
  }
  // Create a new parent relationship if it does not already exist.
  if (!parents[to]?.some(([i, property]) => i == parentId && key == property)) {
    parents[to] ??= []
    parents[to].push([parentId, key])
  }
}

/**
 *
 * @param target - The object that changed.
 * @param key - The property that changed.
 * @param newValue - The new value of the property.
 * @param oldValue - The old value of the property.
 */
function emit(
  i: number,
  key: PropertyKey,
  newValue?: unknown,
  oldValue?: unknown,
  notifyParents?: boolean
) {
  const targetListeners = listeners[i]
  if (targetListeners[key]) {
    targetListeners[key].forEach((callback) => callback(newValue, oldValue))
  }
  if (notifyParents) {
    parents[i]?.forEach(([parentId, property]) => emit(parentId, property))
  }
}

/**
 * The public reactive API for a reactive object.
 */
const api = {
  $on:
    (target: ReactiveTarget): ReactiveAPI<ReactiveTarget>['$on'] =>
    (property, callback) =>
      addListener(id(target), property, callback),
  $off:
    (target: ReactiveTarget): ReactiveAPI<ReactiveTarget>['$off'] =>
    (property, callback) =>
      removeListener(id(target), property, callback),
}

/**
 * Adds a listener to a reactive object.
 * @param id - The id of the target object.
 * @param property - The property to listen to.
 * @param callback - The callback to call when the property changes.
 */
function addListener(
  id: number,
  property: PropertyKey,
  callback: PropertyObserver<any>
) {
  const targetListeners = listeners[id]
  targetListeners[property] ??= new Set()
  targetListeners[property].add(callback)
}

/**
 * Removes a listener from a reactive object.
 * @param id - The id of the target object.
 * @param property - The property to remove the listener from.
 * @param callback - The callback to remove.
 */
function removeListener(
  id: number,
  property: PropertyKey,
  callback: PropertyObserver<any>
) {
  const targetListeners = listeners[id]
  if (targetListeners[property]) {
    targetListeners[property].delete(callback)
  }
}

/**
 * Track a reactive property as a dependency.
 * @param target
 * @param key
 */
function track(target: ReactiveTarget, property: PropertyKey): void {
  if (!trackKey) return
  const properties = (trackedDependencies[trackKey][id(target)] ??= new Set())
  properties.add(property)
}

/**
 * Begin tracking reactive dependencies.
 */
function startTracking() {
  trackedDependencies[++trackKey] = {}
}

/**
 * Stop tracking reactive dependencies and register a callback for when any of
 * the tracked dependencies change.
 * @param callback - A function to re-run when dependencies change.
 */
function stopTracking(watchKey: number, callback: PropertyObserver<unknown>) {
  const key = trackKey--
  flushListeners(watchedDependencies[watchKey], callback)
  addListeners(trackedDependencies[key], callback)
  watchedDependencies[watchKey] = trackedDependencies[key]
}

/**
 * Removes a callback from the listeners registry for a given set of
 * dependencies.
 * @param deps - The dependencies to flush.
 * @param callback - The callback to remove.
 */
function flushListeners(
  deps: Dependencies,
  callback: PropertyObserver<unknown>
) {
  for (const key in deps) {
    const properties = deps[key]
    properties.forEach((prop) => listeners[key][prop].delete(callback))
  }
}

/**
 * Adds a callback to the listeners registry for a given set of dependencies.
 * @param deps - The dependencies to add listeners for.
 * @param callback - The callback to add.
 */
function addListeners(deps: Dependencies, callback: PropertyObserver<unknown>) {
  for (const key in deps) {
    const properties = deps[key]
    properties.forEach((prop) => addListener(Number(key), prop, callback))
  }
}

/**
 * Calls a function and watches it for changes.
 * @param fn - A function to watch.
 * @param after - A function to call after the watched function with the result.
 */
export function watch<F extends (...args: any[]) => any>(
  effect: F
): [returnValue: ReturnType<F>, stop: () => void]
export function watch<
  F extends (...args: any[]) => any,
  A extends (arg: ReturnType<F>) => unknown
>(effect: F, afterEffect: A): [returnValue: ReturnType<A>, stop: () => void]
export function watch<
  F extends (...args: any[]) => any,
  A extends (arg: ReturnType<F>) => unknown
>(
  effect: F,
  afterEffect?: A
): [returnValue: ReturnType<F> | ReturnType<A>, stop: () => void] {
  const watchKey = ++watchIndex
  let rerun: null | PropertyObserver<any> = queue(runEffect)
  function runEffect() {
    startTracking()
    const effectValue = effect()
    stopTracking(watchKey, rerun!)
    return afterEffect ? afterEffect(effectValue) : effectValue
  }
  const stop = () => {
    flushListeners(watchedDependencies[watchKey], rerun!)
    rerun = null
  }
  return [runEffect(), stop]
}
