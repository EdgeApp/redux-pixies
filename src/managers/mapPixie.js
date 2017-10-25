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
 * Combines one or more pixies into one, using a list of keys.
 */
export function mapPixie<P, Q> (
  pixie: WildPixie<Q>,
  listIds: (props: P) => Array<string>,
  filter: (props: P, id: string) => Q | void
): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (input: TamePixieInput) {
    const { onError } = input
    let instances: { [id: string]: PixieInstance<Q> } = {}
    let outputs: { [id: string]: any } = {}
    let outputsDirty: boolean = false
    const propsCache: { [id: string]: Q | void } = {}
    let updating: boolean = false
    let destroyed: boolean = false

    const safeListIds = catchify(listIds, onError)
    const safeFilter = catchify(filter, onError)

    const updateOutputs = () => {
      if (outputsDirty && !updating) {
        outputsDirty = false
        const newOutputs = {}
        for (const id of Object.keys(instances)) {
          newOutputs[id] = outputs[id]
        }
        outputs = newOutputs
        input.onOutput(outputs)
      }
    }

    return {
      update (outerProps: P) {
        const ids = safeListIds(outerProps)
        if (destroyed || !ids) return

        // Update or create instances for all keys:
        updating = true
        const newInstances: { [id: string]: PixieInstance<Q> } = {}
        for (const id of ids) {
          const innerProps = safeFilter(outerProps, id)
          if (destroyed) return
          const dirty = !shallowCompare(innerProps, propsCache[id])
          propsCache[id] = innerProps

          if (innerProps) {
            if (!instances[id]) {
              const onOutput = (data: any) => {
                if (data !== outputs[id]) {
                  outputs[id] = data
                  outputsDirty = true
                  updateOutputs()
                }
              }
              instances[id] = tamedPixie({ onError, onOutput })
              if (destroyed) return
            }
            if (dirty) instances[id].update(innerProps)
            if (destroyed) return
            newInstances[id] = instances[id]
          }
        }

        // Swap out the instance list, removing unwanted pixies:
        const oldInstances = instances
        instances = newInstances

        // Destroy any old instances that are not on the list.
        // We need to finish this even if it triggers `destroyed`:
        for (const id of Object.keys(oldInstances)) {
          if (!newInstances[id]) oldInstances[id].destroy()
        }
        if (destroyed) return

        updating = false
        updateOutputs()
      },

      destroy () {
        destroyed = true
        for (const id of Object.keys(instances)) {
          if (instances[id]) instances[id].destroy()
        }
      }
    }
  }
  outPixie.tame = true
  outPixie.defaultOutput = {}
  return outPixie
}
