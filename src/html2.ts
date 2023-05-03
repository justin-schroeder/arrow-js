import { createPool, Pool } from './pool'

/**
 * Strings or numbers are used to identify memo keys or template keys.
 */
type ArrowKey = string | number

export interface ArrowTemplate {
  /**
   * The unique key assigned to this template.
   */
  _k: ArrowKey | null
  /**
   * The memo key assigned to this template.
   */
  _m: ArrowKey[] | null
  /**
   * The globally unique identifier assigned to this template.
   */
  _id: string | null
  /**
   * The expressions assigned to this template.
   */
  _e: ArrowExpression[]
  /**
   * Raw HTML template strings.
   */
  _h: TemplateStringsArray[] | string[] | null
  /**
   * Mount the template to a given target. Mounting this template will replace
   * the contents of the target with the rendered output of this template.
   * @param target - A target to mount the template to.
   * @returns {ArrowTemplate}
   */
  mount: {
    (): Node | Node[]
    (target: Element): ArrowTemplate
    (target?: Element): Node | Node[] | ArrowTemplate
  }
  /**
   * Generally used for lists of items. Used to maintain a stateful element
   * when list rendering.
   * @param key - A unique key to identify this template.
   * @returns
   */
  key: (key: ArrowKey) => ArrowTemplate
  /**
   * For performance on large lists, you can use the memo function to avoid any
   * diffing on the template assuming this memo key(s) has not changed.
   * @param memoKeys - Unique key to memoize this template.
   * @returns
   */
  memo: (memoKeys: ArrowKey[]) => ArrowTemplate
  /**
   * All templates are automatically memoized by their HTML content. Use this
   * method to assign an alternative memoization key. This can be used to recall
   * a template’s memoization.
   * @param id - A globally unique identifier for this template.
   * @returns
   */
  id: (id: string) => ArrowTemplate
  /**
   * For internal use only. Used to assign the next free template in the memory
   * pool.
   * @returns
   */
  next?: ArrowTemplate
}

/**
 * Types of return values that can be rendered.
 */
export type ArrowRenderable =
  | string
  | number
  | boolean
  | null
  | undefined
  | ArrowTemplate
  | Array<string | number | ArrowTemplate>

/**
 * The possible values of an arrow expression.
 */
export interface ArrowFunction {
  (...args: unknown[]): ArrowRenderable
}

/**
 * The possible value of an arrow expression.
 */
export type ArrowExpression =
  | ArrowRenderable
  | ArrowFunction
  | EventListener
  | ((evt: InputEvent) => void)

/**
 * Creates the memory pool of templates. This is used to recycle template
 * objects for increased performance from reduced garbage collection.
 */
const templatePool = createPool(
  1000,
  (): ArrowTemplate => ({
    _k: null,
    _m: null,
    _h: null,
    _id: null,
    _e: [],
    next: undefined,
    id(id: string) {
      this._id = id
      return this
    },
    key(k: ArrowKey) {
      this._k = k
      return this
    },
    memo(m: ArrowKey[]) {
      this._m = m
      return this
    },
    mount,
  }),
  allocateTemplate
)

/**
 * Returns the DOM nodes created by this template without performing any
 * further action.
 * @param this - The template to render.
 */
function mount(this: ArrowTemplate): Node | Node[]
/**
 * Mounts the template into the given element. This performs an append of the
 * rendered nodes.
 * @param this - The template to mount.
 * @param el
 */
function mount(this: ArrowTemplate, el: Element): ArrowTemplate
function mount(
  this: ArrowTemplate,
  el?: Element
): ArrowTemplate | Node | Node[] {
  const nodes = build(this)
  if (el) Array.isArray(nodes) ? el.append(...nodes) : el.append(nodes)
  else return nodes
  return this
}

/**
 *
 * @param this - The template pool.
 * @param html - The HTML template strings.
 * @param expressions - The reactive expressions.
 * @returns
 */
function allocateTemplate(
  this: Pool<ArrowTemplate, typeof allocateTemplate>,
  html: string | TemplateStringsArray[] | string[],
  expressions: ArrowExpression[]
): ArrowTemplate {
  const template = this.next()
  template._h = typeof html === 'string' ? null : html
  template._e = expressions
  return template
}

/**
 * Used as a tag for tagged template literal. This function creates a new
 * ArrowTemplate with the given HTML template strings and reactive expressions:
 *
 * ```ts
 * const data = reactive({ name: 'John' })
 * html`<div>${() => data.name}</div>`.mount(document.body)
 * ```
 *
 * @param strings - The HTML template strings.
 * @param expSlots - The reactive and static expressions from the template.
 * @returns {ArrowTemplate}
 */
export function html(
  strings: TemplateStringsArray[] | string[],
  ...expSlots: ArrowExpression[]
): ArrowTemplate
/**
 * The main function used to create an ArrowTemplate, when only a single string
 * is passed as the first argument it is assumed that string is a unique id
 * that was already stored in memo using the ArrowTemplate.id() method.
 * @param id - A globally unique identifier for this template.
 * @param expSlots - The reactive and static expressions.
 * @returns {ArrowTemplate}
 */
export function html(id: string, ...expSlots: ArrowExpression[]): ArrowTemplate
/**
 * Generic implementation of the html function.
 * @param html - Unique id or template strings.
 * @param expSlots - Expressions to render.
 * @returns
 */
export function html(
  html: string | TemplateStringsArray[] | string[],
  ...expSlots: ArrowExpression[]
): ArrowTemplate {
  return templatePool.allocate(html, expSlots)
}

function build(template: ArrowTemplate): Node | Node[] {}
