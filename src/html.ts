import { watch } from './reactive'
import { isTpl, queue } from './common'
/**
 * An arrow template one of the three primary ArrowJS utilities. Specifically,
 * templates are functions that return a function which mounts the template to
 * a given parent node. However, the template also has some other properties on
 * it like `.key` and `.isT`.
 *
 * The "magic" of an arrow template, is any expressions that are in the template
 * literal are automatically observed for changes. When a change is detected,
 * the bound attributes or textNodes are updated.
 */
export interface ArrowTemplate {
  /**
   * Mounts the template to a given parent node.
   */
  (parent: ParentNode): ParentNode
  (): DocumentFragment
  /**
   * A boolean flag that indicates this is indeed an ArrowTemplate.
   */
  isT: boolean
  /**
   * Adds a key to this template to identify it as a unique instance.
   * @param key - A unique key that identifies this template instance (not index).
   * @returns
   */
  key: (key: ArrowTemplateKey) => ArrowTemplate
  /**
   * Allows memoization of a template, will prevent patching.
   * @param memoKey - A unique key that identifies this template as "unchanged".
   * @returns
   */
  memo: (memoKey: ArrowTemplateKey) => ArrowTemplate
  /**
   * Yields the underlying chunk object that is used to render this template.
   * @returns
   * @internal
   */
  _c: () => Chunk
  /**
   * Update the reactive expressions that are contained within this template.
   * This function *must* be passed a matching quantity of reactive expressions.
   * @param newExpressions - ArrowFunctions to reassign to the expressions.
   * @returns
   * @internal
   */
  _u: (newExpressions: ReactiveFunction[]) => void
  /**
   * Yield the reactive expressions that are contained within this template.
   * Does not contain the expressions that are are not "reactive".
   * @returns
   * @internal
   */
  _e: () => ReactiveFunction[]
  /**
   * The template key.
   */
  _k: ArrowTemplateKey
  /**
   * The memo key.
   */
  _m: ArrowTemplateKey
}

/**
 * The allowed values for arrow keys.
 */
type ArrowTemplateKey = string | number | undefined

/**
 * Types of return values that can be rendered.
 */
type ArrowRenderable =
  | string
  | number
  | boolean
  | null
  | undefined
  | ArrowTemplate
  | Array<string | number | ArrowTemplate>

/**
 * A reactive function is a function that is bound to a template. It is the
 * higher order control around the expressions that are in the template literal.
 * It is responsible for updating the template when the expression changes.
 */
export interface ReactiveFunction {
  (el?: Node): ArrowRenderable
  (ev: Event, listener: EventListenerOrEventListenerObject): void
  $on: (observer: ArrowFunction | null) => ArrowFunction | null
  _up: (newExpression: ReactiveFunction) => void
  e: ArrowExpression
  s: boolean
}

/**
 * An array of reactive functions.
 */
export type ReactiveExpressions = {
  /**
   * The index of the currently active expression.
   */
  i: number
  /**
   * An array of the actual expressions.
   */
  e: ReactiveFunction[]
}

/**
 * An internal primitive that is used to create a dom elements.
 */
export interface ArrowFragment {
  <T extends ParentNode>(parent?: T): T extends undefined ? DocumentFragment : T
}

/**
 * A parent node is either an element or a document fragment — something that
 * can have elements appended to it.
 */
export type ParentNode = Node | DocumentFragment

/**
 * A classification of items that can be rendered within the template.
 */
export type RenderGroup =
  | ArrowTemplate
  | ArrowTemplate[]
  | Node
  | Node[]
  | string[]

/**
 * A function that can be used as an arrow expression — always returns a
 * renderable.
 */
export type ArrowFunction = (...args: unknown[]) => ArrowRenderable

/**
 * The possible value of an arrow expression.
 */
export type ArrowExpression =
  | ArrowRenderable
  | ArrowFunction
  | EventListener
  | ((evt: InputEvent) => void)

/**
 * A chunk of HTML with paths to the expressions that are contained within it.
 */
