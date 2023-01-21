// @flow

export type OnError = (e: any) => void
export type OnOutput = (data: any) => void
export type UpdateFunction<P> = (props: P) => any
export type DestroyFunction = () => void

export type Condition<P, R> = (props: P) => R | void

export type PixieInstance<P> = {
  update(props: P): any,
  destroy(): void
}

export type TamePixieInput = {
  onError: OnError,
  onOutput: OnOutput
}

export type TamePixie<P> = (input: TamePixieInput) => PixieInstance<P>

export type PixieInput<P> = TamePixieInput & {
  nextProps(): Promise<P>,
  +props: P,
  waitFor<R>(condition: Condition<P, R>): Promise<R>
}

export type WildPixie<P> = (
  input: PixieInput<P>
) => PixieInstance<P> | UpdateFunction<P>
