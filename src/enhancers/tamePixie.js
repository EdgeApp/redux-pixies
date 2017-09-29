// @flow
import type {
  OnError,
  OnOutput,
  PixieInstance,
  TamePixie,
  UpdateFunction,
  WildPixie
} from '../redux-pixies.js'

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
    let destroyed: boolean = false

    function destroy () {
      try {
        const copy = instance
        instance = void 0
        if (copy) copy.destroy()
      } catch (e) {
        onError(e)
      }
      destroyed = true
    }

    // Ignore any callbacks once `destroy` has completed:
    function innerOnError (e: Error) {
      if (!destroyed) onError(e)
      destroy()
    }

    function innerOnOutput (data: any) {
      if (!destroyed) onOutput(data)
    }

    function onUpdateDone () {
      updating = false
      tryUpdate()
    }

    function tryUpdate () {
      // eslint-disable-next-line no-unmodified-loop-condition
      while (instance && propsDirty && !updating) {
        propsDirty = false
        updating = true

        try {
          const thenable = instance.update(propsCache)
          if (thenable && typeof thenable.then === 'function') {
            thenable.then(onUpdateDone, innerOnError)
          } else {
            updating = false
          }
        } catch (e) {
          innerOnError(e)
        }
      }
    }

    try {
      instance = fixInstance(wildPixie(innerOnError, innerOnOutput))
    } catch (e) {
      innerOnError(e)
    }

    return {
      update (props: P) {
        propsCache = props
        propsDirty = true
        tryUpdate()
      },

      destroy
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
