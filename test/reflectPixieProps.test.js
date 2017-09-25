// @flow
import { reflectPixieProps } from '../src/index.js'
import type { ReflectedProps } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'
import { expect } from 'chai'
import { describe, it } from 'mocha'

describe('reflectPixieProps', function () {
  it('adds function properties', async function () {
    const testPixie = () => (props: {}) => {
      expect(props).has.property('getProps')
      expect(props).has.property('nextProps')
      expect(props).has.property('pauseUntil')
    }

    reflectPixieProps(testPixie)(() => {}, () => {})
  })

  it('getProps', function () {
    const log = makeAssertLog()
    let onEvent: (() => void) | void

    const testPixie = () => (props: ReflectedProps<{ x: number }>) => {
      if (!onEvent) onEvent = () => log(props, props.getProps())
    }

    const instance = reflectPixieProps(testPixie)(() => {}, () => {})
    instance.update({ x: 1 })
    instance.update({ x: 2 })
    instance.update({ x: 3 })
    if (onEvent) onEvent()
    log.assert(['{"x":1} {"x":3}'])
  })

  it('nextProps return props', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = () => (props: ReflectedProps<{ x: number }>) => {
      if (!onEvent) {
        onEvent = () => props.nextProps().then(p => log(p), e => log(e.name))
      }
    }

    const instance = reflectPixieProps(testPixie)(() => {}, () => {})
    instance.update({ x: 1 })
    if (onEvent) onEvent()
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert([])
    instance.update({ x: 2 })
    instance.update({ x: 3 })
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert(['{"x":2}'])
  })

  it('nextProps rejects on destruction', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = () => (props: ReflectedProps<{ x: number }>) => {
      if (!onEvent) {
        onEvent = () => props.nextProps().then(p => log(p), e => log(e.name))
      }
    }

    const instance = reflectPixieProps(testPixie)(() => {}, () => {})
    instance.update({ x: 1 })
    if (onEvent) onEvent()
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert([])
    instance.destroy()
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert(['Error'])
  })

  it('pauseUntil returns item', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = () => (props: ReflectedProps<{ x: number }>) => {
      if (!onEvent) {
        onEvent = () =>
          props.pauseUntil(props => props.x).then(p => log(p), e => log(e.name))
      }
    }

    const instance = reflectPixieProps(testPixie)(() => {}, () => {})
    instance.update({ x: 0 })
    if (onEvent) onEvent()
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert([])
    instance.update({ x: 0 })
    instance.update({ x: 3 })
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert(['3'])
  })

  it('pauseUntil rejects on destruction', async function () {
    const log = makeAssertLog()
    let onEvent: (() => any) | void

    const testPixie = () => (props: ReflectedProps<{ x: number }>) => {
      if (!onEvent) {
        onEvent = () =>
          props.pauseUntil(props => props.x).then(p => log(p), e => log(e.name))
      }
    }

    const instance = reflectPixieProps(testPixie)(() => {}, () => {})
    instance.update({ x: 0 })
    if (onEvent) onEvent()
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert([])
    instance.destroy()
    await new Promise(resolve => setTimeout(resolve, 1))
    log.assert(['Error'])
  })
})
