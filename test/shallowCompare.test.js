import { assert } from 'chai'
import { describe, it } from 'mocha'

import { shallowCompare } from '../src/managers/util.js'

describe('shallow compare', function () {
  it('compares values', function () {
    const leaf = {}
    assert(!shallowCompare(1, 2))
    assert(!shallowCompare(1, '1'))
    assert(!shallowCompare(1, null))
    assert(!shallowCompare({ a: 1 }, {}))
    assert(!shallowCompare({}, { a: 1 }))
    assert(!shallowCompare({ a: 1 }, { a: 2 }))
    assert(!shallowCompare({ a: {} }, { a: {} }))
    assert(!shallowCompare([1, 2], [1]))
    assert(!shallowCompare([1, 2], [1, '2']))

    assert(shallowCompare(1, 1))
    assert(shallowCompare({ a: leaf }, { a: leaf }))
    assert(shallowCompare([1, 2], [1, 2]))
    assert(shallowCompare(new Date(20), new Date(20)))
  })
})
