// @flow
import type {
  Condition,
  PixieInstance,
  TamePixie,
  TamePixieInput,
  UpdateFunction,
  WildPixie,
  PixieInput
} from '../redux-pixies.js'

function makePixieShutdownError () {
  const e = new Error('Pixie has been destroyed')
  e.name = 'PixieShutdownError'
  return e
}

export function isPixieShutdownError (e: any) {
  return e instanceof Error && e.name === 'PixieShutdownError'
}

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
  function outPixie (input: TamePixieInput) {
    let instance: PixieInstance<P> | void
    let propsCache: P
    let propsDirty: boolean = true
    let updating: boolean = false
    let destroyed: boolean = false
    let nextPromise: Promise<P> | void
    let rejector: ((e: any) => void) | void
    let resolver: ((props: P) => void) | void

    function destroy () {
      if (instance) {
        try {
          if (rejector) {
            const copy = rejector
            nextPromise = void 0
            rejector = void 0
            resolver = void 0
            copy(makePixieShutdownError())
          }
          const copy = instance
          instance = void 0
          copy.destroy()
        } catch (e) {
          onError(e)
        }
        destroyed = true
      }
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

    function getNextPromise (): Promise<P> {
      if (!nextPromise) {
        nextPromise = new Promise((resolve, reject) => {
          resolver = resolve
          rejector = reject
        })
      }
      return nextPromise
    }

    const childInput: PixieInput<P> = {
      onError,
      onOutput,
      get props () {
        return propsCache
      },
      nextProps: getNextPromise,
      waitFor<R> (condition: Condition<P, R>): Promise<R> {
        return new Promise((resolve, reject) => {
          function checkProps (props: P) {
            const result = condition(props)
            if (result != null) resolve(result)
            else getNextPromise().then(checkProps, reject)
          }
          return checkProps(propsCache)
        })
      }
    }
    try {
      instance = fixInstance(wildPixie(childInput))
    } catch (e) {
      onError(e)
    }

    return {
      update (props: P) {
        propsCache = props
        propsDirty = true

        // Update the `nextProps` promise right away:
        if (resolver) {
          const copy = resolver
          nextPromise = void 0
          rejector = void 0
          resolver = void 0
          copy(props)
        }

        tryUpdate()
      },

      destroy
    }
  }
  outPixie.tame = true
  outPixie.defaultOutput = wildPixie.defaultOutput
  return outPixie
}

/**
 * Accepts a hand-written reducer, and hardens it with error checking.
 */
export function tamePixie<P> (pixie: WildPixie<P>): TamePixie<P> {
  return pixie.tame ? (pixie: any) : babysitPixie(pixie)
}
