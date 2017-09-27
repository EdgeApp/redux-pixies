// @flow
export type OnError = (e: any) => void
export type OnOutput = (data: any) => void
export type UpdateFunction<P> = (props: P) => any
export type DestroyFunction = () => void

export interface PixieInstance<P> {
  update(props: P): any,
  destroy(): void
}

export type WildPixie<P> = (
  onError: OnError,
  onOutput: OnOutput
) => PixieInstance<P> | UpdateFunction<P>

export type TamePixie<P> = (
  onError: OnError,
  onOutput: OnOutput
) => PixieInstance<P>

// Pixie enhancers:
export { catchPixieError } from './enhancers/catchPixieError.js'
export { reflectPixieOutput } from './enhancers/reflectPixieOutput.js'
export { reflectPixieProps } from './enhancers/reflectPixieProps.js'
export { tamePixie } from './enhancers/tamePixie.js'
export type {
  Condition,
  ReflectedProps
} from './enhancers/reflectPixieProps.js'

// Pixie managers:
export { attachPixie } from './managers/attachPixie.js'
export { startPixie } from './managers/startPixie.js'
export { combinePixies } from './managers/combinePixies.js'
export { mapPixie } from './managers/mapPixie.js'
export { wrapPixie } from './managers/wrapPixie.js'

// Legacy stuff
export { Pixie, tameClassPixie } from './enhancers/classPixie.js'
export type { PixieCallbacks } from './enhancers/classPixie.js'

/**
 * Update functions can return this to stop all future updates.
 */
export const stopUpdates = { then () {} }
