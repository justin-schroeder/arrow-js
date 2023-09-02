import { ReactiveFunction, ArrowTemplate } from './html'
import { ReactiveProxy, DataSource, ObserverCallback } from './reactive'

/**
 * A queue of expressions to run as soon as an async slot opens up.
 */
const queueStack: Set<CallableFunction> = new Set()
/**
 * A stack of functions to run on the next tick.
 */
const nextTicks: Set<CallableFunction> = new Set()

/**
 * Adds the ability to listen to the next tick.
 * @param  {CallableFunction} fn?
 * @returns Promise
 */
export function nextTick(fn?: CallableFunction): Promise<unknown> {
  if (!queueStack.size) {
    if (fn) fn()
    return Promise.resolve()
  }
  let resolve: (value?: unknown) => void
  const p = new Promise((r) => {
    resolve = r
  })
  nextTicks.add(() => {
    if (fn) fn()
    resolve()
  })
  return p
}

export function isTpl(template: unknown): template is ArrowTemplate {
  return typeof template === 'function' && !!(template as ArrowTemplate).isT
}

export function isR<T = DataSource>(obj: unknown): obj is ReactiveProxy<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    '$on' in obj &&
    typeof obj.$on === 'function'
  )
}

/**
 * Utility that ensures we only attempt to make reactive objects that _can_ be made reactive.
 *
 * Examples of objects that cause issues: NodeList, HTMLElement
 * @see {@link https://github.com/vuejs/core/blob/8998afa42755cbdb3403cd6c0fe158980da8492c/packages/reactivity/src/reactive.ts#L43-L62}
 */
export function canReactiveWrap(maybeObj: any): boolean {
  return ['Object', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet'].includes(
    // from https://github.com/vuejs/core/blob/8998afa42755cbdb3403cd6c0fe158980da8492c/packages/shared/src/general.ts#L64-L67
    // extracts "Type" from "[object Type]"
    Object.prototype.toString.call(maybeObj).slice(8, -1)
  )
}

export function isReactiveFunction(
  fn: CallableFunction
): fn is ReactiveFunction {
  return '$on' in fn
}

/**
 * Queue an item to execute after all synchronous functions have been run. This
 * is used for `w()` to ensure multiple dependency mutations tracked on the
 * same expression do not result in multiple calls.
 * @param  {CallableFunction} fn
 * @returns ObserverCallback
 */
export function queue(fn: ObserverCallback): ObserverCallback {
  return (newValue?: unknown, oldValue?: unknown) => {
    function executeQueue() {
      // copy the current queues and clear it to allow new items to be added
      // during the execution of the current queue.
      const queue = Array.from(queueStack)
      queueStack.clear()
      const ticks = Array.from(nextTicks)
      nextTicks.clear()
      queue.forEach((fn) => fn(newValue, oldValue))
      ticks.forEach((fn) => fn())
      if (queueStack.size) {
        // we received new items while executing the queue, so we need to
        // execute the queue again.
        queueMicrotask(executeQueue)
      }
    }
    if (!queueStack.size) {
      queueMicrotask(executeQueue)
    }
    queueStack.add(fn)
  }
}

export const measurements: Record<string, number[]> = {}

/**
 * A simple benchmarking function.
 * @param label - A label for the measurement
 * @param fn - A function to measure or a number to record
 * @returns
 */
export function measure<T = unknown>(
  label: string,
  fn: CallableFunction | number
): T {
  const start = performance.now()
  const isFn = typeof fn === 'function'
  label = isFn ? `${label} (ms)` : `${label} (calls)`
  const x = isFn ? fn() : fn
  const result = isFn ? performance.now() - start : fn
  if (!measurements[label]) measurements[label] = [result]
  else measurements[label].push(result)
  return x
}
