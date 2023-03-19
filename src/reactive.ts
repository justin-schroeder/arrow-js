import { isR, queue, isReactiveFunction } from './common'

/**
 * Available types of keys for a reactive object.
 */
export type DataSourceKey = string | number | symbol | null

/**
 * Acceptable types of data targets for the reactive function.
 * TODO: Add much more robust typing for this using generics.
 */
export interface DataSource {
  [index: string]: any
  [index: number]: any
}

/**
 * An overly permissive array for data sources.
 */
export type DataSourceArray<T> = Array<unknown> & T

/**
 * A reactive proxy object.
 */
export type ProxyDataSource<T> = {
  [K in keyof T]: ReactiveProxy<T[K]> | T[K]
}

/**
 * An callback for an observer.
 */
export interface ObserverCallback {
  (value?: any, oldValue?: any): void
}
/**
 * A controller interface for a reactive proxy object’s dependencies.
 */
export interface DependencyProps {
  /**
   * Adds an observer to a given property.
   * @param p - The property to watch.
   * @param c - The callback to call when the property changes.
   * @returns
   */
  $on: (p: DataSourceKey, c: ObserverCallback) => void
  /**
   * Removes an observer from a given property.
   * @param p - The property to stop watching.
   * @param c - The callback to stop calling when the property changes.
   * @returns
   */
  $off: (p: DataSourceKey, c: ObserverCallback) => void
  /**
   * Emits an update "event" for the given property.
   * @param p - Property to emit that an update has occurred.
   * @param newValue - New value of the property.
   * @param oldValue - Old value of the property.
   * @returns
   */
  _em: (p: DataSourceKey, newValue: any, oldValue?: any) => void
  /**
   * The internal state of the reactive proxy object.
   * @returns
   */
  _st: () => ReactiveProxyState
  /**
   * The parent proxy object.
   * TODO: This concept should be removed in favor of a more robust dependency
   * tracking system via weakmap reference.
   */
  _p?: ReactiveProxyParent
}

/**
 * A reactive proxy object.
 */
export type ReactiveProxy<T> = {
  [K in keyof T]: T[K] extends DataSource ? ReactiveProxy<T[K]> : T[K]
} & DataSource &
  DependencyProps

type ReactiveProxyParent = [
  property: DataSourceKey,
  parent: ReactiveProxy<DataSource>
]

interface ReactiveProxyState {
  // o = observers
  o?: ReactiveProxyObservers
  // op = observerProperties
  op?: ReactiveProxyPropertyObservers
  // r = old Data
  r?: DataSource
  // p = Parent proxy object.
  p?: ReactiveProxyParent
}

type ReactiveProxyObservers = Map<DataSourceKey, Set<ObserverCallback>>

type ReactiveProxyPropertyObservers = Map<ObserverCallback, Set<DataSourceKey>>

type ReactiveProxyDependencyCollector = Map<
  symbol,
  Map<ReactiveProxy<DataSource>, Set<DataSourceKey>>
>

/**
 * A "global" dependency tracker object.
 */
const dependencyCollector: ReactiveProxyDependencyCollector = new Map()

/**
 * Given a data object, often an object literal, return a proxy of that object
 * with mutation observers for each property.
 *
 * @param  {DataSource} data
 * @returns ReactiveProxy
 */
