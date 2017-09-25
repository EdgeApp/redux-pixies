// @flow
import type { Store, Dispatch } from 'redux'
import type { OnError, OnOutput, WildPixie } from '../redux-pixies.js'
import { catchPixieError } from '../enhancers/catchPixieError.js'
import { reflectPixieOutput } from '../enhancers/reflectPixieOutput.js'

function defaultOnError (e: any) {}
function defaultOnOutput (data: any) {}

/**
 * Intantiates a pixe object and attaches it to a redux store.
 */
export function attachPixie<S, A> (
  store: Store<S, A>,
  pixie: WildPixie<{ state: S, dispatch: Dispatch<A> }>,
  onError: OnError = defaultOnError,
  onOutput: OnOutput = defaultOnOutput
) {
  const tamedPixie = catchPixieError(reflectPixieOutput(pixie))

  const instance = tamedPixie(onError, onOutput)
  instance.update({ state: store.getState(), dispatch: store.dispatch })

  const unsubscribe = store.subscribe(() => {
    instance.update({ state: store.getState(), dispatch: store.dispatch })
  })

  return () => {
    unsubscribe()
    instance.destroy()
  }
}
