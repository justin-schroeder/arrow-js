import { w } from './reactive'
import { isTpl, measure, sanitize } from './common'
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
  (parent?: ParentNode): ParentNode
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
  _h: () => [
    html: string,
    expressions: ReactiveFunction[],
    key: ArrowTemplateKey
  ]
  /**
   * The internal key property.
   */
  _k?: ArrowTemplateKey
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
  $on: (observer: CallableFunction) => void
  _up: (newExpression: CallableFunction) => void
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
  e: ReactiveFunction[]
}

/**
 * An internal primitive that is used to create a dom elements.
 */
export type ArrowFragment = {
  <T extends ParentNode>(parent: T): T
  (): DocumentFragment
}

/**
 * A parent node is either an element or a document fragment — something that
 * can have elements appended to it.
 */
export type ParentNode = Element | DocumentFragment

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
 * Event listeners that were bound by arrow and should be cleaned up should the
 * given node be garbage collected.
 */
const listeners = new WeakMap<
  ChildNode,
  Map<string, EventListenerOrEventListenerObject>
>()

/**
 * An controller that is responsible for assembling the template HTML and
 * performing updates to the pertinent DOM nodes contained within it.
 */
export interface TemplatePartial {
  (): DocumentFragment
  /**
   * Adds a template or string to the partials chunks.
   * @param tpl - A template or string to render.
   * @returns
   */
  add: (tpl: ArrowTemplate | number | string) => void
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
  dom: ChildNode[]
  tpl: ArrowTemplate | string
  key: ArrowTemplateKey
}

/**
 * The delimiter that describes where expressions are located.
 */
const delimiter = '➳❍'
const bookend = '❍⇚'
const delimiterComment = `<!--${delimiter}-->`
const bookendComment = `<!--${bookend}-->`

/**
 * The template tagging function, used like: html`<div></div>`(mountEl)
 * @param  {TemplateStringsArray} strings
 * @param  {any[]} ...expressions
 * @returns ArrowTemplate
 */
export function t(
  strings: TemplateStringsArray,
  ...expSlots: any[]
): ArrowTemplate {
  const expressions: ReactiveFunction[] = []
  let str = ''
  const addExpressions = (expression: any, html: string): string => {
    if (typeof expression === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let observer: CallableFunction = () => {}
      expressions.push(
        Object.assign((...args: unknown[]) => expression(...args), {
          e: expression,
          $on: (obs: CallableFunction) => {
            observer = obs
          },
          _up: (exp: CallableFunction) => {
            expression = exp
            observer()
          },
        })
      )
      return html + delimiterComment
    }
    if (Array.isArray(expression)) {
      return expression.reduce((html, exp) => addExpressions(exp, html), html)
    }
    return html + expression
  }

  const toString = () => {
    if (!str) {
      if (!expSlots.length && strings.length === 1 && strings[0] === '') {
        str = '<!---->'
      } else {
        str = strings.reduce(function interlaceTemplate(html, strVal, i) {
          html += strVal
          return expSlots[i] !== undefined
            ? addExpressions(expSlots[i], html)
            : html
        }, '')
      }
    }
    return str
  }
  const template: ArrowTemplate = (el?: ParentNode) => {
    const dom = createNodes(toString())
    const frag = fragment(dom, { i: 0, e: expressions })
    return el ? frag(el) : frag()
  }

  // If the template contains no expressions, it is 100% static so it's key
  // its own content
  template.isT = true
  template._k = 0 as ArrowTemplateKey
  template._h = () => [toString(), expressions, template._k]
  template.key = (key: ArrowTemplateKey): ArrowTemplate => {
    template._k = key
    return template
  }
  return template
}

/**
 * @param  {NodeList} dom
 * @param  {ReactiveExpressions} tokens
 * @param  {ReactiveProxy} data?
 */
