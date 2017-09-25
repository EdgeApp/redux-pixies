# redux-pixies

## 0.2.0

* Complete re-write, which allows:
  * Props type-checking
  * Outputs passed between pixies
  * Fine-grained error handling
  * Fine-grained props handling
  * No more distinction between props and context
  * Subscribing to prop changes

Known issue: When nesting pixies using `combinePixies` or `mapPixies`,
the `props.output` will sometimes be `undefined` when starting up,
since the structural pixies haven't had a chance to output their maps yet.

## 0.1.0

* Initial experimental release
