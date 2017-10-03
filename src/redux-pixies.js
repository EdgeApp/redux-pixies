// @flow
export type OnError = (e: any) => void
export type OnOutput = (data: any) => void
export type UpdateFunction<P> = (props: P) => any
export type DestroyFunction = () => void

export type Condition<P, R> = (props: P) => R | void

export interface PixieInstance<P> {
  update(props: P): any,
  destroy(): void
}

export interface TamePixieInput {
  onError: OnError,
  onOutput: OnOutput
}

export type TamePixie<P> = (input: TamePixieInput) => PixieInstance<P>

export interface PixieInput<P> extends TamePixieInput {
  nextProps(): Promise<P>,
  +props: P,
  waitFor<R>(condition: Condition<P, R>): Promise<R>
}

export type WildPixie<P> = (
  input: PixieInput<P>
) => PixieInstance<P> | UpdateFunction<P>

// Pixie enhancers:
export { catchPixieError } from './enhancers/catchPixieError.js'
export { reflectPixieOutput } from './enhancers/reflectPixieOutput.js'
export { tamePixie, isPixieShutdownError } from './enhancers/tamePixie.js'

// Pixie managers:
export { attachPixie } from './managers/attachPixie.js'
export type { ReduxProps } from './managers/attachPixie.js'
export { startPixie } from './managers/startPixie.js'
export { combinePixies } from './managers/combinePixies.js'
export { filterPixie } from './managers/filterPixie.js'
export { mapPixie } from './managers/mapPixie.js'

// Legacy stuff
export { Pixie, tameClassPixie } from './enhancers/classPixie.js'
export type { PixieCallbacks } from './enhancers/classPixie.js'

/**
 * Update functions can return this to stop all future updates.
 */
export const stopUpdates = { then () {} }
