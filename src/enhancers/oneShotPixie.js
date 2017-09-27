// @flow
import type {
  OnError,
  OnOutput,
  TamePixie,
  WildPixie
} from '../redux-pixies.js'
import { tamePixie } from './tamePixie.js'

export type Condition<P, R> = (props: P) => R | void

export type PropsWrapper<P> = {
  getProps(): P,
  nextProps(): Promise<P>,
  waitFor<R>(condition: Condition<P, R>): Promise<R>
}

/**
 * Gives a pixie self-refrential access to its own props.
 */
export function oneShotPixie<P: {}> (
  pixie: WildPixie<PropsWrapper<P>>
): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (onError: OnError, onOutput: OnOutput) {
    let propsCache: P
    let resolvers: Array<(value: any) => void> = []
    let rejectors: Array<(value: any) => void> = []
    let updated: boolean = false

    const propsWrapper = {
      getProps (): P {
        return propsCache
      },

      nextProps (): Promise<P> {
        return new Promise((resolve, reject) => {
          resolvers.push(resolve)
          rejectors.push(reject)
        })
      },

      waitFor<R> (condition: Condition<P, R>): Promise<R> {
        return new Promise((resolve, reject) => {
          function checkProps (props: P) {
            const result = condition(propsCache)
            if (result != null) resolve(result)
            else {
              resolvers.push(checkProps)
              rejectors.push(reject)
            }
          }
          return checkProps(propsCache)
        })
      }
    }

    const instance = tamedPixie(onError, onOutput)

    return {
      update (props: P) {
        // Update the wrapper:
        propsCache = props
        const lastResolvers = resolvers
        resolvers = []
        rejectors = []
        for (const resolve of lastResolvers) resolve(props)

        // Call the child pixie:
        if (!updated) {
          updated = true
          instance.update(propsWrapper)
        }
      },

      destroy () {
        const e = new Error('Pixie has been destroyed')
        for (const reject of rejectors) reject(e)
        instance.destroy()
      }
    }
  }
  outPixie.tame = true
  return outPixie
}
