// @flow
import { tamePixie } from '../enhancers/tamePixie.js'
import type {
  PixieInstance,
  TamePixie,
  TamePixieInput,
  WildPixie
} from '../redux-pixies.js'
import { catchify, shallowCompare } from './util.js'

/**
 * Filters the props going into a pixie.
 */
export function filterPixie<P, Q> (
  pixie: WildPixie<Q>,
  filter: (props: P) => Q | void
): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (input: TamePixieInput) {
    const { onError, onOutput } = input
    let instance: PixieInstance<Q> | void
    let propsCache: Q | void
    let destroyed: boolean = false

    const safeFilter = catchify(filter, onError)

    const childInput: TamePixieInput = { onError, onOutput }

    return {
      update (props: P) {
        const innerProps = safeFilter(props)
        if (destroyed) return
        const dirty = !shallowCompare(innerProps, propsCache)
        propsCache = innerProps

        // Start or stop the instance:
        if (innerProps) {
          if (!instance) instance = tamedPixie(childInput)
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
  outPixie.defaultOutput = pixie.defaultOutput
  return outPixie
}
