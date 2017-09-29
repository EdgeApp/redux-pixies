// @flow
import { tamePixie } from '../src/redux-pixies.js'
import { makeAssertLog } from './assertLog.js'
import { describe, it } from 'mocha'

function onError () {}
function onOutput () {}

describe('tamePixie', function () {
  it('handles raw update functions', function () {
    const log = makeAssertLog()
    const onError = e => log(e.message)

    const testPixie = () => (props: {}) => {
      log('update')
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })
    instance.update({})
    instance.destroy()
    log.assert(['update'])
  })

  it('traps creation errors', function () {
    const log = makeAssertLog()
    const onError = e => log(e.message)

    function badPixie () {
      throw new Error('create')
    }

    const instance = tamePixie(badPixie)({ onError, onOutput })
    log.assert(['create'])

    instance.update({})
    instance.destroy()
    log.assert([])
  })

  it('traps method errors', function () {
    const log = makeAssertLog()
    const onError = e => log(e.message)

    function badPixie () {
      return {
        update (props: {}) {
          throw new Error('update')
        },
        destroy () {
          throw new Error('destroy')
        }
      }
    }

    const instance = tamePixie(badPixie)({ onError, onOutput })
    instance.update({})
    log.assert(['update', 'destroy'])

    instance.destroy() // Should aready be destroyed
    log.assert([])
  })

  it('serializes update calls', async function () {
    const log = makeAssertLog()

    const testPixie = () => (props: { x: string }) => {
      log('update ' + props.x)
      return Promise.resolve(1)
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })
    instance.update({ x: 'a' })
    instance.update({ x: 'b' })
    log.assert(['update a'])

    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert(['update b'])
  })

  it('traps update promise rejections', async function () {
    const log = makeAssertLog()
    const onError = e => log(e.message)

    const testPixie = () => (props: {}) => {
      log('update')
      return Promise.reject(new Error('rejected'))
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })
    instance.update({})
    log.assert(['update'])

    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert(['rejected'])
  })
})
