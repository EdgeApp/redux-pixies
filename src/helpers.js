// @flow
/** @jsx createPixie */
import { createPixie, Pixie } from './pixies.js'
import type { PixieChild } from './pixies.js'
import type { Store } from 'redux'

/**
 * A helper pixie for adding items to the context.
 */
export function InjectContext (
  props: {
    children: Array<PixieChild<any>>,
    context: {}
  },
  context: {}
) {
  this.updateChildren(props.children, { ...context, ...props.context })
}

/**
 * A helper pixie for stuffing a Redux store into the context.
 */
export function ReduxProvider (
  props: {
    children: Array<PixieChild<any>>,
    store: Store<any, any>
  },
  context: {}
) {
  this.updateChildren(props.children, { ...context, reduxStore: props.store })
}

export type MapStateToProps<S> = (state: S) => {}
export type MapDispatchToProps<D> = (dispatch: D) => {}

function defaultMapStateToProps (state) {
  return { state }
}

function defaultMapDispatchToProps (dispatch) {
  return { dispatch }
}

/**
 * A higher-order pixie for subscribing to a Redux store.
 * Provides the current state to the child via `props.state`,
 * and the dispatch function via `context.dispatch`.
 */
export const connectPixie = (
  mapStateToProps: MapStateToProps<*> = defaultMapStateToProps,
  mapDispatchToProps: MapDispatchToProps<*> = defaultMapDispatchToProps
) => (PixieType: Function) =>
  class extends Pixie<any> {
    unsubscribe: () => void
    dispatchProps: {}

    constructor (props: any, context: any) {
      super()

      if (!context || !context.reduxStore) {
        throw new Error('Cannot find a `reduxStore` in the context.')
      }
      const { reduxStore } = context
      this.dispatchProps = mapDispatchToProps(reduxStore.dispatch)
      this.unsubscribe = props.store.subscribe(() => this.update())
    }

    update () {
      const { reduxStore } = this.context
      this.updateChildren(
        createPixie(PixieType, {
          ...this.dispatchProps,
          ...mapDispatchToProps(reduxStore.getState()),
          ...this.props
        })
      )
    }

    destructor () {
      this.unsubscribe()
    }
  }
