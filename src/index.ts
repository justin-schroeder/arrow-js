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

export { nextTick } from './common'

export { ArrowTemplate } from './html'

export { ReactiveProxy } from './reactive'
