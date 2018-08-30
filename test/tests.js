// @flow
import './catchPixieError.test.js'
import './combinePixies.test.js'
import './filterPixie.test.js'
import './mapPixie.test.js'
import './reflectPixieOutput.test.js'
import './shallowCompare.test.js'
import './tamePixie.test.js'

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { createStore } from 'redux'
import {
  attachPixie,
  combinePixies,
  mapPixie,
  startPixie,
  stopUpdates
} from '../src/index.js'
import type { ReduxProps } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'

type Action =
  | { type: 'UPDATE', payload: { id: string, value: string } }
  | { type: 'DELETE', payload: string }

type State = {
  [id: string]: string
}

function reducer (state: State = {}, action: Action): State {
  switch (action.type) {
    case 'UPDATE': {
      const { id, value } = action.payload
      const copy: State = { ...state }
      copy[id] = value
      return copy
    }

    case 'DELETE': {
      const copy: State = { ...state }
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
    type ItemProps = { id: string, value: string }
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
    const managerPixie = mapPixie(
      itemPixie,
      (props: ReduxProps<State, Action>) => Object.keys(props.state),
      (props: ReduxProps<State, Action>, id: string) => ({
        id,
        value: props.state[id]
      })
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

  it('handles stopUpdates', function () {
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

  it('provides default output', function () {
    const testPixie = () => props => {
      expect(props).to.deep.equal({ output: { inner: 1 } })
    }
    testPixie.defaultOutput = 1

    const instance = startPixie(combinePixies({ inner: testPixie }))
    instance.destroy()
  })
})
