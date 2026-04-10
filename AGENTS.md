# ThekSelect — Agent Context

## What This Repo Is

ThekSelect is a zero-dependency TypeScript select component library published to npm as `thekselect`.
It has a **headless core** (`ThekSelect`) that works without any DOM, and an optional **DOM layer**
(`ThekSelectDom`) that wires the core to a rendered widget. CSS themes are distributed separately
as importable CSS files.

Target environment: browser. Runtime dependencies: none.

## Commands

| Command                 | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `npm test -- --run`     | Run the full test suite once (no watch)              |
| `npm test`              | Run tests in watch mode                              |
| `npm run lint`          | Run oxlint — must pass with 0 warnings and 0 errors  |
| `npm run build`         | Compile library to `dist/` (ESM + UMD + types + CSS) |
| `npm run dev`           | Start Vite dev server with the showcase page         |
| `npm run release:check` | Full gate: tests + build + dry-run pack              |

## File Map

### src/core/

| File                 | Responsibility                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `types.ts`           | All public TypeScript interfaces and types (`ThekSelectConfig`, `ThekSelectOption`, `ThekSelectState`, event maps)    |
| `state.ts`           | `StateManager<T>` — owns all mutable state; notifies subscribers on change; returns frozen snapshots                  |
| `event-emitter.ts`   | Typed event emitter for the public `on()` API                                                                         |
| `config-utils.ts`    | `buildConfig()` merges defaults + global defaults + instance config; `buildInitialState()` seeds first state          |
| `options-logic.ts`   | Pure functions: filter options, detect remote mode, merge remote results                                              |
| `selection-logic.ts` | Pure functions: apply selection, remove, reorder, create option from label                                            |
| `dom-renderer.ts`    | `DomRenderer` — orchestrator for DOM updates; delegates to `src/core/renderer/` modules                               |
| `thekselect.ts`      | `ThekSelect` (exported headless class) and `ThekSelectDom` (unexported DOM subclass); `ThekSelect.init()` entry point |

### src/core/renderer/ (Modular Renderer)

| File                     | Responsibility                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| `constants.ts`           | SVG icons and `RendererCallbacks` interface                        |
| `dom-assembly.ts`        | Initial DOM skeleton creation and setup; Event listener attachment |
| `selection-renderer.ts`  | Rendering logic for tags, summary, and single-select content       |
| `options-renderer.ts`    | Dropdown list rendering, virtualization logic, and item creation   |
| `dropdown-positioner.ts` | Layout math, viewport constraints, and "flip up" logic             |

### src/utils/

| File               | Responsibility                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `debounce.ts`      | Generic debounce with `.cancel()` — used for `loadOptions`                                                          |
| `dom.ts`           | `generateId()` — unique instance ID used for ARIA attribute wiring                                                  |
| `event-manager.ts` | `GlobalEventManager` singleton — shared `resize`/`scroll`/`click` listeners with lazy attach and ref-counted detach |
| `styles.ts`        | `injectStyles()` — injects base CSS into `<head>` once per document (DOM-presence check, not module flag)           |

## Architecture Rules

**State:** All state lives in `StateManager`. Read via `stateManager.getState()` (returns a frozen
copy). Write via `stateManager.setState(partial)`. Never mutate the object returned by `getState()`.

**Config:** `config` is `protected readonly` on `ThekSelect`. Its reference must not be replaced.
Only `setMaxOptions()`, `setHeight()`, and `setRenderOption()` may mutate specific config properties
post-init, and only because they also trigger a re-render or `forceNotify()`.

**Rendering:** `DomRenderer.render()` is called by the state subscriber on every state change.
It acts as a functional orchestrator, delegating specific rendering tasks (selection, options)
to stateless modules in `src/core/renderer/`. `positionDropdown()` must NOT be called from
inside `render()`; it is called from `open()`, `resize` handlers, and `scroll` handlers only.

The state subscriber passes its snapshot directly to `render(state)`. Do not call
`stateManager.getState()` inside `render()` — the snapshot is already provided and calling it
again forces an unnecessary deep-clone of the full state tree. Programmatic `render()` calls
that have no state to pass (e.g. from `setRenderOption`) may call `this.render()` with no
argument; it falls back to `getState()` in that case only.

**Scroll handlers:** Any listener on `optionsList.scroll` (or any other high-frequency DOM event)
must be throttled via `requestAnimationFrame`. Use the same `rafPending` guard pattern used for
`resize`/`scroll` positioning in `setupListeners()`. Never attach a synchronous scroll listener
that triggers a DOM rebuild.

**Modularity:** Prefer small, focused files over monolithic ones. If a file grows beyond 300 lines,
evaluate if its logic can be extracted into a stateless utility or a sub-renderer module.
Follow the "Functional Orchestrator" pattern: a central class manages DOM references and
lifecycle, while pure functions or focused utilities handle the heavy lifting.

**Global events:** All shared `window`/`document` listeners go through `GlobalEventManager`.
It attaches lazily on first subscriber and detaches when all subscriber sets are empty.
Every `ThekSelectDom` instance unsubscribes its three handlers (`resize`, `scroll`, `click`) in
`destroy()`.

## Safety Rules

- Use `textContent` for all user-supplied strings. Never use `innerHTML` for user content.
- Every string shown in the UI (`noResultsText`, `loadingText`, `searchPlaceholder`) must be a
  `ThekSelectConfig` field with a sensible English default. Do not hardcode UI strings in `DomRenderer`.
- Every bug fix must be accompanied by a regression test in `tests/regressions/`.
- The dropdown has a `mousedown.preventDefault` listener (added in `createDom()`). This is
  load-bearing: it prevents the combobox input from losing focus when the user clicks an option,
  which would fire a blur event and close the dropdown before the option's click handler fires.
  Do not remove it.
- Do not add permanent listeners to `window` or `document` outside `GlobalEventManager`.
- Do not use `as unknown as` to satisfy the type checker — if you need it, the abstraction is wrong.

## Destroy Contract

`ThekSelectDom.destroy()` must do all four of the following or none:

1. Remove wrapper and dropdown from the DOM (`DomRenderer.destroy()`)
2. Unsubscribe from `GlobalEventManager` (resize, scroll, click)
3. Cancel the pending debounced search (`debouncedSearch.cancel()`)
4. Restore the original element's `display` style and remove injected `<option>` elements

If you add a new resource in the constructor or `initialize()`, add its cleanup to `destroy()`.

## Test Layout

| Directory              | What it covers                                                  |
| ---------------------- | --------------------------------------------------------------- |
| `tests/core/`          | Headless API, `StateManager` unit, config defaults, event types |
| `tests/features/`      | Remote loading, `canCreate`, drag-and-drop reorder, UI features |
| `tests/accessibility/` | ARIA attributes, keyboard navigation, label association         |
| `tests/integration/`   | Full DOM init and interaction scenarios                         |
| `tests/regressions/`   | One test per previously-found bug — never delete these          |
