// @flow
import { Pixie, destroyPixie, setPixieProps } from './pixie.js'
import type { PixieNode, PixieCallbacks } from './pixie.js'

/**
 * A higher-order pixie.
 * Wraps a pixie with filtered props and error handling.
 */
export function mapPixie<P, Q> (
  PixieType: Function,
  grabList: (props: P) => Array<string>,
  filterProps: (props: P, key: string) => Q | void,
  handleError?: (e: any, props: Q) => void
) {
  return class MappedPixie extends Pixie<P> {
    outputs: { [key: string]: any }
    pixieNodes: { [key: string]: PixieNode<any> }

    constructor (props: P, { onError, onOutput }: PixieCallbacks) {
      super(props)
      this.outputs = {}
      this.pixieNodes = {}
    }

    update (props: P, { onError, onOutput }: PixieCallbacks) {
      const oldNodes = this.pixieNodes
      const outputs = this.outputs
      const pixieNodes: { [key: string]: PixieNode<any> } = {}

      const list = grabList(props)
      for (const key of list) {
        if (oldNodes[key] !== null) {
          pixieNodes[key] = oldNodes[key]
          delete oldNodes[key]
        } else {
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

            onOutput (data: any) {
              outputs[key] = data
              onOutput(outputs)
            }
          }

          const pixieNode: PixieNode<any> = { PixieType, callbacks, props }
          pixieNodes[key] = pixieNode
        }
      }

      // Stop old nodes:
      for (const key of Object.keys(oldNodes)) {
        destroyPixie(oldNodes[key])
        delete outputs[key]
      }

      // Save and activate new nodes:
      this.pixieNodes = pixieNodes
      for (const key of Object.keys(pixieNodes)) {
        const childProps = filterProps(props, key)

        if (childProps == null) {
          destroyPixie(pixieNodes[key])
        } else {
          setPixieProps(pixieNodes[key], childProps)
        }
      }
    }

    destructor (props: P) {
      const { pixieNodes } = this
      for (const key of Object.keys(pixieNodes)) {
        destroyPixie(pixieNodes[key])
      }
    }
  }
}
