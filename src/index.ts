import { t } from './html'
import { r, w } from './reactive'

/**
 * html is an alias for t
 */
export const html = t
/**
 * reactive is an alias for r
 */
export const reactive = r
/**
 * watch is an alias for w
 */
export const watch = w

export { t, r, w }

export { nextTick } from './common'

export type { ArrowTemplate } from './html'

export type { ReactiveProxy } from './reactive'
