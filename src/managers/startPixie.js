// @flow

import { catchPixieError } from '../enhancers/catchPixieError.js'
import { reflectPixieOutput } from '../enhancers/reflectPixieOutput.js'
import type { OnError, OnOutput, PixieInstance, WildPixie } from '../types.js'

function defaultOnError(e: any) {}
function defaultOnOutput(data: any) {}

/**
 * Instantiates a pixie object.
 */
export function startPixie<P: {}>(
  pixie: WildPixie<P>,
  onError: OnError = defaultOnError,
  onOutput: OnOutput = defaultOnOutput
): PixieInstance<P> {
  return catchPixieError(reflectPixieOutput(pixie))({ onError, onOutput })
}
