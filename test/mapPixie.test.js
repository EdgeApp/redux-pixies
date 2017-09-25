// @flow
import { mapPixie } from '../src/index.js'
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
    const instance = mappedPixie(() => {}, () => {})

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
})
