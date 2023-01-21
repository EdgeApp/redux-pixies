export type OnError = (e: any) => void
export type OnOutput = (data: any) => void
export type UpdateFunction<P> = (props: P) => unknown
export type DestroyFunction = () => void

export type Condition<P, R> = (props: P) => R | undefined

export interface PixieInstance<P> {
  update: (props: P) => unknown
  destroy: () => void
}

export interface TamePixieInput {
  onError: OnError
  onOutput: OnOutput
}

export interface PixieInput<P> extends TamePixieInput {
  nextProps: () => Promise<P>
  readonly props: P
  waitFor: <R>(condition: Condition<P, R>) => Promise<R>
}

export type TamePixie<P> = (input: TamePixieInput) => PixieInstance<P>

export type WildPixie<P> = (
  input: PixieInput<P>
) => PixieInstance<P> | UpdateFunction<P>

/**
 * Class-style pixies should inherit from this type.
 */
export class Pixie<P> {
  props: P

  constructor(props: P, callbacks?: TamePixieInput)

  /**
   * Called every time the props change.
   */
  update(props: P, callbacks: TamePixieInput): Promise<any> | undefined

  /**
   * Called before the pixie is destroyed.
   * This is a great place to clean up any resources.
   */
  destroy(props: P, callbacks: TamePixieInput): void
}

export type PixieConstructor<P> = new (
  props: P,
  callbacks?: TamePixieInput
) => Pixie<P>

//
// Pixie enhancers
//

type ErrorHandler<P> = (e: any, props: P, onError: OnError) => void

export function catchPixieError<P extends {}>(
  pixie: WildPixie<P>,
  errorHandler?: ErrorHandler<P>
): TamePixie<P>

export function reflectPixieOutput<P extends {}>(
  pixie: WildPixie<P>
): TamePixie<P>

export function isPixieShutdownError(e: any): boolean

export function tamePixie<P>(pixie: WildPixie<P>): TamePixie<P>

//
// Pixie managers
//

interface ReduxStore<State, Dispatch> {
  getState: () => State
  dispatch: Dispatch
  subscribe: (callback: () => void) => () => void
}

export interface ReduxProps<State, Dispatch> {
  dispatch: Dispatch
  output: any
  state: State
}

export function attachPixie<State, Dispatch>(
  store: ReduxStore<State, Dispatch>,
  pixie: WildPixie<ReduxProps<State, Dispatch>>,
  onError?: OnError,
  onOutput?: OnOutput
): () => void

export function startPixie<P extends {}>(
  pixie: WildPixie<P>,
  onError?: OnError,
  onOutput?: OnOutput
): PixieInstance<P>

export function combinePixies<P>(pixieMap: {
  [id: string]: WildPixie<P>
}): TamePixie<P>

export function filterPixie<P, Q>(
  pixie: WildPixie<Q>,
  filter: (props: P) => Q | undefined
): TamePixie<P>

export function mapPixie<P, Q>(
  pixie: WildPixie<Q>,
  listIds: (props: P) => string[],
  filter: (props: P, id: string) => Q | undefined
): TamePixie<P>

export function tameClassPixie<P>(
  Constructor: PixieConstructor<P>
): TamePixie<P>

export const stopUpdates: Promise<void>
