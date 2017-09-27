// @flow
import { oneShotPixie, startPixie } from '../src/redux-pixies.js'
import type { PropsWrapper } from '../src/redux-pixies.js'
import { makeAssertLog } from './assertLog.js'
import { expect } from 'chai'
import { describe, it } from 'mocha'

function tinyTimeout () {
  return new Promise(resolve => setTimeout(resolve, 1))
}

describe('oneShotPixie', function () {
  it('adds function properties', async function () {
    const testPixie = () => (props: {}) => {
      expect(props).has.property('getProps')
      expect(props).has.property('nextProps')
      expect(props).has.property('waitFor')
    }

    oneShotPixie(testPixie)(() => {}, () => {})
  })

  it('adds function properties', async function () {
    const log = makeAssertLog()
    const testPixie = () => (props: {}) => log('called')
    const instance = startPixie(oneShotPixie(testPixie))
    instance.update({})
    instance.update({})
    instance.destroy()
    log.assert(['called'])
  })

  it('getProps', function () {
    const log = makeAssertLog()
    let onEvent: (() => void) | void

    const testPixie = () => (wrapper: PropsWrapper<{ x: number }>) => {
      if (!onEvent) onEvent = () => log(wrapper.getProps())
    }

    const instance = oneShotPixie(testPixie)(() => {}, () => {})

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

    const testPixie = () => (props: PropsWrapper<{ x: number }>) => {
      if (!onEvent) {
        onEvent = () => props.nextProps().then(p => log(p), e => log(e.name))
      }
    }

    const instance = oneShotPixie(testPixie)(() => {}, () => {})

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

    const testPixie = () => (props: PropsWrapper<{ x: number }>) => {
      if (!onEvent) {
        onEvent = () => props.nextProps().then(p => log(p), e => log(e.name))
      }
    }

    const instance = oneShotPixie(testPixie)(() => {}, () => {})

    instance.update({ x: 1 })
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.destroy()
    await tinyTimeout()
    log.assert(['Error'])
  })

  it('waitFor returns item', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = () => (props: PropsWrapper<{ x: number | void }>) => {
      if (!onEvent) {
        onEvent = () =>
          props.waitFor(props => props.x).then(p => log(p), e => log(e.name))
      }
    }

    const instance = oneShotPixie(testPixie)(() => {}, () => {})

    instance.update({ x: void 0 })
    log.assert([])
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.update({ x: 2 })
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

    const testPixie = () => (props: PropsWrapper<{ x: number | void }>) => {
      if (!onEvent) {
        onEvent = () =>
          props.waitFor(props => props.x).then(p => log(p), e => log(e.name))
      }
    }

    const instance = oneShotPixie(testPixie)(() => {}, () => {})

    instance.update({ x: void 0 })
    log.assert([])
    if (onEvent) onEvent()
    await tinyTimeout()
    log.assert([]) // Promise is still waiting

    instance.destroy()
    await tinyTimeout()
    log.assert(['Error']) // Promise is resolved
  })
})
