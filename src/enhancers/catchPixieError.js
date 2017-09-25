// @flow
import type {
  OnError,
  OnOutput,
  PixieInstance,
  TamePixie,
  WildPixie
} from '../redux-pixies.js'
import { tamePixie } from './tamePixie.js'

type ErrorHandler<P> = (e: any, props: P, onError: OnError) => void

function defaultErrorHandler (e: any, props: any, onError: OnError) {
  onError(e)
}

/**
 * Intercepts `onError`, shutting down the inner pixie.
 */
export function catchPixieError<P: {}> (
  pixie: WildPixie<P>,
  errorHandler: ErrorHandler<P> = defaultErrorHandler
): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (onError: OnError, onOutput: OnOutput) {
    let instance: PixieInstance<P> | void
    let propsCache: P

    const destroy = () => {
      const copy = instance
      instance = void 0
      if (copy) copy.destroy()
    }

    const onErrorInner = (e: any) => {
      destroy()
      try {
        errorHandler(e, propsCache, onError)
      } catch (e) {
        onError(e)
      }
    }

    return {
      update (props: P) {
        propsCache = props
        if (!instance) instance = tamedPixie(onErrorInner, onOutput)
        instance.update(props)
      },

      destroy
    }
  }
  outPixie.tame = true
  return outPixie
}
