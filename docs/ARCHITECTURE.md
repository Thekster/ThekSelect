# ThekSelect Architecture

## Overview

ThekSelect is a zero-dependency TypeScript select component for browsers. It is split into two layers:

- **Reusable core** (`ThekSelect`) — state and selection logic that does not require binding to a DOM element, but still targets browser-like environments.
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
          │     ThekSelect      │  (exported reusable core)
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
│(orchestrator)│  │ Manager          │  │ (DOM only)    │
└──────┬───────┘  └──────────────────┘  └───────────────┘
       │ delegates to
┌──────▼───────┬──────────────────┬──────────────────┐
│ selection    │ options          │ dropdown         │
│ -renderer    │ -renderer        │ -positioner      │
└──────────────┴──────────────────┴──────────────────┘
│ constants    │ dom-assembly     │
└──────────────┴──────────────────┘
```

## Module Responsibilities

### `src/core/types.ts`

All public TypeScript interfaces: `ThekSelectConfig`, `ThekSelectOption`, `ThekSelectState`, and the event map. This is the single source of truth for the public API shape.

### `src/core/state.ts` — `StateManager<T>`

Owns all mutable state. Key contracts:

- `getState()` returns a recursively frozen snapshot — callers cannot accidentally mutate it.
- `setState(partial)` merges the partial update and notifies subscribers only when one of the updated keys actually changed.
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

### `src/core/dom-renderer.ts` — `DomRenderer` (Orchestrator)

Acts as the **Functional Orchestrator** for all DOM updates. It manages the component's lifecycle and DOM references, but delegates the actual node creation and attribute updates to specialized modules in `src/core/renderer/`.

Key contracts:

- **No state** — receives a `ThekSelectState` snapshot on every `render()` call.
- **Stateless rendering** — delegates selection and option list updates to sub-renderer modules.
- **Lifecycle management** — creates the DOM skeleton via `dom-assembly`, manages `MutationObserver` for orphan protection, and handles `destroy()`.
- `positionDropdown()` is a wrapper around `dropdown-positioner` logic.

### `src/core/renderer/` — Sub-Renderer Modules

This directory contains stateless functional utilities used by `DomRenderer`:

- **`constants.ts`**: Shared SVG icons and the `RendererCallbacks` interface.
- **`dom-assembly.ts`**: Initial DOM skeleton creation and event listener attachment.
- **`selection-renderer.ts`**: Pure rendering for tags, summaries, and single-select content.
- **`options-renderer.ts`**: Dropdown list rendering, including virtualization and key-based node reconciliation.
- **`dropdown-positioner.ts`**: Calculation of dropdown placement and height math.

### `src/core/thekselect.ts` — `ThekSelect` + `ThekSelectDom`

`ThekSelect` is the exported reusable core class. It composes `StateManager` and `ThekSelectEventEmitter`, exposes the public action API (`open`, `close`, `toggle`, `select`, `setValue`, `search`, etc.), and calls the pure logic functions.

`ThekSelectDom` is an unexported subclass. It is the only class instantiated by `ThekSelect.init()`. It:
- Creates `DomRenderer` and subscribes to `StateManager` to re-render on every state change.
- Wires DOM events (click, keydown, input, focus, blur) to the core action methods.
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
| `thekselect.umd.js` | UMD | `<script>` tags in browsers |
| `index.d.ts` | TypeScript declarations | TypeScript consumers |

CSS themes are separate files, also in `dist/`, and are imported explicitly by the consumer.

## Key Invariants

1. `StateManager.getState()` always returns a frozen object — no caller may mutate it.
2. `DomRenderer.render()` is a **functional orchestrator** delegating to stateless sub-modules.
3. `DomRenderer` never calls `positionDropdown()` during its render cycle.
4. Every UI string is a `ThekSelectConfig` field — nothing is hardcoded in renderer logic.
5. All user-supplied strings are set via `textContent`, never `innerHTML`.
6. All shared `window`/`document` listeners go through `GlobalEventManager`.
7. `ThekSelectDom.destroy()` releases all four resource categories (DOM nodes, global event subscriptions, debounce timer, original element state).
