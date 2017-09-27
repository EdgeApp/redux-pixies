// @flow
import {
  attachPixie,
  mapPixie,
  startPixie,
  stopUpdates
} from '../src/redux-pixies.js'
import { makeAssertLog } from './assertLog.js'
import './catchPixieError.test.js'
import './combinePixies.test.js'
import './mapPixie.test.js'
import './reflectPixieOutput.test.js'
import './reflectPixieProps.test.js'
import './tamePixie.test.js'
import './wrapPixie.test.js'
import { describe, it } from 'mocha'
import { createStore } from 'redux'

type Action =
  | { type: 'UPDATE', payload: { id: string, value: string } }
  | { type: 'DELETE', payload: string }

function reducer (state = {}, action: Action) {
  switch (action.type) {
    case 'UPDATE': {
      const { id, value } = action.payload
      const copy = { ...state }
      copy[id] = value
      return copy
    }

    case 'DELETE': {
      const copy = { ...state }
      delete copy[action.payload]
      return copy
    }
  }
  return state
}

describe('pixies', function () {
  it('basic operation', function () {
    const log = makeAssertLog(true)

    // A worker with some logging side effects.
    interface ItemProps { id: string, value: string }
    let itemCount = 0
    function itemPixie () {
      const index = itemCount++
      log(`item pixie #${index} created`)

      return {
        update ({ id, value }: ItemProps) {
          log(`item pixie #${index} updated ${id} = ${value}`)
        },
        destroy () {
          log(`item pixie #${index} destroyed`)
        }
      }
    }

    // A pure-function worker for creating & shutting down item workers.
    interface ManagerProps { state: {} }
    const managerPixie = mapPixie(
      itemPixie,
      (props: ManagerProps) => Object.keys(props.state),
      (props: ManagerProps, id: string) => ({ id, value: props.state[id] })
    )

    // The redux store:
    const store = createStore(reducer)
    const destroy = attachPixie(store, managerPixie)

    store.dispatch({ type: 'UPDATE', payload: { id: 'a', value: 'Hello' } })
    store.dispatch({ type: 'UPDATE', payload: { id: 'b', value: 'To' } })
    store.dispatch({ type: 'UPDATE', payload: { id: 'c', value: 'Workers' } })
    log.assert([
      'item pixie #0 created',
      'item pixie #1 created',
      'item pixie #2 created',
      'item pixie #0 updated a = Hello',
      'item pixie #1 updated b = To',
      'item pixie #2 updated c = Workers'
    ])

    store.dispatch({ type: 'DELETE', payload: 'b' })
    log.assert(['item pixie #1 destroyed'])

    store.dispatch({ type: 'UPDATE', payload: { id: 'c', value: 'World' } })
    log.assert(['item pixie #2 updated c = World'])

    destroy()
    log.assert(['item pixie #0 destroyed', 'item pixie #2 destroyed'])
  })

  it('Handles stopUpdates', function () {
    const log = makeAssertLog(false)
    const testPixie = () => () => {
      log('called')
      return stopUpdates
    }

    const instance = startPixie(testPixie)
    instance.update({})
    instance.update({})
    instance.destroy()
    log.assert(['called'])
  })
})
