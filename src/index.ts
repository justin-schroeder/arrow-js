import { html } from './html'
import { reactive, watch } from './reactive'

export { html, html as t, reactive, reactive as r, watch, watch as w }

export { nextTick } from './common'

export type { ArrowTemplate } from './html'

export type { ReactiveProxy } from './reactive'

// TODO: REMOVE THIS
export { measurements } from './common'
