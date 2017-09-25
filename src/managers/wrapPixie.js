// @flow
import type {
  OnError,
  OnOutput,
  PixieInstance,
  TamePixie,
  WildPixie
} from '../redux-pixies.js'
import { tamePixie } from '../enhancers/tamePixie.js'
import { catchify, shallowCompare } from './util.js'

/**
 * Filters the props going into a pixie.
 */
export function wrapPixie<P, Q> (
  pixie: WildPixie<Q>,
  filter: (props: P) => Q | void
): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (onError: OnError, onOutput: OnOutput) {
    let instance: PixieInstance<Q> | void
    let propsCache: Q | void
    let destroyed: boolean = false

    const safeFilter = catchify(filter, onError)

    return {
      update (props: P) {
        const innerProps = safeFilter(props)
        if (destroyed) return
        const dirty = !shallowCompare(innerProps, propsCache)
        propsCache = innerProps

        // Start or stop the instance:
        if (innerProps) {
          if (!instance) instance = tamedPixie(onError, onOutput)
          if (destroyed) return
          if (dirty) instance.update(innerProps)
        } else {
          if (instance) instance.destroy()
          instance = void 0
        }
      },

      destroy () {
        destroyed = true
        if (instance) instance.destroy()
        instance = void 0
      }
    }
  }
  outPixie.tame = true
  return outPixie
}