export function r<T extends DataSource>(
  data: T,
  state: ReactiveProxyState = {}
): ReactiveProxy<T> {
  // If this is already reactive or a non object, just return it.
  if (isR(data) || typeof data !== 'object') return data
  // This is the observer registry itself, with properties as keys and callbacks as watchers.
  const observers: ReactiveProxyObservers = state.o || new Map()
  // This is a reverse map of observers with callbacks as keys and properties that callback is watching as values.
  const observerProperties: ReactiveProxyPropertyObservers =
    state.op || new Map()
  // If the data is an array, we should know...but only once.
  const isArray = Array.isArray(data)

  const children: string[] = []
  const proxySource: ProxyDataSource<T> = isArray ? [] : Object.create(data, {})
  for (const property in data) {
    const entry = data[property]

    if (typeof entry === 'object' && entry !== null) {
      proxySource[property] = !isR(entry) ? r(entry) : entry
      children.push(property)
    } else {
      proxySource[property] = entry
    }
  }

  // The add/remove dependency function(s)
  const dep =
    (a: 'add' | 'delete') => (p: DataSourceKey, c: ObserverCallback) => {
      let obs = observers.get(p)
      let props = observerProperties.get(c)
      if (!obs) {
        obs = new Set<ObserverCallback>()
        observers.set(p, obs)
      }
      if (!props) {
        props = new Set<DataSourceKey>()
        observerProperties.set(c, props)
      }
      obs[a](c)
      props![a](p)
    }
  // Add a property listener
  const $on = dep('add')
  // Remove a property listener
  const $off = dep('delete')
  // Emit a property mutation event by calling all sub-dependencies.
  const _em = (
    property: DataSourceKey,
    newValue: any,
    oldValue?: any
  ): void => {
    observers.has(property) &&
      observers.get(property)!.forEach((c) => c(newValue, oldValue))
  }

  /**
   * Return the reactive proxy state data.
   */
  const _st = (): ReactiveProxyState => {
    return {
      o: observers,
      op: observerProperties,
      r: proxySource,
      p: proxy._p,
    }
  }

  // These are the internal properties of all `r()` objects.
  const depProps: DependencyProps = {
    $on, // Listen to properties
    $off, // Stop listening to properties
    _em, // Emit a change event for a given property
    _st,
    _p: undefined,
  }

  // Create the actual proxy object itself.
  const proxy = new Proxy(proxySource, {
    has(target, key) {
      return key in depProps || key in target
    },
    get(...args) {
      const [, p] = args
      // For properties of the DependencyProps type, return their values from
      // the depProps instead of the target.
      if (Reflect.has(depProps, p)) return Reflect.get(depProps, p)

      const value = Reflect.get(...args)
      // For any existing dependency collectors that are active, add this
      // property to their observed properties.
      addDep(proxy, p)

      // We have special handling of array operations to prevent O(n^2) issues.
      if (isArray && p in Array.prototype) {
        return arrayOperation(
          p as string,
          proxySource as DataSourceArray<T>,
          proxy,
          value
        )
      }
      return value
    },
    set(...args) {
      const [target, property, value] = args
      const old = Reflect.get(target, property)
      if (Reflect.has(depProps, property)) {
        // We are setting a reserved property like _p
        return Reflect.set(depProps, property, value)
      }
      if (value && isR<T>(old)) {
        const o: ReactiveProxy<T> = old
        // We're assigning an object (array or pojo probably), so we want to be
        // reactive, but if we already have a reactive object in this
        // property, then we need to replace it and transfer the state of deps.
        const oldState = o._st()
        const newR = isR(value) ? reactiveMerge(value, o) : r(value, oldState)
        Reflect.set(
          target,
          property,
          // Create a new reactive object
          newR
        )
        _em(property, newR)
        // After assignment, we need to check all observers of the new property
        // and see if any of their respective values changed during the
        // assignment.
        ;(oldState.o as ReactiveProxyObservers).forEach((_c, property) => {
          const oldValue = Reflect.get(old, property!)
          const newValue = Reflect.get(newR, property!)
          if (oldValue !== newValue) {
            o._em(property, newValue, oldValue)
          }
        })
        return true
      }
      const didSet = Reflect.set(...args)
      if (didSet) {
        if (old !== value) {
          // Notify any discrete property observers of the change.
          _em(property, value, old)
        }
        if (proxy._p) {
          // Notify parent observers of a change.
          proxy._p[1]._em(...proxy._p)
        }
      }
      return didSet
    },
  }) as ReactiveProxy<T>

  if (state.p) proxy._p = state.p
  // Before we return the proxy object, quickly map through the children
  // and set the parents (this is only run on the initial setup).
  children.map((c) => {
    proxy[c]._p = [c, proxy]
  })
  return proxy
}

/**
 * Add a property to the tracked reactive properties.
 * @param  {ReactiveProxy} proxy
 * @param  {DataSourceKey} property
 */
