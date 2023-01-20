// @flow
import { mapPixie, startPixie } from '../src/index.js'
import { makeAssertLog } from './assertLog.js'
import { describe, it } from 'mocha'

describe('mapPixie', function () {
  it('basic operation', function () {
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

    const mappedPixie = mapPixie(
      testPixie,
      (props: { ids: Array<string> }) => props.ids,
      (props: { ids: Array<string> }, id: string) => {
        if (id > '2') return { id }
      }
    )
    const instance = startPixie(mappedPixie)

    instance.update({ ids: ['0'] })
    log.assert([])

    instance.update({ ids: ['0', '4'] })
    log.assert(['create', 'update {"id":"4"}'])

    instance.update({ ids: ['0,', '4', '5'] })
    log.assert(['create', 'update {"id":"5"}'])

    instance.update({ ids: ['0,', '5', '6'] })
    log.assert(['create', 'update {"id":"6"}', 'destroy'])

    instance.update({ ids: ['6'] })
    log.assert(['destroy'])

    instance.destroy()
    log.assert(['destroy'])
  })

  it('handles output', function () {
    const log = makeAssertLog()

    const testPixie = ({ onOutput }) => {
      log('create')
      let first = true
      return {
        update ({ id }) {
          if (first) {
            first = false
            onOutput('output ' + id)
          }
          log('update ' + id)
        },
        destroy () {
          log('destroy')
        }
      }
    }

    const mappedPixie = mapPixie(
      testPixie,
      (props: { ids: Array<string> }) => props.ids,
      (props: { ids: Array<string> }, id: string) => ({ id })
    )
    const instance = startPixie(mappedPixie, () => {}, log)

    instance.update({ ids: ['a'] })
    log.assert(['create', 'update a', '{"a":"output a"}'])

    instance.update({ ids: ['a', 'b'] })
    log.assert(['create', 'update b', '{"a":"output a","b":"output b"}'])

    instance.update({ ids: ['b'] })
    log.assert(['destroy', '{"b":"output b"}'])

    instance.destroy()
    log.assert(['destroy'])
  })
})
