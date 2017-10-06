// @flow
import { tamePixie } from '../enhancers/tamePixie.js'
import type {
  PixieInstance,
  TamePixie,
  TamePixieInput,
  WildPixie
} from '../redux-pixies.js'

/**
 * Combines one or more pixies into one.
 */
export function combinePixies<P> (pixieMap: {
  [id: string]: WildPixie<P>
}): TamePixie<P> {
  function outPixie (input: TamePixieInput) {
    const { onError } = input
    const childInputs: { [id: string]: TamePixieInput } = {}
    const instances: { [id: string]: PixieInstance<P> } = {}
    let outputs: { [id: string]: any } = {}
    let destroyed: boolean = false
    input.onOutput(outputs)

    for (const id of Object.keys(pixieMap)) {
      const onOutput = (data: any) => {
        if (data !== outputs[id]) {
          outputs = { ...outputs }
          outputs[id] = data
          input.onOutput(outputs)
        }
      }
      childInputs[id] = { onError, onOutput }
      instances[id] = tamePixie(pixieMap[id])(childInputs[id])
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
  outPixie.defaultOutput = {}
  for (const id of Object.keys(pixieMap)) {
    outPixie.defaultOutput[id] = pixieMap[id].defaultOutput
  }
  return outPixie
}
