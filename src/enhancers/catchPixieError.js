// @flow
import type {
  OnError,
  PixieInstance,
  TamePixie,
  TamePixieInput,
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

  function outPixie (input: TamePixieInput) {
    const { onOutput } = input
    let instance: PixieInstance<P> | void
    let propsCache: P

    const destroy = () => {
      const copy = instance
      instance = void 0
      if (copy) copy.destroy()
    }

    function onError (e: any) {
      destroy()
      try {
        errorHandler(e, propsCache, input.onError)
      } catch (e) {
        input.onError(e)
      }
    }

    const childInput: TamePixieInput = { onError, onOutput }

    return {
      update (props: P) {
        propsCache = props
        if (!instance) instance = tamedPixie(childInput)
        instance.update(props)
      },

      destroy
    }
  }
  outPixie.tame = true
  outPixie.defaultOutput = pixie.defaultOutput
  return outPixie
}
