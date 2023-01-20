// @flow
import { expect } from 'chai'
import { describe, it } from 'mocha'
import type { PixieInput } from '../src/index.js'
import { tamePixie } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'

function onError () {}
function onOutput () {}

function tinyTimeout () {
  return new Promise(resolve => setTimeout(resolve, 1))
}

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

  it('adds input properties', async function () {
    const testPixie = input => {
      expect(input).has.property('props')
      expect(input).has.property('nextProps')
      expect(input).has.property('waitFor')
      return (props: {}) => input.onOutput()
    }

    return new Promise((resolve, reject) => {
      const input = { onError: reject, onOutput: resolve }
      const instance = tamePixie(testPixie)(input)
      instance.update({})
    })
  })

  it('props getter stays up to date', function () {
    const log = makeAssertLog()
    let onEvent: (() => void) | void

    const testPixie = (input: PixieInput<{ x: number }>) => () => {
      if (!onEvent) onEvent = () => log(input.props)
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })

    instance.update({ x: 1 })
    instance.update({ x: 2 })
    if (onEvent) onEvent()
    log.assert(['{"x":2}'])

    instance.update({ x: 3 })
    if (onEvent) onEvent()
    log.assert(['{"x":3}'])
  })

  it('nextProps return props', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = (input: PixieInput<{ x: number }>) => () => {
      if (!onEvent) {
        onEvent = () => input.nextProps().then(p => log(p), e => log(e.name))
      }
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })

    instance.update({ x: 1 })
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.update({ x: 2 })
    instance.update({ x: 3 })
    await tinyTimeout()
    log.assert(['{"x":2}'])
  })

  it('nextProps rejects on destruction', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = (input: PixieInput<{ x: number }>) => () => {
      if (!onEvent) {
        onEvent = () => input.nextProps().then(p => log(p), e => log(e.name))
      }
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })

    instance.update({ x: 1 })
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.destroy()
    await tinyTimeout()
    log.assert(['PixieShutdownError'])
  })

  it('waitFor returns item', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = (input: PixieInput<{ x: number | void }>) => () => {
      if (!onEvent) {
        onEvent = () =>
          input.waitFor(props => props.x).then(p => log(p), e => log(e.name))
      }
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })

    instance.update({ x: void 0 })
    log.assert([])
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.update({ x: 2 })
    await tinyTimeout()
    instance.update({ x: 3 })
    await tinyTimeout()
    log.assert(['2']) // Promise resolved

    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert(['3'])
  })

  it('waitFor rejects on destruction', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = (input: PixieInput<{ x: number | void }>) => () => {
      if (!onEvent) {
        onEvent = () =>
          input.waitFor(props => props.x).then(p => log(p), e => log(e.name))
      }
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })

    instance.update({ x: void 0 })
    log.assert([])
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.destroy()
    await tinyTimeout()
    log.assert(['PixieShutdownError']) // Promise is resolved
  })

  it('waitFor throws user exceptions', async function () {
    const log = makeAssertLog()
    let onEvent: (() => mixed) | void

    const testPixie = (input: PixieInput<{ x: boolean }>) => () => {
      if (!onEvent) {
        onEvent = () =>
          input
            .waitFor(props => {
              if (props.x) throw new Error('Boom')
            })
            .then(p => log(p), e => log(String(e)))
      }
    }

    const instance = tamePixie(testPixie)({ onError, onOutput })

    instance.update({ x: false })
    log.assert([])
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.update({ x: true })
    await tinyTimeout()
    log.assert(['Error: Boom']) // Promise rejected
  })
})
