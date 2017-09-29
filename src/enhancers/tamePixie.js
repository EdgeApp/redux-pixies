// @flow
import type {
  PixieInput,
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
  function outPixie (input: PixieInput) {
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
    function onError (e: Error) {
      if (!destroyed) input.onError(e)
      destroy()
    }

    function onOutput (data: any) {
      if (!destroyed) input.onOutput(data)
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
            thenable.then(onUpdateDone, onError)
          } else {
            updating = false
          }
        } catch (e) {
          onError(e)
        }
      }
    }

    const childInput: PixieInput = { onError, onOutput }
    try {
      instance = fixInstance(wildPixie(childInput))
    } catch (e) {
      onError(e)
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
