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
async function SearchPixie (props, context) {
  if (props.onSearchPage && !props.hasSearchResults) {
    const results = await fetchSearchResults(props.searchTerm)
    context.dispatch({ type: 'SEARCH_FETCHED', payload: results })
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

All three methods recieve `props`, which change along with the app's state, and `context`, which contains non-changing things such as `dispatch`. The pixie's job is to examine the `props` and perform any work that needs to happen in response.

The `update` method is where most of the work typically happens. It is called every time the props change (including the first time the pixie is started). If this method returns a promise, the runtime will wait for the promise to resolve before calling `update` again. This ensures that pixie won't accidentally start the same work twice.

The `constructor` and `destructor` methods are called when the pixie is created or destroyed. Pixies can be destroyed at any time, even while their async `update` method is still running. The best response is to cancel whatever work `update` is currently doing, since it is no longer needed.

## Children

A pixie can create children at any time by calling `this.updateChildren`. This method accepts an array child descriptions, which are created using the `createPixie` function. If the parent pixie calls this method more than once, the library will compare the previous list with new list, starting, stopping, and updating children as needed. Destroying a parent pixie automatically destroys all its children.

By default, child pixies will recieve the same `context` as their parents. To provide a different context, pass a context object as the last parameter to `this.updateChildren`. The context is not allowed to change, so `this.updateChildren` will ignore the context passed on any future calls.

If a child throws an error in any of its lifecycle methods, the child will die. If the parent does not handle the error, the parent will die too. To prevent this, provide a `catch` function as one of the child's `props`. This will be called when the child dies from an error, giving the parent a chance to respond.

If you are really clever, you can put `/** @jsx createPixie */` at the top of your file. Now you can use JSX to describe your child pixies:

```js
/** @jsx createPixie */

function BossPixie (props) {
  updateChildren([
    <SearchPixie state={props.state} />,
    <LoginPixie state={props.state} />
  ])
}
```

## Defining pixies

If the `constructor` and `destructor` aren't needed, a pixie can just be a bare `update` function:

```js
function FetchPixie (props, context) { ... }
```

Otherwise, a pixie is an ES6 class:

```js
class FetchPixie extends Pixie {
  constructor  (props, context) { ... }
  async update (props, context) { ... }
  destructor   (props, context) { ... }
}
```

## Starting pixies

Use the `startPixie` function to create a Pixie instance. The function takes a pixie descriptor (from `createPixie`) and an optional `context`. The returned object has a `setProps` method and a `destroy` method.

To handle Redux in a more react-is way, use the `ReduxProvider` pixie to inject your redux store into the context, and then use `connectPixie` in the same way as the `connect` method of [react-redux](https://github.com/reactjs/react-redux).

If that seems like too much work, there is also an `attachPixie`, which combines all three operations (`createPixie`, `startPixie`, `ReduxProvider`, and `connectPixie`) in one operation.
