// @flow
import type { OnError, OnOutput, WildPixie } from '../redux-pixies.js'
import { startPixie } from './startPixie.js'
import type { Store, Dispatch } from 'redux'

/**
 * Instantiates a pixie object and attaches it to a redux store.
 */
export function attachPixie<S, A> (
  store: Store<S, A>,
  pixie: WildPixie<{ state: S, dispatch: Dispatch<A> }>,
  onError?: OnError,
  onOutput?: OnOutput
) {
  const instance = startPixie(pixie, onError, onOutput)
  instance.update({ state: store.getState(), dispatch: store.dispatch })

  const unsubscribe = store.subscribe(() => {
    instance.update({ state: store.getState(), dispatch: store.dispatch })
  })

  return () => {
    unsubscribe()
    instance.destroy()
  }
}
