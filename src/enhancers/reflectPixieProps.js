// @flow
import type { OnError, OnOutput, TamePixie, WildPixie } from '../index.js'
import { tamePixie } from './tamePixie.js'

export type Condition<P, R> = (props: P) => R | void

export type ReflectedProps<P> = P & {
  getProps(): P,
  nextProps(): Promise<P>,
  pauseUntil<R>(condition: Condition<P, R>): Promise<R>
}

/**
 * Gives a pixie self-refrential access to its own props.
 */
export function reflectPixieProps<P: {}> (
  pixie: WildPixie<ReflectedProps<P>>
): TamePixie<P> {
  const tamedPixie = tamePixie(pixie)

  function outPixie (onError: OnError, onOutput: OnOutput) {
    let propsCache: P
    let resolvers: Array<(value: any) => void> = []
    let rejectors: Array<(value: any) => void> = []

    function getProps (): P {
      return propsCache
    }

    function nextProps (): Promise<P> {
      return new Promise((resolve, reject) => {
        resolvers.push(resolve)
        rejectors.push(reject)
      })
    }

    function pauseUntil<R> (condition: Condition<P, R>): Promise<R> {
      return new Promise((resolve, reject) => {
        function attempt (props: P) {
          const out = condition(propsCache)
          if (out) resolve(out)
          else {
            resolvers.push(attempt)
            rejectors.push(reject)
          }
        }
        return attempt(propsCache)
      })
    }

    const instance = tamedPixie(onError, onOutput)

    return {
      update (props: P) {
        propsCache = props
        const copy = resolvers
        resolvers = []
        rejectors = []
        for (const resolve of copy) resolve(props)
        instance.update({ ...props, getProps, nextProps, pauseUntil })
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