function fragment(
  dom: NodeList,
  expressions: ReactiveExpressions
): ArrowFragment {
  const frag = document.createDocumentFragment()
  let node: Node | undefined | null
  while ((node = dom.item(0))) {
    // Delimiters in the body are found inside comments.
    if (node.nodeType === 8 && node.nodeValue === delimiter) {
      // We are dealing with a reactive node.
      frag.append(comment(node, expressions))
      continue
    }
    // Bind attributes, add events, and push onto the fragment.
    measure('attrs', () => {
      if (node instanceof Element) attrs(node, expressions)
    })
    if (node.hasChildNodes()) {
      fragment(node.childNodes, expressions)(node as ParentNode)
    }
    frag.append(node)
    // Select lists "default" selections get out of wack when being moved around
    // inside fragments, this resets them.
    if (node instanceof HTMLOptionElement) node.selected = node.defaultSelected
  }
  return ((parent?: ParentNode): ParentNode => {
    if (parent) {
      parent.appendChild(frag)
      return parent
    }
    return frag
  }) as ArrowFragment
}

/**
 * Given a node, parse for meaningful expressions.
 * @param  {Element} node
 * @returns void
 */
function attrs(node: Element, expressions: ReactiveExpressions): void {
  if (!node.hasAttributes()) return
  const hasValueIDL =
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  const total = node.attributes.length
  const toRemove: string[] = []
  const attrs: any[] = []
  for (let i = 0; i < total; i++) {
    attrs.push(node.attributes[i])
  }
  attrs.forEach((attr) => {
    measure('attrs inner', () => {
      if (attr.value.indexOf(delimiterComment) !== -1) {
        measure('attrs delimiter found', () => {
          let attrName: any
          let expression: any
          measure('attrs, assignment', () => {
            measure('attrs, name', () => {
              attrName = attr.name
            })
            measure('attrs, expression shift', () => {
              expression = expressions.e[expressions.i++]
            })
          })
          if (attrName.charAt(0) === '@') {
            measure('addListeners', () => {
              const event = attrName.substring(1)
              node.addEventListener(event, expression as EventListener)
              if (!listeners.has(node)) listeners.set(node, new Map())
              listeners.get(node)?.set(event, expression as EventListener)
              toRemove.push(attrName)
            })
          } else {
            measure('attrs w()', () => {
              // Logic to determine if this is an IDL attribute or a content attribute
              const isIDL =
                (hasValueIDL && attrName === 'value') ||
                (attrName === 'checked' && node instanceof HTMLInputElement) ||
                (attrName.startsWith('.') && (attrName = attrName.substring(1)))
              w(expression as ReactiveFunction, (value: any) => {
                if (isIDL) {
                  // Handle all IDL attributes, TS won’t like this since it is not
                  // fully are of the type we are operating on, but JavaScript is
                  // perfectly fine with it, so we’ll just ignore TS here.
                  // @ts-ignore:next-line
                  node[attrName as 'value'] = value
                  // Explicitly set the "value" to false remove the attribute.
                  value = false
                }
                // Set a standard content attribute.
                value !== false
                  ? node.setAttribute(attrName, value)
                  : node.removeAttribute(attrName)
              })
            })
          }
        })
      }
    })
  })
  toRemove.forEach((attrName) => node.removeAttribute(attrName))
}

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

/**
 * Given a textNode, parse the node for expressions and return a fragment.
 * @param  {Node} node
 * @param  {ReactiveProxy} data
 * @param  {ReactiveExpressions} tokens
 * @returns DocumentFragment
 */
function comment(
  node: Node,
  expressions: ReactiveExpressions
): DocumentFragment {
  const frag = document.createDocumentFragment()
  // const segments = node.nodeValue!.split(delimiterCapture).filter(Boolean)
  // in this case, we're going to throw the value away because we are creating
  // new nodes, so we remove it from any parent tree.
  ;(node as ChildNode).remove()
  const partial = createPartial()
  // At this point, we know we're dealing with some kind of reactive token fn
  const expression = expressions.e[expressions.i++]
  if (expression && isTpl(expression.e)) {
    // If the expression is an html`` (ArrowTemplate), then call it with data
    // and then call the ArrowTemplate with no parent, so we get the nodes.
    partial.add(expression.e)
  } else {
    if (partial.l) {
      frag.appendChild(partial())
    }

    let partialMemo: TemplatePartial
    measure('textNode w()', () => {
      partialMemo = w(expression, (value: ArrowRenderable) =>
        setNode(value, partialMemo)
      )
      frag.appendChild(
        measure<DocumentFragment>('partialMemo()', () => partialMemo())
      )
    })
  }
  if (partial.l) {
    frag.appendChild(partial())
  }

  return frag
}

