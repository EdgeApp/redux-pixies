// @flow
import type {
  OnError,
  OnOutput,
  TamePixie,
  PixieInput
} from '../redux-pixies.js'
import { tamePixie } from './tamePixie.js'

export interface PixieCallbacks {
  onError: OnError,
  onOutput: OnOutput
}

/**
 * Class-style pixies should inherit from this type.
 */
export class Pixie<P> {
  props: P

  constructor (props: P, callbacks?: PixieCallbacks) {
    this.props = props
  }

  /**
   * Called every time the props change.
   */
  update (props: P, callbacks: PixieCallbacks): Promise<any> | void {}

  /**
   * Called before the pixie is destroyed.
   * This is a great place to clean up any resources.
   */
  destroy (props: P, callbacks: PixieCallbacks) {}
}

/**
 * Turns a class-style pixie into a tame pixie.
 */
export function tameClassPixie<P> (Constructor: Class<Pixie<P>>): TamePixie<P> {
  return tamePixie(({ onError, onOutput }: PixieInput<P>) => {
    const callbacks: PixieCallbacks = { onError, onOutput }
    let instance: Pixie<P>
    let propsCache: P

    return {
      update (props: P) {
        propsCache = props
        if (!instance) {
          instance = new Constructor(props, callbacks)
        }
        return instance.update(props, callbacks)
      },

      destroy () {
        return instance.destroy(propsCache, callbacks)
      }
    }
  })
}
