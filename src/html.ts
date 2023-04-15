import { watch } from './reactive'
import { isChunk, isTpl, isType } from './common'
import { createQueueable, queue } from './scheduler'
import {
  expressionPool,
  onExpressionUpdate,
  storeExpressions,
  updateExpressions,
} from './expressions'
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
   * A globally unique identifier for this template. If an explicit id is
   * provided, the template will be stored under that id during memoization and
   * the subsequent uses of `html` will use that lookup rather than the HTML
   * itself.
   * @param id - Globally unique identifier.
   * @returns
   */
  id: (id: string) => ArrowTemplate
  /**
   * Yields the underlying chunk object that is used to render this template.
   * @returns
   * @internal
   */
  _c: () => Chunk
  /**
   * Yield the reactive expressions that are contained within this template.
   * Does not contain the expressions that are are not "reactive".
   * @returns
   * @internal
   */
  _e: number
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
export type ArrowRenderable =
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
  // (ev: Event, listener: EventListenerOrEventListenerObject): void
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
 * An internal primitive that is used to e a dom elements.
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
export interface Chunk {
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
  ref: DOMRef
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
   * A memoization key, used for rendering lists.
   */
  m?: ArrowTemplateKey
  /**
   * An abort controller to terminate all event listeners in this chunk.
   */
  a?: AbortController | null
}

/**
 * A partial chunk is a chunk that has been partially mounted. It is missing
 * some assignments, but already has their space reserved (mem performance).
 */
type PartialChunk = Omit<Chunk, '_t' | 'k' | 'a' | 'm' | 'ref'> & {
  _t: () => null
  k: null
  a: null
  m: null
  ref: null
}

/**
 * A reference to the DOM elements mounted by a chunk.
 */
interface DOMRef {
  (): Generator<ChildNode, void, unknown>
  last: () => ChildNode
  replace: (oldNode: ChildNode, ...newNodes: ChildNode[]) => void
}

/**
 * A mutable stack of bindings used to create reactive expressions. We
 * initialize this with a large array to avoid memory allocation costs during
 * node creation, and then perform occasional clean up work.
 */
let bindingStackPos = -1
const bindingStack: Array<Node | string | number> = new Array(2000).fill({})

/**
 * The delimiter that describes where expressions are located.
 */
const delimiter = '➳❍'
const delimiterComment = `<!--${delimiter}-->`

/**
 * A memo of pathed chunks that have been created.
 */
const chunkMemo: Record<string, PartialChunk> = {}

/**
 * A memo of root DOM elements that have been created by all chunks.
 */
const domMemo: ChildNode[] = []
/**
 * An array of chunk locations in the domMemo.
 */
const chunkLocations: number[] = []

function createDOMRef(dom: DocumentFragment): DOMRef {
  const start = domMemo.length
  const length = dom.childNodes.length
  domMemo.push(...dom.childNodes)
  const iA = chunkLocations.length
  chunkLocations.push(start, start + length - 1)
  const ref = function* ref() {
    for (let i = chunkLocations[iA]; i <= chunkLocations[iA + 1]; i++) {
      yield domMemo[i]
    }
  }
  ref.last = () => domMemo[chunkLocations[iA + 1]]
  ref.replace = (oldNode: ChildNode, ...newNodes: ChildNode[]) => {
    let index = -1
    for (let i = chunkLocations[iA]; i <= chunkLocations[iA + 1]; i++) {
      if (domMemo[i] === oldNode) {
        index = i
        break
      }
    }
    if (index !== -1) {
      domMemo.splice(index, 1, ...newNodes)
      if (newNodes.length > 1) {
        chunkLocations.forEach((_, i) => {
          if (i > iA) {
            chunkLocations[i] += newNodes.length - 1
          }
        })
      }
    }
  }
  return ref
}

/**
 * The template tagging function, used like: html`<div></div>`(mountEl)
 * @param  {TemplateStringsArray} strings
 * @param  {any[]} ...expressions
 * @returns ArrowTemplate
 */