interface Chunk {
  /**
   * An array of array paths pointing to the expressions that are contained
   * within the HTML of this chunk.
   */
  readonly paths: Array<string | number>[]
  /**
   * A unique symbol that is used to identify this chunk, symbols are equal if
   * the HTML used to produce the chunk is equal.
   */
  readonly $: symbol
  /**
   * A document fragment that contains the HTML of this chunk. Note: this is
   * only populated with nodes until those nodes are mounted.
   */
  dom: DocumentFragment
  /**
   * An array of child nodes that are contained within this chunk. These
   * references stay active even after the nodes are mounted.
   */
  ref: ChildNode[]
  /**
   * A reference to the template that created this chunk.
   */
  _t: ArrowTemplate
  /**
   * A unique key that identifies this template instance, generally used in
   * list rendering.
   */
  k?: ArrowTemplateKey
  /**
   * An abort controller to terminate all event listeners in this chunk.
   */
  a?: AbortController
  /**
   * A memoization key, used for rendering lists.
   */
  m?: ArrowTemplateKey
}

/**
 * The delimiter that describes where expressions are located.
 */
const delimiter = '➳❍'
const attrDelimiter = '❲❍❳'
const delimiterComment = `<!--${delimiter}-->`
const attrComment = `<!--${attrDelimiter}-->`

/**
 * A memo of pathed chunks that have been created.
 */
const chunkMemo: Record<string, Omit<Chunk, '_t' | 'ref'>> = {}

/**
 * The template tagging function, used like: html`<div></div>`(mountEl)
 * @param  {TemplateStringsArray} strings
 * @param  {any[]} ...expressions
 * @returns ArrowTemplate
 */
export function html(
  strings: TemplateStringsArray,
  ...expSlots: ArrowExpression[]
): ArrowTemplate {
  let expressions: ReactiveFunction[] | null = null
  let chunk: Chunk
  function getExpressions(): ReactiveFunction[] {
    if (!expressions) {
      expressions = expSlots.map((expr) => createExpression(expr))
    }
    return expressions
  }
  function getChunk() {
    if (!chunk) {
      chunk = createChunk([...strings]) as Chunk
      chunk._t = template
      chunk.k = template._k
      chunk.m = template._m
    }
    return chunk
  }
  let hasMounted = false

  // The actual template. Note templates can be moved and remounted by calling
  // the template function again. This takes all the rendered dom nodes and
  // moves them back into the document fragment to be re-appended.
  const template = ((el?: ParentNode) => {
    if (!hasMounted) {
      hasMounted = true
      return createBindings(getChunk(), { i: 0, e: getExpressions() })(el)
    } else {
      const chunk = getChunk()
      chunk.dom.append(...chunk.ref)
      return el ? el.appendChild(chunk.dom) : chunk.dom
    }
  }) as ArrowTemplate

  // If the template contains no expressions, it is 100% static so it's key
  // its own content
  template.isT = true
  template._c = getChunk
  template._u = (exprs: ReactiveFunction[]) =>
    expressions?.forEach((e, i) => e._up(exprs[i]))
  template._e = getExpressions
  template.key = (key: ArrowTemplateKey): ArrowTemplate => {
    template._k = key
    return template
  }
  template.memo = (key: ArrowTemplateKey): ArrowTemplate => {
    template._m = key
    chunk && (chunk.m = key)
    return template
  }
  return template
}

/**
 * Creates an updatable expression.
 * @param literalExpression - An arrow function that returns a renderable.
 * @returns
 */
export function createExpression(
  literalExpression: ArrowExpression
): ReactiveFunction {
  let observer: ArrowFunction | null
  const expression = (...args: unknown[]): ArrowRenderable =>
    expression.s
      ? (expression.e as ArrowRenderable)
      : (expression.e as unknown as ArrowFunction)(...args)
  expression.e = literalExpression
  expression.s = typeof literalExpression !== 'function'
  expression.$on = (obs: ArrowFunction | null) => (observer = obs)
  expression._up = (exp: ReactiveFunction) => {
    ;(expression.e = exp.e), observer?.()
  }
  return expression
}

/**
 * Applies bindings to a pathed chunk and returns the resulting document
 * fragment that is ready to mount.
 * @param chunk - A chunk of HTML with paths to the expressions.
 * @param expressions - An expression list with cursor.
 */
