// @flow
import { catchPixieError } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'
import { describe, it } from 'mocha'

function onOutput () {}

describe('catchPixieError', function () {
  it('basic operation', function () {
    const log = makeAssertLog(true)
    const onError = e => log(e.message)

    const testPixie = ({ onError }) => ({
      update (props: {}) {
        log('update')
        onError(new Error('update error'))
      },
      destroy () {
        log('destroy')
        onError(new Error('destroy error'))
      }
    })

    const instance = catchPixieError(testPixie)({ onError, onOutput })
    instance.update({})
    log.assert(['destroy error', 'destroy', 'update error', 'update'])
  })
})
