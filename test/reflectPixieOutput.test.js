// @flow
import { reflectPixieOutput } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'
import { describe, it } from 'mocha'

function onError () {}

describe('reflectPixieOutput', function () {
  it('output during creation', function () {
    const log = makeAssertLog()
    const onOutput = data => log('output ' + data)

    const testPixie = ({ onOutput }) => {
      onOutput(1)
      return {
        update (props: {}) {
          log('update ' + JSON.stringify(props))
        },
        destroy () {
          log('destroy')
        }
      }
    }

    const instance = reflectPixieOutput(testPixie)({ onError, onOutput })
    instance.update({})
    instance.update({ x: 2 })
    instance.destroy()
    log.assert([
      'output 1',
      'update {"output":1}',
      'update {"x":2,"output":1}',
      'destroy'
    ])
  })

  it('output during update', function () {
    const log = makeAssertLog()
    const onOutput = data => log('output ' + data)

    const testPixie = ({ onOutput }) => {
      return {
        update (props: {}) {
          log('update ' + JSON.stringify(props))
          onOutput(1)
        },
        destroy () {
          log('destroy')
        }
      }
    }

    const instance = reflectPixieOutput(testPixie)({ onError, onOutput })
    instance.update({})
    instance.update({ x: 2 })
    instance.destroy()
    log.assert([
      'update {}',
      'output 1',
      'update {"output":1}',
      'update {"x":2,"output":1}',
      'destroy'
    ])
  })

  it('output during destruction', function () {
    const log = makeAssertLog()
    const onOutput = data => log('output ' + data)

    const testPixie = ({ onError, onOutput }) => {
      return {
        update (props: {}) {
          log('update ' + JSON.stringify(props))
        },
        destroy () {
          log('destroy')
          onOutput(1)
        }
      }
    }

    const instance = reflectPixieOutput(testPixie)({ onError, onOutput })
    instance.update({})
    instance.update({ x: 2 })
    instance.destroy()
    log.assert(['update {}', 'update {"x":2}', 'destroy', 'output 1'])
  })
})