/**
 * Set the value of a given node.
 * @param  {Node} n
 * @param  {any} value
 * @param  {ReactiveProxy} data
 * @returns Node
 */
function setNode(
  value: ArrowRenderable,
  p: TemplatePartial | null
): TemplatePartial {
  const isUpdate = typeof p === 'function'
  const partial = isUpdate ? p : createPartial()
  measure('partial.add', () => {
    Array.isArray(value)
      ? value.forEach((item) => partial.add(item))
      : partial.add(value)
  })
  if (isUpdate) partial._up()
  return partial
}

const tpls: { [key: string]: HTMLTemplateElement } = {}
let cacheMiss = 0
function createNodes(html: string): NodeList {
  const tpl: HTMLTemplateElement = measure<HTMLTemplateElement>(
    'innerHTML',
    () => {
      if (tpls[html]) {
        measure('cacheHit', 1)
        return tpls[html]
      }
      measure('cacheMiss', 1)
      cacheMiss++
      if (cacheMiss < 100) {
        console.log(html)
      }
      const tpl = document.createElement('template')
      tpl.innerHTML = html
      tpls[html] = tpl
      return tpl
    }
  )
  return measure('cloneNode', () => {
    const dom = tpl.content.cloneNode(true)
    dom.normalize() // textNodes are automatically split somewhere around 65kb, so join them back together.
    return dom.childNodes
  })
}
/**
 * Template partials are stateful functions that perform a fragment render when
 * called, but also have function properties like ._up() which attempts to only
 * perform a patch of the previously rendered nodes.
 * @returns TemplatePartial
 */
