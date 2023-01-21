# redux-pixies

## 0.3.7 (2023-01-20)

- added: Provide TypeScript type definitions.

## 0.3.6

- Fix a bug where `mapPixies` wasn't removing the outputs for its destroyed children.

## 0.3.5

- Reject the `waitFor` promise if the condition function throws.
- Improve Flow types.
- Fix a failing unit test, and make tests mandatory for committing.

## 0.3.4

- Fix a condition where `waitFor` would miss updates.

## 0.3.3

- Fix the build to work on React Native

## 0.3.2

- Provide default output, so the output tree structure is intact even at startup.

## 0.3.1

- Fix an infinite loop in `mapPixie`

## 0.3.0

- Folded the `oneShotPixie` functionality into `tamePixie`, so all pixies can access their latest props without waiting for `update`.
- Added `isPixieShutdownError`, so pixies can determine if a `nextProps` or `waitFor` promise was rejected on shutdown.
- Improved flow typings.

## 0.2.0

- Complete re-write, which allows:
  - Props type-checking
  - Outputs passed between pixies
  - Fine-grained error handling
  - Fine-grained props handling
  - No more distinction between props and context
  - Subscribing to prop changes

Known issue: When nesting pixies using `combinePixies` or `mapPixies`,
the `props.output` will sometimes be `undefined` when starting up,
since the structural pixies haven't had a chance to output their maps yet.

## 0.1.0

- Initial experimental release
