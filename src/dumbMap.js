// @flow

/**
 * A very minimalistic ES6 `Map` ponyfill.
 */
export class DumbMap<K, V> {
  table: Array<{ key: K, value: V }>

  constructor () {
    this.table = []
  }

  set (key: K, value: V) {
    this.table.push({ key, value })
  }

  get (key: K): V | void {
    for (let i = 0; i < this.table.length; ++i) {
      if (this.table[i].key === key) return this.table[i].value
    }
  }
}
