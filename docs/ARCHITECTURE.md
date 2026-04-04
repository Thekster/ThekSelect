# ThekSelect Architecture

## Overview

ThekSelect is a zero-dependency TypeScript select component. It is split into two independently usable layers:

- **Headless core** (`ThekSelect`) — pure state machine, no DOM required. Can be used in any environment (SSR, tests, non-browser runtimes).
- **DOM layer** (`ThekSelectDom`) — a subclass of `ThekSelect` that wires the core to a rendered widget. Created via the static `ThekSelect.init(element, config)` factory.

CSS themes are distributed as importable CSS files and are entirely optional.

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Consumer Code                      │
│  ThekSelect.init(el, config)  /  new ThekSelect(cfg) │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   ThekSelectDom     │  (DOM subclass — unexported)
          │  ThekSelect.init()  │
          └──────────┬──────────┘
                     │ extends
          ┌──────────▼──────────┐
          │     ThekSelect      │  (exported headless class)
          │  StateManager       │
          │  EventEmitter       │
          └──────────┬──────────┘
                     │ uses
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼────┐  ┌───────▼──────┐  ┌───▼──────────────┐
│ options │  │  selection   │  │  config-utils    │
│ -logic  │  │  -logic      │  │  buildConfig()   │
└─────────┘  └──────────────┘  └──────────────────┘

ThekSelectDom also uses:
┌──────────────┐  ┌──────────────────┐  ┌───────────────┐
│ DomRenderer  │  │ GlobalEvent      │  │ injectStyles  │
│ (DOM only)   │  │ Manager          │  │ (DOM only)    │
└──────────────┘  └──────────────────┘  └───────────────┘
```

## Module Responsibilities

### `src/core/types.ts`

All public TypeScript interfaces: `ThekSelectConfig`, `ThekSelectOption`, `ThekSelectState`, and the event map. This is the single source of truth for the public API shape.

### `src/core/state.ts` — `StateManager<T>`

Owns all mutable state. Key contracts:

- `getState()` returns a **frozen** deep copy — callers cannot accidentally mutate it.
- `setState(partial)` merges the partial update and notifies subscribers only when state actually changed (via `JSON.stringify` comparison).
- `forceNotify()` triggers subscribers without a state change — used when config mutates in place (e.g. `setMaxOptions()`).
- Subscribers receive the new frozen snapshot as their argument.

### `src/core/event-emitter.ts` — `ThekSelectEventEmitter<T>`

Typed pub/sub for the public `on('change' | 'open' | 'close', handler)` API. Separate from `StateManager` subscriptions — one is internal (full state), the other is public (domain events).

### `src/core/config-utils.ts`

- `buildConfig(element, instanceConfig)` — merges global defaults → `ThekSelect.defaults` → instance config. Reads `<option>` elements from a `<select>` if no `options` are provided.
- `buildInitialState(config)` — seeds the first `ThekSelectState` from config (pre-selected values, initial options list).

### `src/core/options-logic.ts`

Pure functions for option list management: filtering by `inputValue`, remote mode detection, merging remote results into the list. No side effects.

### `src/core/selection-logic.ts`

Pure functions for selection operations: applying a selection, removing a value, reordering tags, creating a new option from a label (`canCreate` path). No side effects.

### `src/core/dom-renderer.ts` — `DomRenderer`

Creates and updates all DOM nodes. Key contracts:

- **No state** — receives a `ThekSelectState` snapshot on every `render()` call.
- **No events** — never calls back into `ThekSelect`. DOM event handlers are wired by `ThekSelectDom`.
- **Full rebuild** — `render()` does a complete rebuild of the option list and tag list. No diffing.
- `positionDropdown()` must **not** be called from inside `render()`. It is called only from `open()`, resize handlers, and scroll handlers.
- `destroy()` is idempotent (safe to call twice).

### `src/core/thekselect.ts` — `ThekSelect` + `ThekSelectDom`

`ThekSelect` is the exported headless class. It composes `StateManager` and `ThekSelectEventEmitter`, exposes the public action API (`open`, `close`, `toggle`, `select`, `setValue`, `search`, etc.), and calls the pure logic functions.

`ThekSelectDom` is an unexported subclass. It is the only class instantiated by `ThekSelect.init()`. It:
- Creates `DomRenderer` and subscribes to `StateManager` to re-render on every state change.
- Wires DOM events (click, keydown, input, focus, blur) to the headless action methods.
- Subscribes to `GlobalEventManager` for resize, scroll, and outside-click detection.
- Overrides `open()` to call `positionDropdown()` and schedule focus on the search input.
- Overrides `destroy()` to clean up all four resource categories (DOM, global events, debounce timer, original element restoration).

## State Flow

```
User action (click / keydown / setValue())
        │
        ▼
ThekSelect action method (open / select / search / ...)
        │
        ▼
StateManager.setState(partial)
        │
        ├── no change detected → silent return
        │
        └── change detected → notify all subscribers
                │
                ├── DomRenderer.render(state)   [DOM layer]
                └── ThekSelectEventEmitter.emit  [public on() API]
```

## Global Event Management

`GlobalEventManager` (singleton) manages shared `window` resize, `document` scroll (capture), and `document` click listeners. All `ThekSelectDom` instances share the same three underlying listeners.

- **Lazy attach**: listeners are added to `window`/`document` on the first subscriber registration, not in the constructor.
- **Ref-counted detach**: listeners are removed when all subscriber sets for that event type become empty.

This prevents memory leaks when all instances are destroyed and avoids accumulating duplicate listeners when multiple instances exist.

Each `ThekSelectDom` instance registers its three handlers in `initialize()` and unregisters them in `destroy()`.

## Utility Modules

### `src/utils/debounce.ts`

Generic debounce with a `.cancel()` method. Used for the `loadOptions` remote search path. `ThekSelectDom.destroy()` calls `.cancel()` to prevent callbacks from firing after destruction.

### `src/utils/dom.ts`

`generateId()` — produces a unique instance ID used for ARIA attribute wiring (`id`, `aria-controls`, `aria-owns`, `aria-activedescendant`).

### `src/utils/event-manager.ts`

See Global Event Management above.

### `src/utils/styles.ts`

`injectStyles()` — injects the base CSS `<style>` element into `<head>` once per document. Uses a DOM presence check (`document.getElementById('thekselect-base-styles')`) rather than a module-level flag, so styles are re-injected correctly if the element is removed.

## Build Output

Vite produces three artifacts in `dist/`:

| File | Format | Consumer |
|---|---|---|
| `thekselect.js` | ESM | Bundlers (webpack, Rollup, Vite) |
| `thekselect.umd.js` | UMD | `<script>` tags, CommonJS |
| `thekselect.d.ts` | TypeScript declarations | TypeScript consumers |

CSS themes are separate files, also in `dist/`, and are imported explicitly by the consumer.

## Key Invariants

1. `StateManager.getState()` always returns a frozen object — no caller may mutate it.
2. `DomRenderer.render()` never calls `positionDropdown()`.
3. Every UI string is a `ThekSelectConfig` field — nothing is hardcoded in `DomRenderer`.
4. All user-supplied strings are set via `textContent`, never `innerHTML`.
5. All shared `window`/`document` listeners go through `GlobalEventManager`.
6. `ThekSelectDom.destroy()` releases all four resource categories (DOM nodes, global event subscriptions, debounce timer, original element state).