function createBindings(
  chunk: Chunk,
  expressions: ReactiveExpressions
): ArrowFragment {
  const totalPaths = expressions.e.length
  const stack: Array<CallableFunction> = []
  for (; expressions.i < totalPaths; expressions.i++) {
    const expression = expressions.e[expressions.i]
    const path = chunk.paths[expressions.i]

    const len = path.length
    let node: Node = chunk.dom
    let segment: string | number
    for (let i = 0; i < len; i++) {
      segment = path[i]
      if (typeof segment === 'number') node = node.childNodes[segment]
      else break
    }
    stack.push(
      typeof segment! === 'string'
        ? () =>
            createAttrBinding(
              node as ChildNode,
              segment as string,
              expression,
              chunk
            )
        : () => createNodeBinding(node as ChildNode, expression, chunk)
    )
  }
  stack.forEach((fn) => fn())
  return ((el?: ParentNode) =>
    el ? el.appendChild(chunk.dom) && el : chunk.dom) as ArrowFragment
}

/**
 * Adds a binding for a specific reactive piece of data by replacing the node.
 * @param node - A comment node to replace.
 * @param expression - An expression to bind to the node.
 * @param parentChunk - The parent chunk that contains the node.
 */
function createNodeBinding(
  node: ChildNode,
  expression: ReactiveFunction,
  parentChunk: Chunk
) {
  let fragment: DocumentFragment | Text | Comment
  const expressionValue = expression.e
  if (isTpl(expressionValue) || Array.isArray(expressionValue)) {
    // We are dealing with a template that is not reactive. Render it.
    fragment = createRenderFn()(expressionValue)!
  } else if (typeof expression === 'function' && expression.s !== true) {
    // We are dealing with a reactive expression so perform watch binding.
    const render = createRenderFn()
    fragment = watch(expression, (renderable: ArrowRenderable) =>
      render(renderable)
    )!
  } else {
    fragment = isEmpty(expression.e)
      ? document.createComment('')
      : document.createTextNode(expression.e as string)
    // TODO: we need to add a way to swap between comments and text nodes when
    // expressions are updated.
    expression.$on(() => (fragment.nodeValue = expression.e as string))
  }
  updateChunkRef(parentChunk, node, fragment)
  node.parentNode?.replaceChild(fragment, node)
}

/**
 *
 * @param node -
 * @param expression
 */
function createAttrBinding(
  node: ChildNode,
  attrName: string,
  expression: ReactiveFunction | ArrowRenderable,
  parentChunk: Chunk
) {
  if (!(node instanceof Element)) return

  if (attrName[0] === '@') {
    const event = attrName.substring(1)
    if (!parentChunk.a) parentChunk.a = new AbortController()
    node.addEventListener(event, expression as unknown as EventListener, {
      signal: parentChunk.a.signal,
    })
    node.removeAttribute(attrName)
  } else if (typeof expression === 'function' && !isTpl(expression)) {
    // We are dealing with a reactive expression so perform watch binding.
    watch(expression, (value) => setAttr(node, attrName, value))
  } else {
    setAttr(node, attrName, expression as string | number | boolean | null)
  }
}

/**
 * Sets the value of an attribute on an element.
 * @param node - An html element for whom we need to set an attr.
 * @param attrName - The name of the attribute.
 * @param value - The value of the attribute.
 */
function setAttr(
  node: Element,
  attrName: string,
  value: string | number | boolean | null
) {
  // Logic to determine if this is an IDL attribute or a content attribute
  const isIDL =
    (attrName === 'value' && 'value' in node) ||
    attrName === 'checked' ||
    (attrName.startsWith('.') && (attrName = attrName.substring(1)))
  if (isIDL) {
    // Handle all IDL attributes, TS won’t like this since it is not
    // fully aware of the type we are operating on, but JavaScript is
    // perfectly fine with it, so we need to ignore TS here.
    // @ts-ignore:next-line
    node[attrName as 'value'] = value
    // Explicitly set the "value" to false remove the attribute. However
    // we need to be sure this is not a "Reflected" attribute, so we check
    // the current value of the attribute to make sure it is not the same
    // as the value we just set. If it is the same, it must be reflected.
    // so removing the attribute would remove the idl we just set.
    if (node.getAttribute(attrName) != value) value = false
  }
  // Set a standard content attribute.
  value !== false
    ? node.setAttribute(attrName, value as string)
    : node.removeAttribute(attrName)
}

/**
 * Updates the `ref` array of a parent chunk with a new node.
 * @param parentChunk - A parent chunk to update.
 * @param oldNode - The old node to remove from the parent chunk’s ref array.
 * @param newNode - The new node to add to the parent chunk’s ref array.
 */
