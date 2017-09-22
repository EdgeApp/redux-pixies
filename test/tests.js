// @flow
import { makeAssertLog } from './assertLog.js'
import { attachPixie, mapPixie, Pixie } from '../src/index.js'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { createStore } from 'redux'

type Action =
  | { type: 'UPDATE', payload: { id: string, value: string } }
  | { type: 'DELETE', payload: string }
  | { type: '--other--' }

function listReducer (state = {}, action: Action) {
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
    type ItemProps = { key: string, value: string }
    class ItemWorker extends Pixie<ItemProps> {
      key: string

      constructor (props: ItemProps) {
        super(props)
        log(`start ${props.key} = ${props.value}`)
        this.key = props.key
      }

      update (props) {
        expect(props.key).to.equal(this.key)
        log(`update ${props.key} = ${props.value}`)
      }

      destructor (props) {
        log(`stop ${props.key}`)
      }
    }

    // A pure-function worker for creating & shutting down item workers.
    type ManagerProps = {
      state: {}
    }
    const Manager = mapPixie(
      ItemWorker,
      (props: ManagerProps) => Object.keys(props.state),
      (props: ManagerProps, key: string) => ({ key, value: props[key] })
    )

    // The redux store:
    const store = createStore(listReducer)
    const pixieTree = attachPixie(store, Manager)

    store.dispatch({ type: 'UPDATE', payload: { id: 'a', value: 'Hello' } })
    store.dispatch({ type: 'UPDATE', payload: { id: 'b', value: 'To' } })
    store.dispatch({ type: 'UPDATE', payload: { id: 'c', value: 'Workers' } })
    log.assert([
      'start a = Hello',
      'start b = To',
      'start c = Workers',
      'update a = Hello',
      'update b = To',
      'update c = Workers'
    ])

    store.dispatch({ type: 'DELETE', payload: 'b' })
    log.assert(['stop b'])

    store.dispatch({ type: 'UPDATE', payload: { id: 'c', value: 'World' } })
    log.assert(['update c = World'])

    pixieTree.destroy()
    log.assert(['stop a', 'stop c'])
  })

  // it('ignores falsy pixies', function () {
  //   const log = makeAssertLog(true)

  //   function YupWorker () {
  //     log('yup')
  //   }
  //   function ParentWorker () {
  //     this.updateChildren([false, createPixie(YupWorker, {}), false])
  //   }

  //   const store = createStore(listReducer)
  //   attachPixie(store, ParentWorker).destroy()
  //   log.assert(['yup'])
  // })
})
