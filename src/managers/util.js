// @flow
import type { OnError } from '../redux-pixies.js'

/**
 * If the function throws, send that through `onError`.
 */
export function catchify<R> (
  f: (...args: any) => R,
  onError: OnError
): (...args: any) => R | void {
  return (...args: any) => {
    try {
      return f(...args)
    } catch (e) {
      onError(e)
    }
  }
}

/**
 * Returns true if two Javascript values are equal (non-recursively).
 */
export function shallowCompare<A, B> (a: A, b: B): boolean {
  if (a === b) return true

  // Fast path for primitives:
  if (typeof a !== 'object') return false
  if (typeof b !== 'object') return false

  // Filter out `null`:
  if (!a || !b) return false

  const keys = Object.getOwnPropertyNames(a)
  if (keys.length !== Object.getOwnPropertyNames(b).length) return false

  // We know that both objects have the same number of properties,
  // so if every property in `a` has a matching property in `b`,
  // the objects must be identical, regardless of key order.
  for (const key: string of keys) {
    if (!b.hasOwnProperty(key) || a[key] !== b[key]) return false
  }
  return true
}
