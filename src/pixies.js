// @flow
import { shallowCompare } from './compare.js'
import type { Store } from 'redux'

/**
 * Describes a child pixie.
 * This is not something you make yourself; use `createPixie` instead.
 */
export interface PixieChild<P> {
  PixieType: Function,
  props: P
}

/**
 * This function works roughly like React's `createElement`.
 * Pixies should use this to describe the pixies passed to `updateChildren`.
 * The `updateChildren` method will compare the new child list with
 * the old child list, starting, stopping, and updating children as needed.
 *
 * @param {Function} PixieType A pixie constructor, or a pure pixie function.
 * @param {*} props Props to pass to the child.
 */
export function createPixie<P> (PixieType: Function, props: P): PixieChild<P> {
  return { PixieType, props }
}

/**
 * To create child pixies, call `this.updateChildren` with either of these.
 */
type PixieChildren = PixieChild<any> | Array<PixieChild<any>>

/**
 * Class-style pixies should inherit from this type.
 */
export class Pixie<P, C = any> {
  props: P
  context: C

  /* eslint-disable no-useless-constructor */
  constructor (props: P, context: C) {
    this.props = props
    this.context = context
  }

  /**
   * Called every time the props change.
   * @param {*} props Information passed in from the parent worker.
   */
  update (props: P, context: C): Promise<any> | void {}

  /**
   * Called before the worker is destroyed.
   * This is a great place to clean up any resources.
   */
  destructor (props: P, context: C) {}

  /**
   * Reconfigures the Pixie's children,
   * starting, stopping, and updating them as needed.
   */
  updateChildren (children: PixieChildren, context?: C) {
    updateChildren(
      this._internalPixieNode,
      Array.isArray(children) ? children : [children],
      context
    )
  }

  _internalPixieNode: PixieNode<P, C>
}

interface PixieNode<P, C = any> {
  PixieType: Function,
  props: P,
  context: C,

  // Instance management:
  children: Array<PixieNode<any> | void>,
  parent?: PixieNode<any>,
  instance?: Pixie<P>,
  updating?: boolean,
  updated?: boolean
}

/**
 * Diffs the a pixie's children, starting or stopping them as needed.
 */
function updateChildren (
  pixieNode: PixieNode<any>,
  children: Array<PixieChild<any>>,
  context: any
) {
  if (!context) context = pixieNode.context
  const oldChildren = pixieNode.children

  // First, index the existing children for faster lookup:
  const keyMap: { [key: string]: number } = {}
  const typeMap: DumbMap<Function, number> = new DumbMap()
  for (let i = 0; i < oldChildren.length; ++i) {
    if (oldChildren[i]) {
      const { PixieType, props } = oldChildren[i]

      if (props && props.key != null) {
        keyMap[props.key] = i
      } else {
        typeMap.set(PixieType, i)
      }
    }
  }

  // Now diff the new children with the old children:
  const newChildren: Array<PixieNode<any> | void> = []
  for (const child of children) {
    if (typeof child === 'boolean' || child == null) continue
    const { PixieType, props } = child

    // Try to match an existing node:
    let oldIndex: number | void
    if (props && props.key != null) {
      oldIndex = keyMap[props.key]
    } else {
      oldIndex = typeMap.get(PixieType)
    }

    if (oldIndex != null) {
      const pixieNode = oldChildren[oldIndex]

      // If we find a node that's already claimed, then we have a problem:
      if (!pixieNode) {
        const message =
          props && props.key != null
            ? `Two pixies both have the same key, "${props.key}".`
            : 'If two child pixies have the same type, they must have unique `key` properties.'
        throw new Error(message)
      }

      // Claim the node for our own use:
      newChildren.push(pixieNode)
      if (pixieNode.PixieType !== PixieType) destroyPixie(pixieNode)
      if (!shallowCompare(pixieNode.props, props)) pixieNode.updated = false
      pixieNode.PixieType = PixieType
      pixieNode.props = props
      oldChildren[oldIndex] = void 0
    } else {
      // If nothing matched, just make a new node:
      newChildren.push({
        PixieType,
        props,
        context,
        parent: pixieNode,
        children: []
      })
    }
  }

  // Destroy the old children:
  for (const child of oldChildren) {
    if (child) destroyPixie(child)
  }

  // Activate the new children:
  pixieNode.children = newChildren
  for (const child of newChildren) {
    if (child) activatePixie(child)
  }
}

