// @flow
import { destroyPixie, setPixieProps } from './pixie.js'
import type { PixieNode } from './pixie.js'
import type { Store } from 'redux'

export interface PixieTree<P> {
  setProps(props: P): void,
  destroy(): void
}

/**
 * A higher-order pixie.
 * Wraps a pixie with filtered props and error handling.
 */
export function startPixie<P: {}> (
  PixieType: Function,
  props: P,
  handleError?: (e: any, props: P) => void
): PixieTree<P> {
  let output: any
  // let outputPromise: Promise<void> | void

  const callbacks = {
    onOutput (data: any): void {
      output = data
      setPixieProps(pixieNode, { ...props, output })

      // Actually run the updates on the next tick:
      // if (!outputPromise) {
      //   outputPromise = Promise.resolve()
      //   outputPromise.then(() => {
      //     outputPromise = void 0
      //     setPixieProps(pixieNode, { ...props, output })
      //   })
      // }
    },

    onError (e: any): void {
      destroyPixie(pixieNode)
      try {
        if (handleError) handleError(e, pixieNode.props)
      } catch (e) {}
    }
  }
  const pixieNode: PixieNode<P> = { PixieType, callbacks, props }
  setPixieProps(pixieNode, { ...props, output })

  return {
    setProps (newProps: P) {
      props = newProps
      setPixieProps(pixieNode, { ...props, output })
    },

    destroy () {
      destroyPixie(pixieNode)
    }
  }
}

/**
 * Attaches a pixie to a Redux store.
 * The pixie will recieve `dispatch` in its `context`,
 * and the current store state as its `props`.
 *
 * @param {*} PixieType A pixie constructor or update function.
 * @param {*} store A redux store.
 * @return An unsubscribe function.
 */
export function attachPixie (
  store: Store<any, any>,
  PixieType: Function,
  props: any = {},
  handleError?: (e: any, props: any) => void
) {
  const dispatch = store.dispatch

  const pixieTree = startPixie(
    PixieType,
    { ...props, state: store.getState(), dispatch },
    handleError
  )

  const unsubscribe = store.subscribe(() => {
    pixieTree.setProps({ ...props, state: store.getState(), dispatch })
  })

  return {
    setProps (newProps: any) {
      props = newProps
      pixieTree.setProps({ ...props, state: store.getState(), dispatch })
    },

    destroy () {
      unsubscribe()
      pixieTree.destroy()
    }
  }
}
