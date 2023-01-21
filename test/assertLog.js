// @flow

import { assert as chaiAssert } from 'chai'

function stringify(...args: mixed[]) {
  return args
    .map(arg => {
      if (arg == null) return typeof arg
      if (typeof arg !== 'object') return (arg: any).toString()
      return JSON.stringify(arg)
    })
    .join(' ')
}

/**
 * Asserts that the correct events have occurred.
 * Used for testing callbacks.
 */
export function makeAssertLog(sort: boolean = false, verbose: boolean = false) {
  let events: string[] = []

  const out = function log(...args: mixed[]) {
    const event = stringify(...args)
    if (verbose) console.log(event)
    events.push(event)
  }

  out.assert = function assert(expected: string[]) {
    sort
      ? chaiAssert.deepEqual(events.sort(), expected.sort())
      : chaiAssert.deepEqual(events, expected)
    events = []
  }

  return out
}
