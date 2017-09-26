# Redux Pixies

> The magical Redux side-effects library

[![npm downloads](https://img.shields.io/npm/dm/redux-pixies.svg?style=flat-square)](https://www.npmjs.com/package/redux-pixies)

# Table of contents
1. [Introduction](#introduction)
2. [Example](#example)
3. [Writing Pixies](#writing-pixies)
4. [Managing pixies](#managing-pixies)
5. [Testing pixies](#testing-pixies)
6. [Pixie enhancers](#pixie-enhancers)
7. [Functional Purity](#functional-purity)

<a name="introduction"></a>
## Introduction
Pixies are little processes that run in the background, monitoring your Redux store and handling asynchronous side-effects. Pixies are a lot like React components, but instead of managing the DOM, pixies manage everything else.

Pixies are state-based, rather than action-based. A pixie's job is to compare the state of the Redux store with the real world and fix anything that is out of sync. For example, a pixie might notice when the user is on a search page but has no search results, so it fetches results from the server in response. If the user leaves the search page before the results come in, the pixie can notice that too and cancel the request.

This is much easier than action-based side-effect approaches like [redux-thunk](https://github.com/gaearon/redux-thunk) or [redux-saga](https://github.com/redux-saga/redux-saga). In the example above, no matter what Redux actions cause the user to enter the search page, the pixie will always notice the missing results and perform the fetch. With the traditional approach, the programmer must manually wire side effects into any action that might enter or leave the search page. This is a lot more work, and far more error-prone.

<a name="example"></a>
## Example

```js
import { attachPixie } from './pixies.js'

const searchPixie = () => async (props) => {
  // If the user is on the search page, but has no search results,
  // go ahead and fetch those:
  if (props.state.onSearchPage && !props.state.hasSearchResults) {
    const results = await fetchSearchResults(props.state.searchTerm)
    props.dispatch({ type: 'SEARCH_FETCHED', payload: results })
  }
}

// Attach the pixie to the Redux store, causing it to run each time
// the state changes (unless the pixie is already doing a fetch):
const destroy = attachPixie(redux, searchPixie)
```

<a name="writing-pixies"></a>
## Writing Pixies

A pixie is just a function that returns an `update` function and a `destroy` function:

```js
function examplePixie (onError, onOutput) {
  return {
    update (props) {},
    destroy () {}
  }
}
```

The `update` function receives `props`, which change along with the app's state. The pixie's job is to examine the `props` and perform any work that needs to happen in response. If this function returns a promise, the runtime will wait for the promise to resolve before calling `update` again. This ensures that pixie won't accidentally start the same work twice.

Pixies can be destroyed at any time, even while their async `update` function is still running. The pixie can use the `destroy` function to free resources or to cancel any work that `update` is doing.

If the `destroy` function isn't needed, the pixie can just return the `update` function directly. Combined with ES2015 arrow functions, this allows pixies to be very compact:

```js
const examplePixie = (onError, onOutput) => props => {
  // Do the update here...
}
```

### Reporting errors

If a pixie encounters an error, it should call `onError`. Pixies can call this function at any time, including from within timers and event handlers. If a pixie function throws an exception, or if `update` returns a rejected promise, that error will be captured and passed along to `onError` too.

Calling `onError` shuts down the pixie, calling its `destroy` method and preventing it from receiving further `update` calls. The next time the props change, a new pixie will be created in the destroyed pixie's place. If a pixie does not want this behavior, it should handle the error gracefully itself instead of calling `onError`.

### Sharing data

Sometimes pixies create resources that they would like to share with others. For example, one pixie might maintain a WebGL context that several other pixies might need to draw on.

To do this, a pixie can call `onOutput` at any time to share some data. The latest value passed to `onOutput` becomes the pixie's output, and other pixies can see it via the `props.output` structure.

<a name="managing-pixies"></a>
## Managing pixies

### Starting pixies

To actually use a pixie, attach it to a Redux store using `attachPixie`. This function accepts a Redux store as its first parameter and a pixie as its second parameter:

```js
const destroy = attachPixie(reduxStore, pixieFunction)
```

Now the pixie's `update` function will be called every time the Redux store changes. The pixie will receive a `props` object with `state` and `dispatch` taken from the Redux store.

The `attachPixie` function returns a `destroy` function, which destroys the pixie and disconnects it from the Redux store.

For extra control, you can optionally pass your own `onError` and `onOutput` callbacks to `attachPixie`:

```js
const destroy = attachPixie(
  reduxStore,
  pixie,
  error => console.error('Pixie error:', error),
  output => console.info('Pixie output:', output)
)
```

### Customizing props

The `redux-pixies` library provides a `wrapPixie` function, which makes it possible to customize the props going into a pixie:

```js
const FilteredPixie = wrapPixie(
  subsystemPixie,
  props => ({ login: props.output.login })
})
```

In this example, the subsystem pixie receives just the `login` object from the outside world; the other props are filtered out. This is useful for making pixies more stand-alone, either for easier unit-testing or for code reuse.

If the props are undefined, `wrapPixie` will shut down the inner pixie. Once the props exist again, `wrapPixie` will restart the pixie. This provides a declarative way to control a pixie's lifetime.

### Combining pixies

The `redux-pixies` library provides a `combinePixies` function. This function works a lot like the `combineReducers` function from Redux. It accepts an object where the keys are the names of each pixie, and the values are the pixie functions.

```js
const appPixie = combinePixies({
  search: searchPixie,
  login: loginPixie
})
```

The props passed into the combined pixie will be passed along to the child pixies unchanged.

If any of the child pixies produce output, it will be available in `props.output` under the pixie's name. So, if the login pixie in this example calls `onOutput`, the search pixie can see that data as `props.output.login`.

### Replicating pixies

For managing lists of things, `redux-pixies` provides a `mapPixie` function. This function creates a pixie for each item in a list of id's. As the list changes, this function will automatically start and stop pixies in response, so every id has its own pixie.

```js
const chatListPixie = mapPixie(
  chatPixie,

  // Grabs the id list from the props:
  props => props.state.activeChatIds,

  // Each item pixie receives its own custom props:
  (props, id) => ({ ...props, id, avatar: props.state.avatars[id] })
)
```

<a name="testing-pixies"></a>
## Testing pixies

Since pixies are directly responsible for talking to the outside world, the best way to test them is using mocks. To do this, write your pixies to only use IO resources passed in through `props`. For example, the following code passes the browser's `fetch` function into a pixie:

```js
const injectedPixie = wrapPixie(
  serverFetchPixie,
  props => { ...props, fetch: window.fetch }
)
```

Now, when the time comes to unit-test this code, just pass a [mock `fetch` function](http://www.wheresrhys.co.uk/fetch-mock/) into the props instead:

```js
const testablePixie = wrapPixie(
  serverFetchPixie,
  props => ({ ...props, fetch: fetchMock })
)
```

<a name="pixie-enhancers"></a>
## Pixie enhancers

Since pixies are just functions that returns other functions, there is nothing preventing you from calling them directly yourself. Although this will produce a working pixie instance, many features will be missing.

To get these features back, `redux-pixies` provides several pixie enhancer functions. You can use these to get better control over error handling or output, or you can use them to bypass `attachPixie` while still maintaining full functionality:

```js
const enhancedPixie = reflectPixieOutput(catchPixieError(innerPixie))

const instance = enhancedPixie(onError, onOutput)
instance.update(someProps)
instance.destroy()
```

If the inner pixie in this example throws any exceptions, they will all flow out through `onError`. The `onError` callback, in turn, will shut down the inner pixie cleanly. The `props.output` property will update properly, and the inner pixie's `update` function will only run once the previous call has finished, no matter how many times the outer code calls `instance.update`. None of these things would happen without the `reflectPixieOutput` or `catchPixieError` enhancers.

### Adding `output` to `props`

To intercept a pixie's `onOutput` callback, making the output available to the pixie as `props.output`, pass the pixie through the `reflectPixieOutput` function. You can use this enhancer at any point in your pixie tree to limit the scope of which output is visible to which pixies.

The `attachPixie` function automatically applies this function to its input, which is why `props.output` is available to all pixies by default.

### Catching pixie errors

To intercept a pixie's `onError` callback, pass the pixie through the `catchPixieError` function. This will shut down the child pixie and give you a chance to handle the error. The next time the props change, `catchPixieError` will create a new pixie in the destroyed pixie's place:

```js
const safePixie = catchPixieErrors(
  subsystemPixie,

  // Called whenever there is an error:
  (error, props) => props.dispatch({
    type: SUBSYSTEM_FAILED,
    payload: error,
    error: true
  })
)
```

The `attachPixie` function automatically applies this function to its input, so the entire pixie tree will shut down by default if any pixie calls `onError`. Using this enhancer throughout your tree of pixies can limit a failed pixie's destruction to just the affected subsystem.

### Subscribing to props changes

If you pass a pixie through the `reflectPixieProps` enhancer, it will recieve several new functions:

* `props.getProps()` - Returns the latest props.
* `props.nextProps()` - Returns a promise that resolves when the props change, or rejects when the pixie is destroyed.
* `props.pauseUntil(props => condition)` - Returns a promise that resolves when the provided condition is true, or rejects when the pixie is destroyed.

This sort of thing is especially useful in detached situations like event handlers, which want access to the latest props, but aren't directly tied to the `update` function:

```js
patientPixie = reflectPixieProps(() => props => {
  someLibrary.onEvent = () => {
    // The original `props` is a frozen in time from when this callback
    // was created, so use `getProps` to get the latest props:
    const freshProps = props.getProps()
    doSomething(freshProps)
  }
})
```

### Wild vs. Tame Pixies

There are actually two types of pixies - wild pixies and tame pixies. A wild pixie is the kind you write directly. It has the following behaviors and expectations:

* The pixie can either return an object with `update` and `destroy` functions, or a bare `update` function.
* If `update` returns a promise, it will not be called again until the promise resolves.
* Any pixie function can throw an exception, and they will all be captured and passed to `onError`.

A tame pixie, on the other hand, has the following behaviors and expectations:

* The pixie will always return an object with `update` and `destroy` functions.
* Pixie functions will never throw exceptions or return promises.

Wild pixies are obviously a lot easier to create, while tame pixies are a lot easier to use. To turn a wild pixie into a tame pixie, pass it through the `tamePixie` function. All the functions in this library automatically call `tamePixie` on their inputs, so this is not something you would normally do yourself.

To make things run smoothly, pixies must follow some rules. These apply to both tame and wild pixies:

* The `update` function must never call itself recursively. If `update` calls `onOutput`, which changes the props, `update` must not be called again until the previous `update` returns.
* Once `destroy` is called, no further calls to `destroy` or `update` may occur, even if `destroy` calls `onError` or `onOutput`.
* The `destroy` function can be called at any time, even while `update` is running. This is because `update` can call `onError`.

<a name="functional-purity"></a>
## Functional Purity

The functions for deriving the `props` must be pure, meaning they don't produce any side-effects or modify any data. This allows the pixie system to avoid calls to `update` when things haven't actually changed. Besides being a nice optimization, this prevents some infinite loop scenarios where `update` calls `onOutput` which calls `update` again.
