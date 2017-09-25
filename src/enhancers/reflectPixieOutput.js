// @flow
import type {
  OnError,
  OnOutput,
  PixieInstance,
  TamePixie,
  WildPixie
} from '../redux-pixies.js'
import { tamePixie } from './tamePixie.js'

/**
 * Copies the `output` back into the pixie as a prop.
 */
export function reflectPixieOutput<P: {}> (pixie: WildPixie<P>): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (onError: OnError, onOutput: OnOutput) {
    let instance: PixieInstance<P> | void
    let output: any
    let propsCache: P
    let propsDirty: boolean = true
    let updating: boolean = false

    const tryUpdate = () => {
      // The `update` function can call `onOutput` or `onError`, so loop:
      // eslint-disable-next-line no-unmodified-loop-condition
      while (instance && propsDirty && !updating) {
        propsDirty = false
        updating = true
        instance.update({ ...propsCache, output })
        updating = false
      }
    }

    const onOutputInner = (data: any) => {
      if (data !== output) {
        output = data
        propsDirty = true
        onOutput(data)
        tryUpdate()
      }
    }

    return {
      update (props: P) {
        propsCache = props
        propsDirty = true
        if (!instance) instance = tamedPixie(onError, onOutputInner)
        tryUpdate()
      },

      destroy () {
        const copy = instance
        instance = void 0
        if (copy) copy.destroy()
      }
    }
  }
  outPixie.tame = true
  return outPixie
}
