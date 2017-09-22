// @flow
import { Pixie, destroyPixie, setPixieProps } from './pixie.js'
import type { PixieNode, PixieCallbacks } from './pixie.js'

/**
 * A higher-order pixie.
 * Wraps a pixie with filtered props and error handling.
 */
export function buildPixie<P: {}> (pixieMap: { [key: string]: Function }) {
  return class BuiltPixie extends Pixie<P> {
    outputs: { [key: string]: any }
    pixieNodes: { [key: string]: PixieNode<any> }

    constructor (props: P, { onError, onOutput }: PixieCallbacks) {
      super(props)
      const outputs = (this.outputs = {})
      const pixieNodes = (this.pixieNodes = {})

      for (const key of Object.keys(pixieMap)) {
        const callbacks: PixieCallbacks = {
          onError,
          onOutput (data: any) {
            outputs[key] = data
            onOutput(outputs)
          }
        }

        const pixieNode: PixieNode<any> = {
          PixieType: pixieMap[key],
          callbacks,
          props
        }
        pixieNodes[key] = pixieNode
      }
    }

    update (props: P) {
      const { pixieNodes } = this
      for (const key of Object.keys(pixieMap)) {
        setPixieProps(pixieNodes[key], props)
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