export function html(id: string, ...expSlots: ArrowExpression[]): ArrowTemplate
export function html(
  strings: TemplateStringsArray | string[],
  ...expSlots: ArrowExpression[]
): ArrowTemplate
export function html(
  strings: TemplateStringsArray | string[] | string,
  ...expSlots: ArrowExpression[]
): ArrowTemplate {
  let chunk: Chunk
  let memoId: string | null = null
  const expressionPointer = storeExpressions(expSlots)
  if (!Array.isArray(strings)) {
    memoId = strings as string
    strings = []
  }

  function getChunk() {
    if (!chunk) {
      chunk = createChunk(strings as string[], memoId) as unknown as Chunk
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
      return createBindings(getChunk(), expressionPointer)(el)
    } else {
      const chunk = getChunk()
      chunk.dom.append(...chunk.ref())
      return el ? el.appendChild(chunk.dom) : chunk.dom
    }
  }) as ArrowTemplate

  // If the template contains no expressions, it is 100% static so it's key
  // its own content
  template.isT = true
  template._e = expressionPointer
  template._c = getChunk
  template.key = (key: ArrowTemplateKey): ArrowTemplate => {
    template._k = key
    return template
  }
  template.memo = (key: ArrowTemplateKey): ArrowTemplate => {
    template._m = key
    chunk && (chunk.m = key)
    return template
  }
  template.id = (id: string): ArrowTemplate => {
    memoId = id
    return template
  }
  return template
}

/**
 * Applies bindings to a pathed chunk and returns the resulting document
 * fragment that is ready to mount.
 * @param chunk - A chunk of HTML with paths to the expressions.
 * @param expressions - An expression list with cursor.
 */
