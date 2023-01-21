// @flow

export * from './types.js'

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
export const stopUpdates = { then() {} }
