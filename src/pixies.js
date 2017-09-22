// @flow
import { shallowCompare } from './compare.js'
import { DumbMap } from './dumbMap.js'
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
export class Pixie<P> {
  props: P

  constructor (props: P) {
    this.props = props
  }

  /**
   * Called every time the props change.
   */
  update (props: P): Promise<any> | void {}

  /**
   * Called before the pixie is destroyed.
   * This is a great place to clean up any resources.
   */
  destructor (props: P) {}

  /**
   * Reconfigures the Pixie's children,
   * starting, stopping, and updating them as needed.
   */
  updateChildren (children: PixieChildren) {
    updateChildren(
      this._internalPixieNode,
      Array.isArray(children) ? children : [children]
    )
  }

  _internalPixieNode: PixieNode<P>
}

interface PixieNode<P> {
  PixieType: Function,
  props: P,

  // Instance management:
  children: Array<PixieNode<any> | void>,
  parent?: PixieNode<any>,
  instance?: Pixie<P>,
  updating?: boolean,
  clean?: boolean
}

/**
 * Diffs the a pixie's children, starting or stopping them as needed.
 */
function updateChildren (
  pixieNode: PixieNode<any>,
  children: Array<PixieChild<any>>
) {
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
      if (!shallowCompare(pixieNode.props, props)) pixieNode.clean = false
      pixieNode.PixieType = PixieType
      pixieNode.props = props
      oldChildren[oldIndex] = void 0
    } else {
      // If nothing matched, just make a new node:
      newChildren.push({
        PixieType,
        props,
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
      const { PixieType, props } = pixieNode
      pixieNode.instance =
        PixieType.prototype instanceof Pixie
          ? new PixieType(props)
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
  if (pixieNode.instance && !pixieNode.clean && !pixieNode.updating) {
    const { props, instance } = pixieNode

    pixieNode.updating = true
    instance.props = props
    try {
      const onDone = () => {
        pixieNode.updating = false
        pixieNode.clean = true
        updatePixie(pixieNode)
      }

      const thenable = instance.update(props)
      if (thenable && typeof thenable.then === 'function') {
        thenable.then(onDone, e => pixieError(pixieNode, e))
      } else {
        onDone()
      }
    } catch (e) {
      pixieError(pixieNode, e)
    }
  }
}

/**
 * Destroys a pixie node instance.
 * It is safe to call this on any pixieNode,
 * including pixieNodes that have already been destroyed.
 */
function destroyPixie (pixieNode: PixieNode<any>) {
  for (const child of pixieNode.children) {
    if (child) destroyPixie(child)
  }
  pixieNode.children = []

  const { instance, props } = pixieNode
  if (instance) {
    try {
      pixieNode.instance = void 0
      instance.destructor(props)
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

export interface PixieTree<P> {
  setProps(props: P): void,
  destroy(): void
}

export function startPixie<P> (pixieChild: PixieChild<P>): PixieTree<P> {
  const { PixieType, props } = pixieChild
  const pixieNode: PixieNode<any> = { PixieType, props, children: [] }
  activatePixie(pixieNode)

  return {
    setProps (props: P) {
      if (!shallowCompare(pixieNode.props, props)) pixieNode.clean = false
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
  const instance = startPixie({ PixieType, props: store.getState() })

  const unsubscribe = store.subscribe(() => {
    instance.setProps(store.getState())
  })

  return () => {
    unsubscribe()
    instance.destroy()
  }
}
