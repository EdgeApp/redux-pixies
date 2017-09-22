# Redux Pixies

> The magical asynchronous Redux library

Pixies are little proceses that run in the background, monitoring your Redux store and handling asynchronous side-effects. Pixies are a lot like React components, but instead of managing the DOM, pixies manage everything else.

Other side-effect libraries such as [redux-thunk](https://github.com/gaearon/redux-thunk) or [redux-saga](https://github.com/redux-saga/redux-saga) are action-based. Pixes, on the other hand, are state based. A pixie examines the state of the Redux store, and if it needs work, the pixie performs the work on the store's behalf.

For example, if your user is on the search page, but doesn't have any search results yet, a pixie might notice that and fetch the search results. No matter what Redux actions cause the user to enter the page, the pixie will always notice the missing results and perform the fetch. If the user leaves the page, the pixie will also notice that and can stop any pending search queries (since they aren't needed). This is a lot easier than the traditional approach, which involves manually wiring side effects into any action that might enter or leave the search page.

## Example

```js
import { attachPixie } from './pixies.js'

// First, let's define the pixie.
// This code runs whenever the Redux state changes. The idea here is
// to fetch search results any time the user is on the search page
// but has no results.
async function SearchPixie (props) {
  if (props.state.onSearchPage && !props.state.hasSearchResults) {
    const results = await fetchSearchResults(props.state.searchTerm)
    props.dispatch({ type: 'SEARCH_FETCHED', payload: results })
  }
}

// Now, let's attach the pixie to our Redux store:
const unsubscribe = attachPixie(redux, SearchPixie)
```

## Pixies

A pixie is like a React component. Pixies have a very simple lifecycle, with only three methods:

* constructor
* update
* destructor

All three methods recieve `props`, which change along with the app's state. The pixie's job is to examine the `props` and perform any work that needs to happen in response.

The `update` method is where most of the work typically happens. It is called every time the props change (including the first time the pixie is started). If this method returns a promise, the runtime will wait for the promise to resolve before calling `update` again. This ensures that pixie won't accidentally start the same work twice.

The `constructor` and `destructor` methods are called when the pixie is created or destroyed. Pixies can be destroyed at any time, even while their async `update` method is still running. The best response is to cancel whatever work `update` is currently doing, since it is no longer needed.


## Defining pixies

A normal pixie is an ES6 class with three methods:

```js
class FetchPixie extends Pixie {
  constructor  (props) { ... }
  async update (props) { ... }
  destructor   (props) { ... }
}
```

If the `constructor` and `destructor` aren't needed, a pixie can just be a bare `update` function:

```js
function FetchPixie (props) { ... }
```

## Sharing data

Sometime pixies create resources that they would like to share with others. For example, one pixie might maintain a [`Disklet`](https://www.npmjs.com/package/disklet) folder that other need to access.

To do this, a pixie can call `props.onOutput` at any time to share some data. The other pixies can then find this output in their `props`.

## Combining pixies

The `redux-pixies` library provides a `combinePixies` function. This function works a lot like the `combineReducers` function from Redux. It accepts an object where the keys are the names of each pixie, and the values are the pixie constructors.

```js
const BossPixie = combinePixies({
  search: SearchPixie,
  login: LoginPixie
})
```

If any of the pixies have output, it will be available in `props.output`. So, if the login pixie in this example calls `props.onOutput`, the seach pixie can see that data as `props.output.login`.

## Filtering props

The `redux-pixies` library provides a `wrapPixie` function, which makes it possible to customize the props going into a pixie:

```js
const FilteredPixie = wrapPixie(
  SubsystemPixie,
  props => ({ login: props.peers.login })
  (error, props) => props.dispatch({ type: 'SUBSYSTEM_DIED' })
})
```

In this example, the subsystem pixie recieves just the login object from the outside world; the other props are filtered out. If the sybsystem pixie encounters an error, the wrapper will catch it and dispatch an appropriate error action.

## Replicating pixies

For managing lists of things, `redux-pixies` provides a `mapPixie` function. This function creates a pixie for each item in a list of id's. As the id list changes, this function will automatically start and stop pixies in response.

```js
const ChatListPixie = mapPixie(
  ChatPixie,

  // Grabs the id list from the props:
  props => props.state.activeChatIds,

  // Filters the props going into the individual pixies:
  (props, id) => ({ ...props, id }),

  // Error handler:
  (error, props) => props.dispatch({ type: 'CHAT_FAILED', payload: props.id })
)
```

## Reporting errors

Pixies can encounter errors at any time, since they are allowed to do asynchronous things like setting up timers. To report these asynchronous errors, pixies should call `props.onError`. This will shut the pixie down cleanly and allow any parent pixies to respond appropriately.

All of the following conditions will cleanly destroy the failed pixie and trigger the nearest error handler passed to `mapPixie` or `wrapPixie`:

* Throwing an exception from `constructor`, `update`, or `destructor`
* Returning a rejected promise from `update`
* Calling `props.onError`

## Starting pixies

Use the `startPixie` function to actually create a Pixie instance. The function accepts a pixie constructor and an optional initial props object.

```js
const pixieTree = startPixie(RootPixie, initialProps)

// To update the props:
pixieTree.setProps(props)

// To read the output:
pixieTree.output

// To subscribe to changes in the output:
const unsubscribe = pixieTree.subscribe(output => {})

// To shut everything down:
pixieTree.destroy()
```

To hook the pixies up to your Redux store, use `attachPixie` instead. It accepts a redux store as its first parameter, but otherwise behaves the same as `startPixie`. The `state` and `dispatch` will be available to the pixie as props.
