import { ArrowExpression } from './html'

export const expressions: Array<number | ArrowExpression> = []
const expressionObservers: CallableFunction[] = []
let cursor = 0

/**
 * Creates an updatable expression.
 * @param literalExpression - An arrow function that returns a renderable.
 * @returns
 */
export function storeExpressions(expSlots: ArrowExpression[]): number {
  const len = expSlots.length
  const pointer = cursor
  expressions[cursor++] = len
  for (let i = 0; i < len; i++) {
    expressions[cursor++] = expSlots[i]
  }
  return pointer
}

/**
 * Updates a given expression to a different one.
 * @param source - The id of the expression to update.
 * @param to - The id of the expression to update to.
 */
export function updateExpressions(
  sourcePointer: number,
  toPointer: number
): void {
  const len = expressions[sourcePointer] as number
  for (let i = 1; i <= len; i++) {
    expressions[toPointer + i] = expressions[sourcePointer + i]
    delete expressionObservers[sourcePointer + i]
  }
  for (let i = 1; i <= len; i++) {
    expressionObservers[toPointer + i]?.(expressions[toPointer + i])
  }
}

/**
 * Register an observer to call when a given expression is updated.
 * @param pointer - The pointer of the expression to update.
 * @param observer - The observer to call when the expression is updated.
 */
export function onExpressionUpdate(
  pointer: number,
  observer: CallableFunction
): void {
  expressionObservers[pointer] = observer
}