function updateChunkRef(
  parentChunk: Chunk,
  oldNode: ChildNode,
  newNode: ChildNode | DocumentFragment
) {
  const commentRefIndex = parentChunk.ref.indexOf(oldNode)
  if (commentRefIndex > -1) {
    const nodes = (
      newNode.nodeType === 11
        ? [...(newNode.childNodes as unknown as Array<ChildNode>)]
        : [newNode]
    ) as ChildNode[]
    parentChunk.ref.splice(commentRefIndex, 1, ...nodes)
  }
}

/**
 *
 * @param parentChunk - The parent chunk that contains the node.
 */
function createRenderFn(): (
  renderable: ArrowRenderable
) => DocumentFragment | Text | Comment | void {
  let previous: Chunk | Text | Comment | Array<Chunk | Text | Comment>
  const keyedChunks: Record<Exclude<ArrowTemplateKey, undefined>, Chunk> = {}
  let updaterFrag: DocumentFragment

  return function render(
    renderable: ArrowRenderable
  ): DocumentFragment | Text | Comment | void {
    if (!previous) {
      /**
       * Initial render:
       */
      if (isTpl(renderable)) {
        // do things
        const fragment = renderable()
        previous = renderable._c()
        return fragment
      } else if (Array.isArray(renderable)) {
        let fragment: DocumentFragment
        ;[fragment, previous] = renderList(renderable)
        return fragment
      } else if (isEmpty(renderable)) {
        return (previous = document.createComment(''))
      } else {
        return (previous = document.createTextNode(renderable as string))
      }
    } else {
      /**
       * Patching:
       */
      if (Array.isArray(renderable)) {
        if (Array.isArray(previous)) {
          // // Rendering a list where previously there was a list.
          let i = 0
          const renderableLength = renderable.length
          const previousLength = previous.length
          let anchor: ChildNode | undefined
          const renderedList: Array<Chunk | Text | Comment> = []
          const previousToRemove = new Set(previous)
          if (renderableLength > previousLength && !updaterFrag) {
            updaterFrag = document.createDocumentFragment()
          }
          // We need to re-render a list, to do this we loop over every item in
          // our *updated* list and patch those items against what previously
          // was at that index - with 3 exceptions:
          //   1. This is a keyed item, in which case we need use the memoized
          //      keyed chunks to find the previous item.
          //   2. This is a new item, in which case we need to create a new one.
          //   3. This is an item that as a memo key, if that memo key matches
          //      the previous item, we perform no operation at all.
          for (; i < renderableLength; i++) {
            let item: string | number | boolean | ArrowTemplate = renderable[
              i
            ] as ArrowTemplate
            const prev: Chunk | Text | Comment | undefined = previous[i]
            let key: ArrowTemplateKey
            if (
              isTpl(item) &&
              (key = item._k) !== undefined &&
              key in keyedChunks
            ) {
              // This is a keyed item, so update the expressions and then
              // used the keyed chunk instead.
              keyedChunks[key]._t._u(item._e())
              item = keyedChunks[key]._t
            }
            if (i > previousLength - 1) {
              updaterFrag.appendChild(isTpl(item) ? item() : item)
              renderedList[i] = isTpl(item) ? item._c() : item
              continue
            }
            const used = patch(item, prev, anchor) as Chunk | Text | Comment
            anchor = getLastNode(used)
            renderedList[i] = used
            previousToRemove.delete(used)
          }
          if (!renderableLength) {
            getLastNode(previous[0]).after(
              (renderedList[0] = document.createComment(''))
            )
          } else if (renderableLength > previousLength) {
            anchor?.after(updaterFrag)
          }
          unmount(previousToRemove)
          previous = renderedList
        } else {
          // Rendering a list where previously there was not a list.
          const [fragment, newList] = renderList(renderable)
          getLastNode(previous).after(fragment)
          unmount(previous)
          previous = newList
        }
      } else {
        previous = patch(renderable, previous)
      }
    }
  }

  /**
   * A utility function that renders an array of items for the first time.
   * @param renderable - A renderable that is an array of items.
   * @returns
   */
  function renderList(
    renderable: Array<string | number | boolean | ArrowTemplate>
  ): [DocumentFragment, Array<Chunk | Text | Comment>] {
    const fragment = document.createDocumentFragment()
    if (renderable.length === 0) {
      const placeholder = document.createComment('')
      fragment.appendChild(placeholder)
      return [fragment, [placeholder]]
    }
    const renderedItems = renderable.map((item): Chunk | Comment | Text => {
      if (isTpl(item)) {
        fragment.appendChild(item())
        const chunk = item._c()
        if (chunk.k !== undefined) {
          keyedChunks[chunk.k] = chunk
        }
        return chunk
      }
      const text = (
        isEmpty(item)
          ? document.createComment('')
          : document.createTextNode(item as string)
      ) as Text | Comment
      return fragment.appendChild(text)
    })
    return [fragment, renderedItems]
  }

  /**
   * Updates, replaces, or initially renders a node or chunk.
   * @param renderable - The new renderable value.
   * @param prev - The previous node or chunk in this position.
   * @returns
   */
  function patch(
    renderable: Exclude<
      ArrowRenderable,
      Array<string | number | ArrowTemplate>
    >,
    prev: Chunk | Text | Comment | Array<Chunk | Text | Comment>,
    anchor?: ChildNode
  ): Chunk | Text | Comment | Array<Chunk | Text | Comment> {
    // This is an update:
    if (!isEmpty(renderable) && prev instanceof Text) {
      // The prev value was a text node and the new value is not empty
      // so we can just update the text node.
      if (prev.data != renderable) prev.data = renderable as string
      return prev
    } else if (isTpl(renderable)) {
      if (renderable._m && isChunk(prev) && renderable._m === prev.m) {
        return prev
      }

      const chunk = renderable._c()
      if (chunk.k !== undefined && chunk.k in keyedChunks) {
        if (chunk === prev) return prev
        getLastNode(prev, anchor).after(...chunk.ref)
        return chunk
      } else if (isChunk(prev) && prev.$ === chunk.$) {
        // This is a template that has already been rendered, so we only need to
        // update the expressions
        prev._t._u(chunk._t._e())
        chunk.m && prev._t.memo(chunk.m)
        return prev
      }

      // This is a new template, render it
      getLastNode(prev, anchor).after(renderable())
      unmount(prev)
      // If this chunk had a key, set it in our keyed chunks.
      if (chunk.k !== undefined) keyedChunks[chunk.k] = chunk
      return chunk
    } else if (isEmpty(renderable) && !(prev instanceof Comment)) {
      // This is an empty value and the prev value was not a comment
      // so we need to remove the prev value and replace it with a comment.
      const comment = document.createComment('')
      getLastNode(prev, anchor).after(comment)
      unmount(prev)
      return comment
    } else if (!isEmpty(renderable) && prev instanceof Comment) {
      // This is a non-empty value and the prev value was a comment
      // so we need to remove the prev value and replace it with a text node.
      const text = document.createTextNode(renderable as string)
      prev.after(text)
      unmount(prev)
      return text
    }
    return prev!
  }
}

