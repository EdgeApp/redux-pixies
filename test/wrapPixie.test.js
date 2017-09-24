// @flow
import { wrapPixie } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'
import { describe, it } from 'mocha'

describe('wrapPixie', function () {
  it('basic operation', async function () {
    const log = makeAssertLog()

    const testPixie = () => {
      log('create')
      return {
        update (props: {}) {
          log('update ' + JSON.stringify(props))
        },
        destroy () {
          log('destroy')
        }
      }
    }

    const wrappedPixie = wrapPixie(testPixie, (props: { x: number }) => {
      if (props.x > 2) return { y: props.x }
    })
    const instance = wrappedPixie(() => {}, () => {})

    instance.update({ x: 0 })
    instance.update({ x: 4 })
    instance.update({ x: 5 })
    instance.update({ x: 1 })
    instance.update({ x: 6 })
    instance.destroy()
    log.assert([
      'create',
      'update {"y":4}',
      'update {"y":5}',
      'destroy',
      'create',
      'update {"y":6}',
      'destroy'
    ])
  })
})