function createPartial(group = Symbol()): TemplatePartial {
  let html = ''
  let expressions: ReactiveExpressions = { i: 0, e: [] }
  let chunks: Array<PartialChunk> = []
  let previousChunks: Array<PartialChunk> = []
  const keyedChunks: Map<ArrowTemplateKey, PartialChunk> = new Map()
  const toRemove: ChildNode[] = []

  /**
   * This is the actual document partial function.
   */
  const partial = () => {
    if (!chunks.length) {
      addPlaceholderChunk()
    }
    const dom = assignDomChunks(
      fragment(
        measure('createNodes in partial', () => createNodes(html)),
        expressions
      )() as DocumentFragment
    )
    reset()
    return dom
  }
  partial.ch = () => previousChunks
  partial.l = 0
  partial.add = (tpl: ArrowTemplate | number | string) => {
    if (!tpl && tpl !== 0) return
    // TODO
    // TODO
    // TODO
    // The issue here is that the `tpl` here could be a pure string, in which
    // case we dont really want to do the whole rigamarole and "sanatize" it
    // and all that. We should probably just do a simple string check and if it
    // is a string somehow create a textNode and add it as a chunk with some
    // form of identifier to know that it is a textNode when it gets to
    // assignDomChunks, and the _up function. Ideally, there should be zero
    // overhead for textNodes, in the sense that they should not be actually
    // added to the HTML itself when createNodes() is called, maybe just the
    // bookendComment should be there, and we take the "empty" area before it
    // and the fact that tpl is a string and create a text node for the chunk.
    // But this needs further testing.
    let template = tpl
    let localExpressions: ReactiveFunction[] = []
    let key: ArrowTemplateKey
    isTpl(tpl)
      ? ([template, localExpressions, key] = tpl._h())
      : (template = sanitize(String(tpl)))
    html += template
    html += bookendComment
    const keyedChunk = key && keyedChunks.get(key)
    const chunk = keyedChunk || {
      html: template as string,
      exp: localExpressions,
      dom: [],
      tpl,
      key,
    }
    chunks.push(chunk as PartialChunk)
    if (key) {
      // Since this is a keyed chunk, we need to either add it to the
      // keyedChunks map, or we need to update the expressions in that chunk.
      keyedChunk
        ? keyedChunk.exp.forEach((exp, i) => exp._up(localExpressions[i].e))
        : keyedChunks.set(key, chunk as PartialChunk)
    }
    expressions.e.push(...localExpressions)
    partial.l++
  }

  partial._up = () => {
    const subPartial = createPartial(group)
    let startChunking = 0
    let lastNode: ChildNode = previousChunks[0].dom[0]

    // If this is an empty update, we need to "placehold" its spot in the dom
    // with an empty placeholder chunk.
    if (!chunks.length) addPlaceholderChunk(document.createComment(''))

    const closeSubPartial = () => {
      if (!subPartial.l) return
      const frag = subPartial()
      const last = frag.lastChild as ChildNode
      lastNode[startChunking ? 'after' : 'before'](frag)
      transferChunks(subPartial, chunks, startChunking)
      lastNode = last
    }
    chunks.forEach((chunk, index) => {
      // There are a few things that can happen in here:
      // 1. We match a key and output previously rendered nodes.
      // 2. We use a previous rendered dom, and swap the expression.
      // 3. The actual HTML chunk is changed/new so we need to remove the nodes.
      // 4. We render totally new nodes using a partial.
      const prev = previousChunks[index]
      if (chunk.key && chunk.dom.length) {
        closeSubPartial()
        // This is a keyed dom chunk that has already been rendered.
        if (!prev || prev.dom !== chunk.dom) {
          lastNode[index ? 'after' : 'before'](...chunk.dom)
        }
        lastNode = chunk.dom[chunk.dom.length - 1] as ChildNode
        // Note: we don't need to update keyed chunks expressions here because
        // it is done in partial.add as soon as a keyed chunk is added to the
        // partial.
      } else if (prev && chunk.html === prev.html && !prev.key) {
        // We can reuse the DOM node, and need to swap the expressions. First
        // close out any partial chunks. Then "upgrade" the expressions.
        closeSubPartial()
        prev.exp.forEach((expression, i) => expression._up(chunk.exp[i].e))
        // We always want to reference the root expressions as long as the
        // chunks remain equivalent, so here we explicitly point the new chunk's
        // expression set to the original chunk expression set — which was just
        // updated with the new expression's "values".
        chunk.exp = prev.exp
        chunk.dom = prev.dom
        lastNode = chunk.dom[chunk.dom.length - 1]
      } else {
        if (prev && chunk.html !== prev.html && !prev.key) {
          // The previous chunk in this position has changed its underlying html
          // this happens when someone is using non-reactive values in the
          // template. We need to remove the previous nodes.
          toRemove.push(...prev.dom)
        }
        // Ok, now we're building some new DOM up y'all, let the chunking begin!
        if (!subPartial.l) startChunking = index
        subPartial.add(chunk.tpl)
      }
    })

    closeSubPartial()
    let node = lastNode.nextSibling
    while (node && group in node) {
      toRemove.push(node)
      const next = node.nextSibling
      node = next
    }
    removeNodes(toRemove)
    reset()
  }

  // What follows are internal "methods" for each partial.
  const reset = () => {
    toRemove.length = 0
    html = ''
    partial.l = 0
    expressions = { i: 0, e: [] }
    previousChunks = [...chunks]
    chunks = []
  }

  const addPlaceholderChunk = (node?: Comment) => {
    html = '<!---->'
    chunks.push({
      html,
      exp: [],
      dom: node ? [node] : [],
      tpl: html,
      key: 0,
    })
  }

  /**
   * Walks through the document fragment and assigns the nodes to the correct
   * DOM chunk. Chunks of DOM are divided by the bookend comment.
   * @param frag - A document fragment that has been created from a partial
   * @returns
   */
  const assignDomChunks = (frag: DocumentFragment): DocumentFragment => {
    let chunkIndex = 0
    const toRemove: ChildNode[] = []
    frag.childNodes.forEach((node) => {
      if (node.nodeType === 8 && (node as Comment).data === bookend) {
        chunkIndex++
        // Remove the comment
        toRemove.push(node as ChildNode)
        return
      }
      Object.defineProperty(node, group, { value: group })
      chunks[chunkIndex].dom.push(node as ChildNode)
    })
    toRemove.forEach((node) => node.remove())
    return frag
  }

  const transferChunks = (
    partialA: TemplatePartial,
    chunksB: PartialChunk[],
    chunkIndex: number
  ) => {
    partialA.ch().forEach((chunk, index) => {
      chunksB[chunkIndex + index].dom = chunk.dom
    })
  }
  return partial
}