let unmountStack: Array<
  | Chunk
  | Text
  | ChildNode
  | Array<Chunk | Text | ChildNode>
  | Set<Chunk | Text | ChildNode>
> = []

const queueUnmount = queue(() => {
  const removeItems = (
    chunk:
      | Chunk
      | Text
      | ChildNode
      | Array<Chunk | Text | ChildNode>
      | Set<Chunk | Text | ChildNode>
  ) => {
    if (isChunk(chunk)) {
      removeItems(chunk.ref)
      if (chunk.a) chunk.a.abort()
    } else if (Array.isArray(chunk) || chunk instanceof Set) {
      chunk.forEach(removeItems)
    } else {
      chunk.remove()
    }
    return false
  }
  unmountStack = unmountStack.filter((chunk) => removeItems(chunk))
})

/**
 * Unmounts a chunk from the DOM or a Text node from the DOM
 */
function unmount(
  chunk:
    | Chunk
    | Text
    | ChildNode
    | Array<Chunk | Text | ChildNode>
    | Set<Chunk | Text | ChildNode>
    | undefined
) {
  if (!chunk) return
  unmountStack.push(chunk)
  queueUnmount()
}

/**
 * Determines if a value is considered empty in the context of rendering a
 * Text node vs a comment placeholder.
 * @param value - Any value that can be considered empty.
 * @returns
 */