function addDep(proxy: ReactiveProxy<DataSource>, property: DataSourceKey) {
  dependencyCollector.forEach((tracker) => {
    let properties = tracker.get(proxy)
    if (!properties) {
      properties = new Set()
      tracker.set(proxy, properties)
    }
    properties.add(property)
  })
}

function arrayOperation(
  op: string,
  arr: Array<unknown>,
  proxy: ReactiveProxy<DataSource>,
  native: unknown
) {
  const synthetic = (...args: any[]) => {
    // The `as DataSource` here should really be the ArrayPrototype, but we're
    // just tricking the compiler since we've already checked it.
    const retVal = (Array.prototype as DataSource)[op].call(arr, ...args)
    // @todo determine how to handle notifying elements and parents of elements.
    arr.forEach((item, i) => proxy._em(String(i), item))
    // Notify the the parent of changes.
    if (proxy._p) {
      const [property, parent] = proxy._p
      parent._em(property, proxy)
    }
    return retVal
  }
  switch (op) {
    case 'shift':
    case 'pop':
    case 'sort':
    case 'reverse':
    case 'copyWithin':
      return synthetic
    case 'unshift':
    case 'push':
    case 'fill':
      return (...args: any[]) => synthetic(...args.map((arg) => r(arg)))
    case 'splice':
      return (start: number, remove?: number, ...inserts: any[]) =>
        synthetic(start, remove, ...inserts.map((arg) => r(arg)))
    default:
      return native
  }
}

/**
 * Given two reactive proxies, merge the important state attributes from the
 * source into the target.
 * @param  {ReactiveProxy} reactiveTarget
 * @param  {ReactiveProxy} reactiveSource
 * @returns ReactiveProxy
 */
function reactiveMerge(
  reactiveTarget: ReactiveProxy<DataSource>,
  reactiveSource: ReactiveProxy<DataSource>
): ReactiveProxy<DataSource> {
  const state = reactiveSource._st()
  if (state.o) {
    state.o.forEach((callbacks, property) => {
      callbacks.forEach((c) => {
        reactiveTarget.$on(property, c)
      })
    })
  }
  if (state.p) {
    reactiveTarget._p = state.p
  }
  return reactiveTarget
}

/**
 * Watch a function and track any reactive dependencies on it, re-calling it if
 * those dependencies are changed.
 * @param  {CallableFunction} fn
 * @param  {CallableFunction} after?
 * @returns unknown
 */
export function w<
  T extends (...args: any[]) => unknown,
  F extends (...args: any[]) => any | undefined
>(fn: T, after?: F): F extends undefined ? ReturnType<T> : ReturnType<F> {
  const trackingId = Symbol()
  if (!dependencyCollector.has(trackingId)) {
    dependencyCollector.set(trackingId, new Map())
  }
  let currentDeps: Map<
    ReactiveProxy<DataSource>,
    Set<DataSourceKey>
  > = new Map()
  const queuedCallFn = queue(callFn)
  function callFn() {
    dependencyCollector.set(trackingId, new Map())
    const value: unknown = fn()
    const newDeps = dependencyCollector.get(trackingId) as Map<
      ReactiveProxy<DataSource>,
      Set<DataSourceKey>
    >
    dependencyCollector.delete(trackingId)
    // Disable existing properties
    currentDeps.forEach((propertiesToUnobserve, proxy) => {
      const newProperties = newDeps.get(proxy)
      if (newProperties) {
        newProperties.forEach((prop) => propertiesToUnobserve.delete(prop))
      }
      propertiesToUnobserve.forEach((prop) => proxy.$off(prop, queuedCallFn))
    })
    // Start observing new properties.
    newDeps.forEach((properties, proxy) => {
      properties.forEach((prop) => proxy.$on(prop, queuedCallFn))
    })
    currentDeps = newDeps
    return after ? after(value) : value
  }
  // If this is a reactive function, then when the expression is updated, re-run
  if (isReactiveFunction(fn)) fn.$on(callFn)
  return callFn()
}