/**
 * Turns a pixie update function into a pixie class instance.
 */
function wrapFunctionalPixie (PixieType: Function) {
  return Object.create(Pixie.prototype, {
    update: { value: PixieType }
  })
}

/**
 * Create a new pixie from scratch, or update its existing instance.
 */
function activatePixie (pixieNode: PixieNode<any>) {
  if (!pixieNode.instance) {
    try {
      const { PixieType, props, context } = pixieNode
      pixieNode.instance =
        PixieType.prototype instanceof Pixie
          ? new PixieType(props, context)
          : wrapFunctionalPixie(PixieType)

      pixieNode.instance._internalPixieNode = pixieNode
    } catch (e) {
      pixieError(pixieNode, e)
    }
  }

  updatePixie(pixieNode)
}

/**
 * Applies props to a pixie.
 */
function updatePixie (pixieNode: PixieNode<any>) {
  if (pixieNode.instance && !pixieNode.updating && !pixieNode.updated) {
    const { props, context, instance } = pixieNode

    pixieNode.updating = true
    instance.props = props
    instance.context = context
    try {
      const thenable = instance.update(props, context)
      if (thenable && typeof thenable.then === 'function') {
        thenable.then(
          success => {
            pixieNode.updating = false
            pixieNode.updated = true
            updatePixie(pixieNode)
            return void 0
          },
          e => pixieError(pixieNode, e)
        )
      } else {
        pixieNode.updating = false
        pixieNode.updated = true
      }
    } catch (e) {
      pixieError(pixieNode, e)
    }
  }
}

/**
 * Destroys a pixie node instance.
 */
function destroyPixie (pixieNode: PixieNode<any>) {
  for (const child of pixieNode.children) {
    if (child) destroyPixie(child)
  }
  pixieNode.children = []

  const { instance, props, context } = pixieNode
  if (instance) {
    try {
      pixieNode.instance = void 0
      instance.destructor(props, context)
    } catch (e) {
      pixieError(pixieNode, e)
    }
  }
}

/**
 * Called when a pixie throws an exception.
 */
function pixieError (pixieNode: PixieNode<any>, e: any) {
  destroyPixie(pixieNode)

  const { props, parent } = pixieNode
  if (props && typeof props.catch === 'function') {
    try {
      props.catch(e)
    } catch (e) {
      if (parent) pixieError(parent, e)
    }
  } else {
    if (parent) pixieError(parent, e)
  }
}

/**
 * A very minimalistic ES6 `Map` ponyfill.
 */
class DumbMap<K, V> {
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

export interface PixieTree<P> {
  setProps(props: P): void,
  destroy(): void
}

export function startPixie<P, C> (
  pixieChild: PixieChild<P>,
  context: C
): PixieTree<P> {
  const { PixieType, props } = pixieChild
  const pixieNode: PixieNode<any> = { PixieType, props, context, children: [] }
  activatePixie(pixieNode)

  return {
    setProps (props: P) {
      if (!shallowCompare(pixieNode.props, props)) pixieNode.updated = false
      pixieNode.props = props
      return updatePixie(pixieNode)
    },

    destroy () {
      return destroyPixie(pixieNode)
    }
  }
}

/**
 * Attaches a pixie to a Redux store.
 * The pixie will recieve `dispatch` in its `context`,
 * and the current store state as its `props`.
 *
 * @param {*} PixieType A pixie constructor or update function.
 * @param {*} store A redux store.
 * @return An unsubscribe function.
 */
export function attachPixie (PixieType: Function, store: Store<any, any>) {
  const context = { dispatch: store.dispatch }
  const instance = startPixie({ PixieType, props: store.getState() }, context)

  const unsubscribe = store.subscribe(() => {
    instance.setProps(store.getState())
  })

  return () => {
    unsubscribe()
    instance.destroy()
  }
}
