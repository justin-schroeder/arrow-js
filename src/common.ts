import { ArrowTemplate, Chunk } from './html'
import { Reactive, ReactiveTarget } from './reactive'

/**
 * A map of node types to their respective interfaces.
 */
interface NodeTypes {
  [Node.ELEMENT_NODE]: Element
  [Node.COMMENT_NODE]: Comment
  [Node.DOCUMENT_FRAGMENT_NODE]: DocumentFragment
}

/**
 * Determines if a given variable is a template function.
 * @param template - A function to check.
 * @returns
 */
export function isTpl(template: unknown): template is ArrowTemplate {
  return typeof template === 'function' && !!(template as ArrowTemplate).isT
}

/**
 * Returns true for non-null objects.
 * @param obj - An object to check.
 * @returns
 */
export function isO(obj: unknown): obj is ReactiveTarget {
  return obj !== null && typeof obj === 'object'
}

/**
 * Returns true for an object that is "reactive".
 * @param obj - An object to check.
 * @returns
 */
export function isR(obj: unknown): obj is Reactive<ReactiveTarget> {
  return isO(obj) && '$on' in obj
}

/**
 * Determines if the given variable is a chunk.
 * @param chunk - A variable to check.
 * @returns
 */
export function isChunk(chunk: unknown): chunk is Chunk {
  return isO(chunk) && '$' in chunk
}

/**
 * Checks if the given dom node is of the given type.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType}
 * @param obj - An element to check
 * @param type - A node type to check
 * @returns
 */
export function isType<T extends keyof NodeTypes>(
  obj: Node,
  type: T
): obj is NodeTypes[T] {
  return obj.nodeType === type
}
