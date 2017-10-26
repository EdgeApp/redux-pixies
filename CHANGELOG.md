# redux-pixies

## 0.3.3

* Fix the build to work on React Native

## 0.3.2

* Provide default output, so the output tree structure is intact even at startup.

## 0.3.1

* Fix an infinite loop in `mapPixie`

## 0.3.0

* Folded the `oneShotPixie` functionality into `tamePixie`, so all pixies can access their latest props without waiting for `update`.
* Added `isPixieShutdownError`, so pixies can determine if a `nextProps` or `waitFor` promise was rejected on shutdown.
* Improved flow typings.

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