function createBindings(
  chunk: Chunk,
  expressionPointer: number
): ArrowFragment {
  const totalPaths = expressionPool[expressionPointer] as number
  const stackStart = bindingStackPos + 1
  for (let i = 0; i < totalPaths; i++) {
    const path = chunk.paths[i]
    const len = path.length
    let node: Node = chunk.dom
    for (let i = 0; i < len; i++) {
      const segment = path[i]
      if (typeof segment === 'number')
        node = node.childNodes.item(segment as number)
      if (i === len - 1) {
        bindingStack[++bindingStackPos] = node
        bindingStack[++bindingStackPos] = segment
      }
    }
  }
  const stackEnd = bindingStackPos
  for (let s = stackStart, e = expressionPointer + 1; s < stackEnd; s++, e++) {
    const node = bindingStack[s]
    const segment = bindingStack[++s]
    if (typeof segment === 'string') {
      createAttrBinding(node as ChildNode, segment as string, e, chunk)
    } else {
      createNodeBinding(node as ChildNode, e, chunk)
    }
  }
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
  expressionPointer: number,
  parentChunk: Chunk
) {
  let fragment: DocumentFragment | Text | Comment
  const expression = expressionPool[expressionPointer]
  if (isTpl(expression) || Array.isArray(expression)) {
    // We are dealing with a template that is not reactive. Render it.
    fragment = createRenderFn()(expression)!
  } else if (typeof expression === 'function') {
    // We are dealing with a reactive expression so perform watch binding.
    const render = createRenderFn()
    const [frag] = watch(expressionPointer, (renderable) => render(renderable))
    fragment = frag!
  } else {
    fragment = isEmpty(expression)
      ? document.createComment('')
      : document.createTextNode(expression as string)
    // TODO: we need to add a way to swap between comments and text nodes when
    // expressions are updated.
    onExpressionUpdate(
      expressionPointer,
      (value: string) => (fragment.nodeValue = value)
    )
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
  expressionPointer: number,
  parentChunk: Chunk
) {
  if (!isType(node, 1)) return
  const expression = expressionPool[expressionPointer]
  if (attrName[0] === '@') {
    const event = attrName.substring(1)
    if (!parentChunk.a) parentChunk.a = new AbortController()
    node.addEventListener(
      event,
      (...args) =>
        (expressionPool[expressionPointer] as CallableFunction)?.(
          ...args
        ) as unknown as EventListener,
      {
        signal: parentChunk.a.signal,
      }
    )
    node.removeAttribute(attrName)
  } else if (typeof expression === 'function' && !isTpl(expression)) {
    // We are dealing with a reactive expression so perform watch binding.
    watch(expressionPointer, (value) =>
      setAttr(node, attrName, value as string)
    )
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
  if (isType(newNode, 11)) {
    parentChunk.ref.replace(oldNode, ...newNode.childNodes)
  } else {
    parentChunk.ref.replace(oldNode, newNode as ChildNode)
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
        if (!Array.isArray(previous)) {
          // Rendering a list where previously there was not a list.
          const [fragment, newList] = renderList(renderable)
          getLastNode(previous).after(fragment)
          unmount(previous)
          previous = newList
        } else {
          // Patching a list.
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
              updateExpressions(item._e, keyedChunks[key]._t._e)
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
    const renderedItems: Array<Chunk | Comment | Text> = []
    for (let i = 0; i < renderable.length; i++) {
      const item = renderable[i]
      if (isTpl(item)) {
        fragment.appendChild(item())
        const chunk = item._c()
        if (chunk.k !== undefined) {
          keyedChunks[chunk.k] = chunk
        }
        renderedItems[i] = chunk
      } else {
        fragment.appendChild(
          (isEmpty(item)
            ? document.createComment('')
            : document.createTextNode(item as string)) as Text | Comment
        )
      }
    }
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
    const nodeType = (prev as Node).nodeType ?? 0
    if (!isEmpty(renderable) && nodeType === 3) {
      // The prev value was a text node and the new value is not empty
      // so we can just update the text node.
      if ((prev as Text).data != renderable)
        (prev as Text).data = renderable as string
      return prev
    } else if (isTpl(renderable)) {
      if (renderable._m && isChunk(prev) && renderable._m === prev.m) {
        return prev
      }

      const chunk = renderable._c()
      if (chunk.k !== undefined && chunk.k in keyedChunks) {
        if (chunk === prev) return prev
        getLastNode(prev, anchor).after(...chunk.ref())
        return chunk
      } else if (isChunk(prev) && prev.$ === chunk.$) {
        // This is a template that has already been rendered, so we only need to
        // update the expressions
        updateExpressions(chunk._t._e, prev._t._e)
        chunk.m && prev._t.memo(chunk.m)
        return prev
      }

      // This is a new template, render it
      getLastNode(prev, anchor).after(renderable())
      unmount(prev)
      // If this chunk had a key, set it in our keyed chunks.
      if (chunk.k !== undefined) keyedChunks[chunk.k] = chunk
      return chunk
    } else if (isEmpty(renderable) && nodeType !== 8) {
      // This is an empty value and the prev value was not a comment
      // so we need to remove the prev value and replace it with a comment.
      const comment = document.createComment('')
      getLastNode(prev, anchor).after(comment)
      unmount(prev)
      return comment
    } else if (!isEmpty(renderable) && nodeType === 8) {
      // This is a non-empty value and the prev value was a comment
      // so we need to remove the prev value and replace it with a text node.
      const text = document.createTextNode(renderable as string)
      ;(prev as Comment).after(text)
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

function removeItems(
  stackItem:
    | Chunk
    | Text
    | ChildNode
    | Array<Chunk | Text | ChildNode>
    | Set<Chunk | Text | ChildNode>
): void {
  if (isChunk(stackItem)) {
    for (const node of stackItem.ref()) node.remove()
    if (stackItem.a) stackItem.a.abort()
  } else if (Array.isArray(stackItem) || stackItem instanceof Set) {
    stackItem.forEach(removeItems)
  } else {
    stackItem.remove()
  }
}

/**
 * A queue that is used to batch up unmounts.
 */
const queuePointer = createQueueable(() => {
  unmountStack.filter((stackItem) => removeItems(stackItem))
  unmountStack = []
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
  queue(queuePointer)
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
    return chunk.ref.last()
  } else if (Array.isArray(chunk)) {
    return getLastNode(chunk[chunk.length - 1])
  }
  return chunk!
}

/**
 * Creates a new Chunk object and memoizes it.
 * @param rawStrings - Initialize the chunk and memoize it.
 * @param memoKey - The key to memoize the chunk under.
 * @returns
 */
function initChunk(html: string, id?: string | null): PartialChunk {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  tpl.content.normalize()
  return (chunkMemo[id ?? html] = {
    dom: tpl.content,
    paths: createPaths(tpl.content),
    $: Symbol(),
    _t: () => null,
    k: null,
    a: null,
    m: null,
    ref: null,
  })
}

/**
 * Given a string of raw interlaced HTML (the arrow comments are already in the
 * approximately correct place), produce a Chunk object and memoize it.
 * @param html - A raw string of HTML
 * @returns
 */
export function createChunk(
  rawStrings: TemplateStringsArray | string[],
  id?: string | null
): Omit<PartialChunk, 'ref'> & { ref: DOMRef } {
  const memoKey = id ?? rawStrings.join(delimiterComment)
  const chunk: PartialChunk =
    chunkMemo[memoKey] ??
    initChunk(id ? rawStrings.join(delimiterComment) : memoKey, id)
  const dom = chunk.dom.cloneNode(true) as DocumentFragment
  const ref = createDOMRef(dom)
  return {
    ...chunk,
    dom,
    ref,
  }
}

/**
 * A list of attributes that can be located in the DOM that have expressions.
 * The list is populated by the expression index followed by the attribute name:
 * ```js
 * [1, 'data-foo', 1, '@click', 7, 'class']
 * ```
 */
const attrList: Array<string> = []

/**
 * Determines if the given node should be accepted or rejected by the tree
 * walker. If the node is an element and contains delimiters, it will also
 * populate the attrList array with the attribute names and expression counts.
 * This side effect avoids having to walk each node again.
 * @param el - The element to accept or reject.
 * @returns
 */
function filterNode(el: Node): 1 | 2 {
  if (el.nodeType === 8) return 1
  if (el.nodeType === 1) {
    const attrLen = (el as Element).attributes.length
    if (attrList.length) attrList.length = 0
    for (let i = 0; i < attrLen; i++) {
      const attr = (el as Element).attributes[i]
      if (attr.value === delimiterComment) attrList.push(attr.name)
    }
  }
  return attrList.length ? 1 : 2
}

/**
 * Given an expression index and a path, return an array of attribute paths.
 * @param exp - The expression index
 * @param path - The path to the expression
 * @returns
 */
function attrsForNode(path: number[]): Array<number | string>[] {
  const attrs: Array<number | string>[] = []
  for (let i = 0; i < attrList.length; i++) {
    attrs.push([...path, attrList[i]])
  }
  return attrs
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
  const nodes = document.createNodeIterator(dom, 1 | 128, filterNode)
  let node: Node | null
  while ((node = nodes.nextNode())) {
    const path = getPath(node)
    if (node.nodeType === 1) {
      paths.push(...attrsForNode(path))
    } else {
      paths.push(path)
    }
  }
  return paths
}

/**
 * Returns a path to a DOM node.
 * @param node - A DOM node (within a fragment) to return a path for
 * @returns
 */
export function getPath(node: Node): number[] {
  const path: number[] = []
  while (node.parentNode) {
    const children = node.parentNode.childNodes as NodeList
    const len = children.length
    for (let i = 0; i < len; i++) {
      const child = children[i]
      if (child === node) {
        path.unshift(i)
        break
      }
    }
    node = node.parentNode
  }
  return path
}
