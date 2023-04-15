/**
 * A memory pool of queues to use for `queue()`.
 */
const callbackPool: Array<CallableFunction> = new Array(500).fill(null)

/**
 * The actual queue of callbacks to execute.
 */
export const schedules: [
  tick: Set<number>,
  tock: Set<number>,
  nextTick: Set<number>
] = [new Set<number>(), new Set<number>(), new Set<number>()]
/**
 * A flag to determine if the queue is currently scheduled to run.
 */
let isScheduled = false

/**
 * A pointer to the current schedule pool cursor.
 */
let activeSchedule = 0

/**
 * A pointer to the current queue pool cursor.
 */
let callbackCursor = 0

/**
 * Queue an item to execute after all synchronous functions have been run. This
 * is used for `w()` to ensure multiple dependency mutations tracked on the
 * same expression do not result in multiple calls.
 * @param  {CallableFunction} fn
 * @returns PropertyObserver
 */
export function createQueueable(fn: CallableFunction): number {
  const pointer = callbackCursor++
  callbackPool[pointer] = fn
  return pointer
}

/**
 * Queue the given callback to execute after all synchronous functions have been
 * run.
 * @param pointer - The pointer of the callback to queue.
 */
export function queue(pointer: number): void {
  schedules[activeSchedule].add(pointer)
  if (!isScheduled) {
    isScheduled = true
    queueMicrotask(execute)
  }
}

/**
 * Perform the given callback after all microtasks have been run.
 * @param callback - The callback to queue.
 */
export function nextTick(): Promise<void>
export function nextTick<T extends (...args: any[]) => unknown>(
  callback: T
): Promise<ReturnType<T>>
export function nextTick<T extends (...args: any[]) => unknown>(
  callback?: T
): Promise<ReturnType<T> | void> {
  return new Promise((resolve) => {
    const pointer = createQueueable(() => {
      resolve(callback?.() as ReturnType<T> | void)
    })
    schedules[2].add(pointer)
    if (!isScheduled) execute()
  })
}

/**
 * Flush all queued nextTicks. Note that nextTicks that are created during the
 * flushing of nextTicks will not be re-flushed.
 */
function flushNextTicks() {
  for (const p of schedules[2]) {
    callbackPool[p!]()
  }
  schedules[2].clear()
}

/**
 * Execute all queued callbacks.
 */
function execute() {
  const schedule = activeSchedule
  // Reset the queue on the alternative scheduler pool. This is done to ensure
  // any effects of running these callbacks will still accumulate and be run
  // in the next microtask.
  isScheduled = false
  activeSchedule = +!activeSchedule
  for (const p of schedules[schedule]) {
    callbackPool[p!]()
  }
  schedules[schedule].clear()
  // If the next schedule queue is empty after having run all effects, flush
  // the nextTicks queue.
  if (!schedules[activeSchedule].size) flushNextTicks()
}
