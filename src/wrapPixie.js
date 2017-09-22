// @flow
import { Pixie, destroyPixie, setPixieProps } from './pixie.js'
import type { PixieNode, PixieCallbacks } from './pixie.js'

/**
 * A higher-order pixie.
 * Wraps a pixie with filtered props and error handling.
 */
export function wrapPixie<P, Q> (
  PixieType: Function,
  filterProps: (props: P) => Q | void,
  handleError?: (e: any, props: Q) => void
) {
  return class WrappedPixie extends Pixie<P> {
    pixieNode: PixieNode<any>

    constructor (props: P, { onError, onOutput }: PixieCallbacks) {
      super(props)

      const callbacks: PixieCallbacks = {
        onError (e: any): void {
          if (handleError) {
            try {
              destroyPixie(pixieNode)
              handleError(e, pixieNode.props)
            } catch (e) {
              onError(e)
            }
          } else {
            onError(e)
          }
        },
        onOutput
      }

      const pixieNode: PixieNode<any> = { PixieType, callbacks, props }
      this.pixieNode = pixieNode
    }

    update (props: P) {
      const { pixieNode } = this
      const childProps = filterProps(props)

      if (childProps == null) {
        destroyPixie(pixieNode)
      } else {
        setPixieProps(pixieNode, childProps)
      }
    }

    destructor (props: P) {
      const { pixieNode } = this
      destroyPixie(pixieNode)
    }
  }
}
