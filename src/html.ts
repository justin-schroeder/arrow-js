import { ArrowExpression } from './html'
import { w } from './reactive'
import { isTpl, measure } from './common'
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
  key: (key: ArrowTemplateKey) => void
  /**
   * Returns internal properties of the template, specifically the HTML and
   * expressions, as well as the key if applicable.
   * @returns
   */
  // _h: () => [
  //   chunk: Chunk,
  //   expressions: Array<ReactiveFunction | ArrowRenderable>,
  //   key: ArrowTemplateKey
  // ]
  _c: () => Chunk
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
  _up: (newExpression: ArrowFunction) => void
  e: CallableFunction
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
  e: Array<ReactiveFunction | ArrowRenderable>
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
 * A function that can be used as an arrow expression — always returns a
 * renderable.
 */
export type ArrowFunction = (...args: unknown[]) => ArrowRenderable

/**
 * The possible value of an arrow expression.
 */
export type ArrowExpression = ArrowRenderable | ArrowFunction

/**
 * Event listeners that were bound by arrow and should be cleaned up should the
 * given node be garbage collected.
 */
const listeners = new WeakMap<
  ChildNode,
  Map<string, EventListenerOrEventListenerObject>
>()

/**
 * A list of HTML templates to a HTMLTemplate element that contains instances
 * of each. This acts as a cache.
 */
const templateMemo: { [key: string]: HTMLTemplateElement } = {}

/**
 * An controller that is responsible for assembling the template HTML and
 * performing updates to the pertinent DOM nodes contained within it.
 */
export interface TemplatePartial {
  (): DocumentFragment | Text
  /**
   * Adds a template or string to the partials chunks.
   * @param tpl - A template or string to render.
   * @returns
   */
  add: (tpl: ArrowTemplate | number | string) => TemplatePartial
  /**
   * Update the partial.
   */
  _up: () => void
  /**
   * Length — the number of html elements.
   */
  l: number
  /**
   * Returns partial chunks of a render group.
   * @returns
   */
  ch: () => PartialChunk[]
}

/**
 * A chunk of HTML that is rendered by a template partial. It contains all the
 * required expressions that are required for the given dom nodes (if needed).
 */
type PartialChunk = {
  html: string
  exp: ReactiveFunction[]
  dom: Array<ChildNode | Text>
  tpl: ArrowTemplate | string
  key: ArrowTemplateKey
}

/**
 * A chunk of HTML with paths to the expressions that are contained within it.
 */
interface Chunk {
  readonly paths: Array<string | number>[]
  readonly $: symbol
  dom: DocumentFragment
  k?: ArrowTemplateKey
}

/**
 * The delimiter that describes where expressions are located.
 */
const delimiter = '➳❍'
const attrDelimiter = '❲❍❳'
const bookend = '❍⇚'
const delimiterComment = `<!--${delimiter}-->`
const attrComment = `<!--${attrDelimiter}-->`
const bookendComment = `<!--${bookend}-->`

/**
 * A memo of pathed chunks that have been created.
 */
const chunkMemo: Record<string, Chunk> = {}

/**
 * The template tagging function, used like: html`<div></div>`(mountEl)
 * @param  {TemplateStringsArray} strings
 * @param  {any[]} ...expressions
 * @returns ArrowTemplate
 */
