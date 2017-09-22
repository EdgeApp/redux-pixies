// @flow

// These callbacks are passed to every pixie:
export interface PixieCallbacks {
  +onError: (e: any) => void,
  +onOutput: (data: any) => void
}

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
  update (props: P, callbacks: PixieCallbacks): Promise<any> | void {}

  /**
   * Called before the pixie is destroyed.
   * This is a great place to clean up any resources.
   */
  destructor (props: P, callbacks: PixieCallbacks) {}
}

/**
 * Internal data structure used to manage a running pixie:
 */
export interface PixieNode<P> {
  PixieType: Function,
  callbacks: PixieCallbacks,
  props: P,

  // State management:
  instance?: Pixie<P>,
  updating?: boolean,
  clean?: boolean
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
    const { PixieType, callbacks, props } = pixieNode
    try {
      pixieNode.instance =
        PixieType.prototype instanceof Pixie
          ? new PixieType(props, callbacks)
          : wrapFunctionalPixie(PixieType)
    } catch (e) {
      callbacks.onError(e)
    }
  }

  updatePixie(pixieNode)
}

/**
 * Applies props to a pixie.
 */
function updatePixie (pixieNode: PixieNode<any>) {
  if (pixieNode.instance && !pixieNode.clean && !pixieNode.updating) {
    const { instance, callbacks, props } = pixieNode

    pixieNode.updating = true
    instance.props = props
    try {
      const onDone = () => {
        pixieNode.updating = false
        pixieNode.clean = true
        updatePixie(pixieNode)
      }

      const thenable = instance.update(props, callbacks)
      if (thenable && typeof thenable.then === 'function') {
        thenable.then(onDone, e => callbacks.onError(e))
      } else {
        onDone()
      }
    } catch (e) {
      callbacks.onError(e)
    }
  }
}

/**
 * Sets up the props on a pixie.
 */
export function setPixieProps (pixieNode: PixieNode<any>, props: any) {
  pixieNode.clean = false
  pixieNode.props = props
  activatePixie(pixieNode)
}

/**
 * Destroys a pixie node instance.
 * It is safe to call this on any pixieNode,
 * including pixieNodes that have already been destroyed.
 */
export function destroyPixie (pixieNode: PixieNode<any>) {
  const { instance, callbacks, props } = pixieNode
  if (instance) {
    try {
      pixieNode.instance = void 0
      instance.destructor(props, callbacks)
    } catch (e) {
      callbacks.onError(e)
    }
  }
}