function isEmpty(value: unknown): value is null | undefined | '' | false {
  return !value && value !== 0
}

/**
 * Determines what the last node from the last render is so we can append items
 * after it.
 * @param chunk - The previous chunk or Text node that was rendered.
 * @returns
 */
function getLastNode(
  chunk: Chunk | Text | Comment | Array<Chunk | Text | Comment> | undefined,
  anchor?: ChildNode
): ChildNode {
  if (!chunk && anchor) return anchor
  if (isChunk(chunk)) {
    return chunk.ref[chunk.ref.length - 1]
  } else if (Array.isArray(chunk)) {
    return getLastNode(chunk[chunk.length - 1])
  }
  return chunk!
}

function isChunk(chunk: unknown): chunk is Chunk {
  return typeof chunk === 'object' && chunk !== null && '$' in chunk
}

/**
 * Given a string of raw interlaced HTML (the arrow comments are already in the
 * approximately correct place), produce a Chunk object and memoize it.
 * @param html - A raw string of HTML
 * @returns
 */
export function createChunk(rawStrings: string[]): Omit<Chunk, '_t'> {
  const memoKey = rawStrings.join(delimiterComment)
  const chunk: Omit<Chunk, '_t' | 'ref'> =
    chunkMemo[memoKey] ??
    (() => {
      const tpl = document.createElement('template')
      tpl.innerHTML = createHTML(rawStrings)
      tpl.content.normalize()
      return (chunkMemo[memoKey] = {
        dom: tpl.content,
        paths: createPaths(tpl.content),
        $: Symbol(),
      })
    })()
  const dom = chunk.dom.cloneNode(true) as DocumentFragment
  return {
    ...chunk,
    dom,
    ref: [...(dom.childNodes as unknown as Array<ChildNode>)],
  }
}

/**
 * Given a document fragment with expressions comments, produce an array of
 * paths to the expressions and attribute expressions, and remove any attribute
 * expression comments as well.
 * @param dom - A DocumentFragment to locate expressions in.
 * @returns
 */
export function createPaths(dom: DocumentFragment): Chunk['paths'] {
  const paths: Chunk['paths'] = []
  const nodes = document.createTreeWalker(dom, 128, (node) =>
    node.nodeValue === delimiter || node.nodeValue === attrDelimiter ? 1 : 0
  )
  let node: ChildNode | null
  let toRemove: ChildNode | null = null
  while ((node = nodes.nextNode() as ChildNode)) {
    // Remove the primary node from the previous iteration
    toRemove?.remove()
    toRemove = null
    if (node.nodeValue === attrDelimiter) {
      let nextSibling: Node | null = (toRemove = node)
      let attrCount = 0
      const parent = node.parentNode
      do {
        attrCount++
        if (nextSibling !== node) parent?.removeChild(nextSibling)
      } while (
        (nextSibling = node.nextSibling) &&
        nextSibling.nodeValue === attrDelimiter
      )
      const attrOwnerNode =
        parent?.firstChild === node ? node.parentElement : node.previousSibling
      const attrs: string[] = getAttrs(attrOwnerNode!, attrCount)
      const path = getPath(attrOwnerNode)
      paths.push(...attrs.map((attr) => [...path, attr]))
    } else {
      paths.push(getPath(node))
    }
  }
  if (toRemove) toRemove.remove()
  return paths
}

/**
 * Get a list of attributes on the DOM node that should have reactive values.
 * @param node - A DOM node (within a fragment)
 * @param attrCount - The total number of attributes to return
 * @returns
 */
function getAttrs(node: Node, attrCount: number) {
  if (!(node instanceof HTMLElement)) return []
  const attrs: string[] = []
  let attr: Attr | null
  let i = 0
  while ((attr = node.attributes[i++])) {
    if (attr.value === attrDelimiter) attrs.push(attr.name)
    if (attrs.length === attrCount) break
  }
  return attrs
}

/**
 * Returns a path to a DOM node.
 * @param node - A DOM node (within a fragment) to return a path for
 * @returns
 */
export function getPath(node: Node | null): number[] {
  if (!node) return []
  const path: number[] = []
  let attrComments = 0
  while (node.parentNode) {
    const children = node.parentNode.childNodes as NodeList
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.nodeType === 8 && child.nodeValue === attrDelimiter) {
        attrComments++
      } else if (child === node) {
        path.unshift(i - attrComments)
        break
      }
    }
    attrComments = 0
    node = node.parentNode
  }
  return path
}

