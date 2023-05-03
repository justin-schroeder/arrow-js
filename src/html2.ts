import { createPool, Pool } from './pool'

/**
 * Strings or numbers are used to identify memo keys or template keys.
 */
type ArrowKey = string | number

/**
 * Mount method interface.
 */
interface Mount {
  (): Node | Node[]
  (target: Element): ArrowTemplate
  (target?: Element): Node | Node[] | ArrowTemplate
}

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
  mount: Mount
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
  memo: (...memoKeys: ArrowKey[]) => ArrowTemplate
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
  next: ArrowTemplate
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

const templatePool = createPool(
  1000,
  (): ArrowTemplate => ({
    _k: null,
    _m: null,
    _h: null,
    _id: null,
    _e: [],
    id(id: string) {
      this._id = id
      return this
    },
    key(k: ArrowKey) {
      this._k = k
      return this
    },
    memo(...args: ArrowKey[]) {
      this._m = args
      return this
    },
    mount(el?: Element): ArrowTemplate | Node | Node[] {
      const nodes = build(this)
      if (el) Array.isArray(nodes) ? el.append(...nodes) : el.append(nodes)
      else return nodes
      return this
    },
  }),
  allocateTemplate
)

function allocateTemplate(
  this: Pool<ArrowTemplate, typeof allocateTemplate>,
  html: string | TemplateStringsArray[] | string[],
  ...expressions: ArrowExpression[]
): ArrowTemplate {
  const template = this.next()
  template._h = typeof html === 'string' ? xxx : html
  template._e = expressions
  return template
}

export function html(id: string, ...expSlots: ArrowExpression[]): ArrowTemplate
export function html(
  strings: TemplateStringsArray[] | string[],
  ...expSlots: ArrowExpression[]
): ArrowTemplate
export function html(
  html: string | TemplateStringsArray[] | string[],
  ...expSlots: ArrowExpression[]
): ArrowTemplate {
  return templatePool.allocate(html, expSlots)
}

function build(template: ArrowTemplate): Node | Node[] {
  // TODO: implement
}
