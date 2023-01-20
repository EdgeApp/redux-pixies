// @flow

import type { Dispatch, Store } from 'redux'

import type { OnError, OnOutput, WildPixie } from '../redux-pixies.js'
import { startPixie } from './startPixie.js'

export type ReduxProps<S, A> = {
  dispatch: Dispatch<A>,
  output: any,
  state: S
}

/**
 * Instantiates a pixie object and attaches it to a redux store.
 */
export function attachPixie<S, A>(
  store: Store<S, A>,
  pixie: WildPixie<ReduxProps<S, A>>,
  onError?: OnError,
  onOutput?: OnOutput
) {
  const instance = startPixie(pixie, onError, onOutput)
  instance.update({
    dispatch: store.dispatch,
    output: undefined,
    state: store.getState()
  })

  const unsubscribe = store.subscribe(() => {
    instance.update({
      dispatch: store.dispatch,
      output: undefined,
      state: store.getState()
    })
  })

  return () => {
    unsubscribe()
    instance.destroy()
  }
}