/**
 * Given a raw string of HTML (with arrow comments), prepare it for conversion
 * into to a DOM fragment. We do this by locating the arrow comments and
 * @param html - A raw string of HTML
 */
export function createHTML(strings: string[]): string {
  const len = strings.length
  if (len === 1) return strings[0]
  let html = ''
  for (let i = 0; i < len; i++) {
    const left = strings[i]
    const l = strings[i].length
    const right: string | null = strings[i + 1] ?? null
    const hasRight = right !== null

    /**
     * Attempt to determine if this *could* be an attribute expression. This
     * check is not perfect, but it's good enough to avoid a lot of false
     * positives before further attribute checking is required. Several
     * benchmarks have been run to determine the performance impact and this
     * test is the fastest (inline regex, capturing, with concat array access).
     */
    if (
      hasRight &&
      /^((=('|"))|[a-zA-Z0-9]=)$/.test(`${left[l - 2]}${left[l - 1]}`)
    ) {
      const sliceLine = i + 1
      // This slot may be an attribute expression, we need to check further
      const [rightDelta, pos] = attrCommentPos(
        strings.slice(0, sliceLine),
        strings.slice(sliceLine)
      )
      if (pos !== null) {
        // Now we know this is an attribute expression, and we know where the
        // the comment node should be inserted (after tag ends), so we insert
        // it on the right hand side at that location.
        const rightStr = strings[sliceLine + rightDelta]
        strings[sliceLine + rightDelta] = `${rightStr.substring(
          0,
          pos
        )}${attrComment}${rightStr.substring(pos)}`
        html += `${left}${attrDelimiter}`
        continue
      }
    }
    html += `${left}${hasRight ? delimiterComment : ''}`
  }
  return html
}

/**
 * Given two strings that have an expression between them, determine if that
 * expression is an attribute expression. If so, return the position of the
 * comment node that should be inserted on the right hand side.
 * @param left - The left hand side of a html string where an exp. is.
 * @param right -  The left hand side of a html string where an exp. is.
 */
export function attrCommentPos(
  left: string[],
  right: string[]
):
  | [rightStackIndex: number, rightPos: number]
  | [rightStackIndex: null, rightPos: null] {
  let rightPos: number | null = null
  let rightStackIndex: number | null = null
  const locate = (
    direction: 1 | -1,
    stack: string[],
    target: string,
    breakOn: string
  ): boolean => {
    let depth = 0
    const firstStack = direction === -1 ? stack.length - 1 : 0
    let stackPos = firstStack
    let currentString = stack[stackPos]
    let currentStringLength = currentString.length
    let pos = direction > 0 ? 0 : currentStringLength - 1
    let char = ''
    let quoteChar: string | null = null

    // Checks if the current character is a quote — it only counts as a quote
    // if the depth is 0 (it is not inside a quote already). If it is inside a
    // quotation, then only the matching quotation can be used to close it.
    const isQuote = (char: string) =>
      (quoteChar ? quoteChar === char : /['"]/.test(char)) &&
      currentString[pos - 1] !== '\\'

    while ((char = currentString.charAt(pos))) {
      if (
        stackPos === firstStack &&
        pos === (direction > 0 ? 0 : currentStringLength - 1) &&
        isQuote(char)
      ) {
        // skip
      } else if (isQuote(char)) {
        depth = depth === 0 ? 1 : 0
        quoteChar = depth ? char : null
      } else if (!depth && char === target) {
        if (direction > 0) {
          rightPos = pos + 1
          rightStackIndex = stackPos
        }
        return true
      } else if (!depth && char === breakOn) {
        return false
      }
      if ((pos += direction) === (direction > 0 ? currentStringLength : -1)) {
        // We've run out of characters in the current string, move to the next
        // string in the stack.
        currentString = stack[(stackPos += direction)] ?? ''
        currentStringLength = currentString ? currentString.length : 0
        pos = direction > 0 ? 0 : currentStringLength - 1
      }
    }
    return false
  }
  return locate(1, right, '>', '<') && locate(-1, left, '<', '>')
    ? [rightStackIndex, rightPos]
    : [null, null]
}
