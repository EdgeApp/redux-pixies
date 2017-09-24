// @flow
import type {
  OnError,
  OnOutput,
  PixieInstance,
  TamePixie,
  UpdateFunction,
  WildPixie
} from '../index.js'

/**
 * If a wild pixie returns a bare function, turn that into a proper object.
 */
function fixInstance<P> (
  instance: PixieInstance<P> | UpdateFunction<P>
): PixieInstance<P> {
  if (typeof instance === 'function') {
    return { update: instance, destroy () {} }
  }
  return instance
}

/**
 * Catches synchronous errors and sends them through `onError`,
 * terminating the inner pixie in response. Also prevents `update`
 * from running in parallel if if returns a promise.
 */
export function babysitPixie<P> (wildPixie: WildPixie<P>): TamePixie<P> {
  function outPixie (onError: OnError, onOutput: OnOutput) {
    let instance: PixieInstance<P> | void
    let propsCache: P
    let propsDirty: boolean = true
    let updating: boolean = false

    const tryUpdate = () => {
      if (instance && propsDirty && !updating) {
        propsDirty = false
        updating = true

        try {
          const thenable = instance.update(propsCache)
          if (thenable && typeof thenable.then === 'function') {
            const onDone = () => {
              updating = false
              tryUpdate()
            }
            thenable.then(onDone, onError)
          } else {
            updating = false
          }
        } catch (e) {
          onError(e)
        }
      }
    }

    try {
      instance = fixInstance(wildPixie(onError, onOutput))
    } catch (e) {
      onError(e)
    }

    return {
      update (props: P) {
        propsCache = props
        propsDirty = true
        tryUpdate()
      },

      destroy () {
        try {
          if (instance) instance.destroy()
          instance = void 0
        } catch (e) {
          onError(e)
        }
      }
    }
  }
  outPixie.tame = true
  return outPixie
}

/**
 * Accepts a hand-written reducer, and hardens it with error checking.
 */
export function tamePixie<P> (pixie: WildPixie<P>): TamePixie<P> {
  return pixie.tame ? pixie : babysitPixie(pixie)
}