export function t(
  strings: TemplateStringsArray,
  ...expSlots: ArrowExpression[]
): ArrowTemplate {
  let expressions: Array<ReactiveFunction | ArrowRenderable> | null = null
  let chunk: Chunk

  function getExpressions(exprs: ArrowExpression[]) {
    if (!expressions) {
      expressions = exprs.map((expr) => {
        return typeof expr === 'function' && !isTpl(expr)
          ? createExpression(expr)
          : expr
      })
    }
    return expressions
  }
  function getChunk() {
    return chunk ?? (chunk = createChunk([...strings]))
  }
  const template = ((el?: ParentNode) => {
    return createBindings(getChunk(), { i: 0, e: getExpressions(expSlots) })(el)
  }) as ArrowTemplate

  // If the template contains no expressions, it is 100% static so it's key
  // its own content
  template.isT = true
  template._c = getChunk
  // template._h = () => [getChunk(), getExpressions(expSlots), template._k]
  template.key = (key: ArrowTemplateKey): ArrowTemplate => {
    getChunk().k = key
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
  literalExpression: ArrowFunction
): ReactiveFunction {
  let observer: ArrowFunction | null
  const expression = (...args: unknown[]): ArrowRenderable =>
    expression.e(...args)
  expression.e = literalExpression
  expression.$on = (obs: ArrowFunction | null) => (observer = obs)
  expression._up = (exp: ArrowFunction) => ((expression.e = exp), observer?.())
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
    if (typeof segment! === 'string') {
      // Dealing with a dynamic attribute
      createAttrBinding(node, segment, expression)
    } else {
      createNodeBinding(node, expression, chunk)
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
  node: Node,
  expression: ReactiveFunction | ArrowRenderable,
  parentChunk: Chunk
) {
  let fragment: DocumentFragment | Text
  if (isTpl(expression) || Array.isArray(expression)) {
    // We are dealing with a template that is not reactive. Render it.
    fragment = createRenderFn(parentChunk)(expression)
  } else if (typeof expression === 'function') {
    // We are dealing with a reactive expression so perform watch binding.
    const render = createRenderFn(parentChunk)
    fragment = w(expression, (renderable: ArrowRenderable) =>
      render(renderable)
    )
  } else {
    fragment = document.createTextNode(expression as string)
  }
  node.parentNode?.replaceChild(fragment, node)
}

/**
 *
 * @param node -
 * @param expression
 */
function createAttrBinding(
  node: Node,
  attrName: string,
  expression: ReactiveFunction | ArrowRenderable
) {
  if (!(node instanceof Element)) return

  if (attrName[0] === '@') {
    const event = attrName.substring(1)
    node.addEventListener(event, expression as unknown as EventListener)
    if (!listeners.has(node)) listeners.set(node, new Map())
    listeners.get(node)?.set(event, expression as unknown as EventListener)
    node.removeAttribute(attrName)
  } else if (typeof expression === 'function' && !isTpl(expression)) {
    // We are dealing with a reactive expression so perform watch binding.
    w(expression, (value) => setAttr(node, attrName, value))
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
 *
 * @param parentChunk - The parent chunk that contains the node.
 */
function createRenderFn(
  parentChunk: Chunk
): (renderable: ArrowRenderable) => DocumentFragment | Text {
  let previous: Chunk | Text | Array<Chunk | Text> | null = null

  return function render(renderable: ArrowRenderable): DocumentFragment | Text {
    if (!previous) {
      if (isTpl(renderable)) {
        // do things
        const fragment = renderable()
        previous = renderable._c()
        return fragment
      } else if (Array.isArray(renderable)) {
        const fragment = document.createDocumentFragment()
        previous = renderable.map((item) => {
          if (isTpl(item)) {
            fragment.appendChild(item())
            return item._c()
          }
          const text = document.createTextNode(item as string)
          return fragment.appendChild(text)
        })
        return fragment
      } else {
        return (previous = document.createTextNode(renderable as string))
      }
    }
  }
}

// /**
//  * @param  {NodeList} dom
//  * @param  {ReactiveExpressions} tokens
//  * @param  {ReactiveProxy} data?
//  */
// function fragment(
//   dom: DocumentFragment | Node,
//   expressions: ReactiveExpressions
// ): ArrowFragment {
//   let node: Node | undefined | null
//   let i = 0
//   const children = dom.childNodes
//   while ((node = children.item(i++))) {
//     // Delimiters in the body are found inside comments.
//     if (node.nodeType === 8 && node.nodeValue === delimiter) {
//       // We are dealing with a reactive node.
//       comment(node, expressions)
//       continue
//     }
//     // Bind attributes, add events, and push onto the fragment.
//     if (node instanceof Element) attrs(node, expressions)
//     if (node.hasChildNodes()) {
//       fragment(node, expressions)
//     }
//     // Select lists "default" selections get out of wack when being moved around
//     // inside fragments, this resets them.
//     if (node instanceof HTMLOptionElement) node.selected = node.defaultSelected
//   }
//   return ((parent?: ParentNode): ParentNode => {
//     if (parent) {
//       parent.appendChild(dom)
//       return parent
//     }
//     return dom
//   }) as ArrowFragment
// }

// /**
//  * Given a node, parse for meaningful expressions.
//  * @param  {Element} node
//  * @returns void
//  */
// function attrs(node: Element, expressions: ReactiveExpressions): void {
//   const toRemove: string[] = []
//   let i = 0
//   let attr: Attr
//   while ((attr = node.attributes[i++])) {
//     if (expressions.i >= expressions.e.length) return
//     if (attr.value !== delimiterComment) continue
//     let attrName = attr.name
//     const expression = expressions.e[expressions.i++]
//     if (attrName.charAt(0) === '@') {
//       const event = attrName.substring(1)
//       node.addEventListener(event, expression as unknown as EventListener)
//       if (!listeners.has(node)) listeners.set(node, new Map())
//       listeners.get(node)?.set(event, expression as unknown as EventListener)
//       toRemove.push(attrName)
//     } else {
//       // Logic to determine if this is an IDL attribute or a content attribute
//       const isIDL =
//         (attrName === 'value' && 'value' in node) ||
//         attrName === 'checked' ||
//         (attrName.startsWith('.') && (attrName = attrName.substring(1)))
//       w(expression as ReactiveFunction, (value: any) => {
//         if (isIDL) {
//           // Handle all IDL attributes, TS won’t like this since it is not
//           // fully aware of the type we are operating on, but JavaScript is
//           // perfectly fine with it, so we need to ignore TS here.
//           // @ts-ignore:next-line
//           node[attrName as 'value'] = value
//           // Explicitly set the "value" to false remove the attribute. However
//           // we need to be sure this is not a "Reflected" attribute, so we check
//           // the current value of the attribute to make sure it is not the same
//           // as the value we just set. If it is the same, it must be reflected.
//           // so removing the attribute would remove the idl we just set.
//           if (node.getAttribute(attrName) != value) value = false
//         }
//         // Set a standard content attribute.
//         value !== false
//           ? node.setAttribute(attrName, value)
//           : (node.removeAttribute(attrName), i--)
//       })
//     }
//   }
//   toRemove.forEach((attrName) => node.removeAttribute(attrName))
// }

/**
 * Removes DOM nodes from the dom and cleans up any attached listeners.
 * @param node - A DOM element to remove
 */
function removeNodes(node: ChildNode[]) {
  node.forEach(removeNode)
}

/**
 * Removes the node from the dom and cleans up any attached listeners.
 * @param node - A DOM element to remove
 */
function removeNode(node: ChildNode) {
  node.remove()
  listeners
    .get(node)
    ?.forEach((listener, event) => node.removeEventListener(event, listener))
}

// /**
//  * Given a textNode, parse the node for expressions and return a fragment.
//  * @param  {Node} node
//  * @param  {ReactiveProxy} data
//  * @param  {ReactiveExpressions} tokens
//  * @returns DocumentFragment
//  */
// function comment(node: Node, expressions: ReactiveExpressions): void {
//   // At this point, we know we're dealing with some kind of reactive token fn
//   const expression = expressions.e[expressions.i++]
//   let boundNode: Node
//   if (expression && isTpl(expression.e)) {
//     // If the expression is an html`` (ArrowTemplate), then call it with data
//     // and then call the ArrowTemplate with no parent, so we get the nodes.
//     boundNode = createPartial().add(expression.e)()
//   } else {
//     // This is where the *actual* reactivity takes place:
//     let partialMemo: TemplatePartial
//     measure('w', () => {
//       boundNode = (partialMemo = w(expression, (value) =>
//         setNode(value, partialMemo)
//       ))()
//     })
//   }
//   node.parentNode?.replaceChild(boundNode, node)
// }

// /**
//  * Set the value of a given node.
//  * @param  {Node} n
//  * @param  {any} value
//  * @param  {ReactiveProxy} data
//  * @returns Node
//  */
// function setNode(
//   value: ArrowRenderable,
//   p: TemplatePartial | null
// ): TemplatePartial {
//   const isUpdate = typeof p === 'function'
//   const partial: TemplatePartial = isUpdate ? p : createPartial()
//   Array.isArray(value)
//     ? value.forEach((item) => partial.add(item))
//     : partial.add(value)
//   if (isUpdate) partial._up()
//   return partial
// }

/**
 * Given an HTML string, produce actual DOM elements.
 * @param html - a string of html
 * @returns
 */
// function createNodes(html: string): DocumentFragment {
//   const tpl =
//     templateMemo[html] ??
//     (() => {
//       const tpl = document.createElement('template')
//       tpl.innerHTML = html
//       return (templateMemo[html] = tpl)
//     })()
//   const dom = tpl.content.cloneNode(true) as DocumentFragment
//   dom.normalize() // textNodes are automatically split somewhere around 65kb, this joins them back together.
//   return dom
// }

/**
 * Given a string of raw interlaced HTML (the arrow comments are already in the
 * approximately correct place), produce a Chunk object and memoize it.
 * @param html - A raw string of HTML
 * @returns
 */
export function createChunk(rawStrings: string[]): Chunk {
  let isNew = false
  const memoKey = rawStrings.join(delimiterComment)
  const chunk: Chunk =
    chunkMemo[memoKey] ??
    (() => {
      isNew = true
      const tpl = document.createElement('template')
      const html = createHTML(rawStrings)
      tpl.innerHTML = html
      const dom = tpl.content.cloneNode(true) as DocumentFragment
      dom.normalize()
      return (chunkMemo[memoKey] = {
        dom,
        paths: createPaths(dom),
        $: Symbol(),
      })
    })()
  const dom = isNew
    ? chunk.dom
    : (chunk.dom.cloneNode(true) as DocumentFragment)
  return { ...chunk, dom }
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
  let node: Node | null
  let toRemove: Node | null = null
  while ((node = nodes.nextNode())) {
    // Remove the primary node from the previous iteration
    toRemove?.parentElement?.removeChild(toRemove)
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
  while (node.parentNode) {
    const children = node.parentNode.childNodes as NodeList
    for (let i = 0; i < children.length; i++) {
      if (children[i] === node) {
        path.unshift(i)
        break
      }
    }
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
    let stackPos = 0
    let currentString = stack[0]
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
        stackPos === 0 &&
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
      if ((pos += direction) === currentStringLength) {
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

/**
 * Template partials are stateful functions that perform a fragment render when
 * called, but also have function properties like ._up() which attempts to only
 * perform a patch of the previously rendered nodes.
 * @returns TemplatePartial
 */
// function createPartial(group = Symbol()): TemplatePartial {
//   let html = ''
//   let expressions: ReactiveExpressions = { i: 0, e: [] }
//   let chunks: Array<PartialChunk> = []
//   let previousChunks: Array<PartialChunk> = []
//   const keyedChunks: Map<ArrowTemplateKey, PartialChunk> = new Map()
//   const toRemove: ChildNode[] = []

//   /**
//    * This is the actual document partial function.
//    */
//   const partial: TemplatePartial = () => {
//     let dom: DocumentFragment | Text
//     if (!chunks.length) addPlaceholderChunk()
//     if (chunks.length === 1 && !isTpl(chunks[0].tpl)) {
//       // In this case we have only a textNode to render, so we can just return
//       // the text node with the proper value applied.
//       const chunk = chunks[0] as PartialChunk & { tpl: string }
//       chunk.dom.length
//         ? (chunk.dom[0].nodeValue = chunk.tpl)
//         : chunk.dom.push(document.createTextNode(chunk.tpl))
//       dom = chunk.dom[0] as Text
//     } else {
//       const nodes: DocumentFragment = createNodes(html)
//       const f: DocumentFragment = fragment(nodes, expressions)()
//       dom = assignDomChunks(f)
//     }
//     reset()
//     return dom
//   }
//   partial.ch = () => previousChunks
//   partial.l = 0
//   partial.add = (tpl: ArrowTemplate | number | string): TemplatePartial => {
//     if (!tpl && tpl !== 0) return partial
//     // If the tpl is a string or a number it means the result should be a
//     // textNode — in that case we do *not* want to generate any DOM nodes for it
//     // so here we want to ensure that `html` is just ''.
//     let localExpressions: ReactiveFunction[] = []
//     let key: ArrowTemplateKey
//     let template = ''
//     if (isTpl(tpl)) {
//       ;[template, localExpressions, key] = tpl._h()
//     }
//     html += template
//     html += bookendComment
//     const keyedChunk = key && keyedChunks.get(key)
//     const chunk = keyedChunk || {
//       html: template,
//       exp: localExpressions,
//       dom: [],
//       tpl,
//       key,
//     }
//     chunks.push(chunk as PartialChunk)
//     if (key) {
//       // Since this is a keyed chunk, we need to either add it to the
//       // keyedChunks map, or we need to update the expressions in that chunk.
//       keyedChunk
//         ? keyedChunk.exp.forEach((exp, i) => exp._up(localExpressions[i].e))
//         : keyedChunks.set(key, chunk as PartialChunk)
//     }
//     expressions.e.push(...localExpressions)
//     partial.l++
//     return partial
//   }

//   partial._up = () => {
//     const subPartial = createPartial(group)
//     let startChunking = 0
//     let lastNode: ChildNode = previousChunks[0].dom[0]
//     // If this is an empty update, we need to "placehold" its spot in the dom
//     // with an empty placeholder chunk.
//     if (!chunks.length) addPlaceholderChunk(document.createComment(''))

//     const closeSubPartial = () => {
//       if (!subPartial.l) return
//       const frag = subPartial()
//       const last = frag.lastChild as ChildNode
//       lastNode[startChunking ? 'after' : 'before'](frag)
//       transferChunks(subPartial, chunks, startChunking)
//       lastNode = last
//     }
//     chunks.forEach((chunk, index) => {
//       // There are a few things that can happen in here:
//       // 1. We match a key and output previously rendered nodes.
//       // 2. We use a previous rendered dom, and swap the expression.
//       // 3. The actual HTML chunk is changed/new so we need to remove the nodes.
//       // 4. We render totally new nodes using a partial.
//       const prev = previousChunks[index]
//       if (chunk.key && chunk.dom.length) {
//         closeSubPartial()
//         // This is a keyed dom chunk that has already been rendered.
//         if (!prev || prev.dom !== chunk.dom) {
//           lastNode[index ? 'after' : 'before'](...chunk.dom)
//         }
//         lastNode = chunk.dom[chunk.dom.length - 1] as ChildNode
//         // Note: we don't need to update keyed chunks expressions here because
//         // it is done in partial.add as soon as a keyed chunk is added to the
//         // partial.
//       } else if (prev && chunk.html === prev.html && !prev.key) {
//         // We can reuse the DOM node, and need to swap the expressions. First
//         // close out any partial chunks. Then "upgrade" the expressions.
//         closeSubPartial()
//         prev.exp.forEach((expression, i) => expression._up(chunk.exp[i].e))
//         // We always want to reference the root expressions as long as the
//         // chunks remain equivalent, so here we explicitly point the new chunk's
//         // expression set to the original chunk expression set — which was just
//         // updated with the new expression's "values".
//         chunk.exp = prev.exp
//         chunk.dom = prev.dom
//         lastNode = chunk.dom[chunk.dom.length - 1]
//         if (isTextNodeChunk(chunk) && lastNode instanceof Text) {
//           lastNode.nodeValue = chunk.tpl
//         }
//       } else {
//         if (prev && chunk.html !== prev.html && !prev.key) {
//           // The previous chunk in this position has changed its underlying html
//           // this happens when someone is using non-reactive values in the
//           // template. We need to remove the previous nodes.
//           toRemove.push(...prev.dom)
//         }
//         // Ok, now we're building some new DOM up y'all, let the chunking begin!
//         if (!subPartial.l) startChunking = index
//         subPartial.add(chunk.tpl)
//       }
//     })

//     closeSubPartial()
//     let node = lastNode?.nextSibling
//     while (node && group in node) {
//       toRemove.push(node)
//       const next = node.nextSibling
//       node = next
//     }
//     removeNodes(toRemove)
//     reset()
//   }

//   // What follows are internal "methods" for each partial.
//   const reset = () => {
//     toRemove.length = 0
//     html = ''
//     partial.l = 0
//     expressions = { i: 0, e: [] }
//     previousChunks = [...chunks]
//     chunks = []
//   }

//   const addPlaceholderChunk = (node?: Comment) => {
//     html = '<!---->'
//     chunks.push({
//       html,
//       exp: [],
//       dom: node ? [node] : [],
//       tpl: t`${html}`,
//       key: 0,
//     })
//   }

//   /**
//    * Walks through the document fragment and assigns the nodes to the correct
//    * DOM chunk. Chunks of DOM are divided by the bookend comment.
//    * @param frag - A document fragment that has been created from a partial
//    * @returns
//    */
//   const assignDomChunks = (frag: DocumentFragment): DocumentFragment => {
//     let chunkIndex = 0
//     const toRemove: ChildNode[] = []
//     frag.childNodes.forEach((node) => {
//       if (node.nodeType === 8 && (node as Comment).data === bookend) {
//         chunkIndex++
//         // Remove the comment
//         toRemove.push(node as ChildNode)
//         return
//       }
//       Object.defineProperty(node, group, { value: group })
//       chunks[chunkIndex].dom.push(node as ChildNode)
//     })
//     toRemove.forEach((node) => node.remove())
//     return frag
//   }

//   const transferChunks = (
//     partialA: TemplatePartial,
//     chunksB: PartialChunk[],
//     chunkIndex: number
//   ) => {
//     partialA.ch().forEach((chunk, index) => {
//       chunksB[chunkIndex + index].dom = chunk.dom
//     })
//   }
//   return partial
// }

/**
 * Checks if a given chunk is a textNode chunk.
 * @param chunk - A partial chunk
 * @returns
 */
function isTextNodeChunk(
  chunk: PartialChunk
): chunk is PartialChunk & { tpl: string } {
  return chunk.dom.length === 1 && !isTpl(chunk.tpl)
}
