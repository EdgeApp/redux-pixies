// @flow
import type {
  OnError,
  OnOutput,
  PixieInstance,
  TamePixie,
  WildPixie
} from '../index.js'
import { tamePixie } from '../enhancers/tamePixie.js'

/**
 * Combines one or more pixies into one.
 */
export function combinePixies<P> (pixieMap: {
  [id: string]: WildPixie<P>
}): TamePixie<P> {
  function outPixie (onError: OnError, onOutput: OnOutput) {
    const instances: { [id: string]: PixieInstance<P> } = {}
    let outputs: { [id: string]: any } = {}
    let destroyed: boolean = false

    for (const id of Object.keys(pixieMap)) {
      const onOutputInner = (data: any) => {
        if (data !== outputs[id]) {
          outputs = { ...outputs }
          outputs[id] = data
          onOutput(outputs)
        }
      }
      instances[id] = tamePixie(pixieMap[id])(onError, onOutputInner)
      if (destroyed) break
    }

    return {
      update (props: P) {
        for (const id of Object.keys(instances)) {
          instances[id].update(props)
          if (destroyed) return
        }
      },

      destroy () {
        destroyed = true
        for (const id of Object.keys(instances)) {
          instances[id].destroy()
        }
      }
    }
  }
  outPixie.tame = true
  return outPixie
}
