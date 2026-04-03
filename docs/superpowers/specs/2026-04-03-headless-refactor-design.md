# ThekSelect Headless Refactor + Bug Fix Design

**Date:** 2026-04-03
**Status:** Approved

---

## Goal

Decouple the pure selection logic from DOM manipulation so ThekSelect can be used as a genuine headless state machine, while fixing all valid production bugs found in the SEV review. Existing users of `ThekSelect.init()` require zero changes.

---

## Architecture

### Core: `ThekSelect<T>` (headless)

The `ThekSelect<T>` class becomes a pure state machine with no DOM imports. Its constructor takes only `config` — no `element`.

**Public API:**

```ts
class ThekSelect<T = unknown> {
  constructor(config: ThekSelectConfig<T>)

  // Reactive model: subscribe + pull
  subscribe(listener: (state: Readonly<ThekSelectState<T>>) => void): () => void
  getState(): Readonly<ThekSelectState<T>>
  getFilteredOptions(): ThekSelectOption<T>[]

  // Actions
  open(): void
  close(): void
  toggle(): void
  select(option: ThekSelectOption<T>): void
  search(query: string): void
  setValue(value: string | string[], silent?: boolean): void
  setMaxOptions(max: number | null): void

  // Output
  getValue(): string | string[] | undefined
  getSelectedOptions(): ThekSelectOption<T> | ThekSelectOption<T>[] | undefined

  // Events
  on<K extends ThekSelectEvent>(event: K, cb: (payload: ThekSelectEventPayloadMap<T>[K]) => void): () => void

  // Lifecycle
  destroy(): void

  // Convenience factory (backwards compat)
  static init<T>(element: string | HTMLElement, config?: ThekSelectConfig<T>): ThekSelectHandle<T>
  static setDefaults(defaults: Partial<ThekSelectConfig>): void
  static resetDefaults(): void
}
```

`getFilteredOptions()` is a pure derived computation exposed so external renderers don't need to re-implement filtering logic.

### DOM Adapter: `DomRenderer<T>` (separate named export)

`DomRenderer<T>` is the only class that imports DOM APIs. It subscribes to a core instance in its constructor and manages all DOM lifecycle.

```ts
class DomRenderer<T = unknown> {
  constructor(core: ThekSelect<T>, element: HTMLElement, config: Required<ThekSelectConfig<T>>)

  // DOM-specific imperative API
  setHeight(height: number | string): void
  setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void
  destroy(): void
}
```

The renderer subscribes via `core.subscribe(...)` and re-renders on every state notification. It also translates DOM events (clicks, keydown, input) into core action calls (`core.open()`, `core.select()`, etc.).

### `ThekSelectHandle<T>` (returned by `ThekSelect.init()`)

`ThekSelect.init()` returns the core instance augmented with DOM-specific methods, typed as:

```ts
type ThekSelectHandle<T> = ThekSelect<T> & {
  setHeight(height: number | string): void
  setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void
}
```

Internally `init()` creates a `ThekSelect<T>` core and a `DomRenderer<T>`, wires them together, and proxies `setHeight`/`setRenderOption` calls to the renderer. The `destroy()` on the handle tears down both.

### Exports

```ts
// src/index.ts
export { ThekSelect } from './core/thekselect.js'
export { DomRenderer } from './core/dom-renderer.js'
export type { ThekSelectConfig, ThekSelectOption, ThekSelectState, ThekSelectEvent } from './core/types.js'
```

`ThekSelect` is the headless core and the primary export. `DomRenderer` is a named opt-in export. Framework authors import only `ThekSelect`.

---

## Bug Fixes

### 1. DOM Thrashing → Node Reconciliation

`DomRenderer.renderSelectionContent()` and `renderOptionsContent()` stop calling `innerHTML = ''`. Instead they reconcile:

- Compute the desired set of items.
- Reuse existing DOM nodes where identity matches (by value for tags, by index for options).
- Update class names and attributes in-place on reused nodes.
- Append new nodes for additions; remove nodes for deletions.

This eliminates layout thrashing on every keystroke. The virtualization scroll handler already preserves `scrollTop` — no change needed there.

### 2. `StateManager.getState()` — Frozen Return

`getState()` returns `Object.freeze({ ...this.state })` instead of a plain spread. The spread still prevents external mutation of the internal state reference. The frozen wrapper communicates immutability to consumers and is negligible overhead.

### 3. Focus Management — `requestAnimationFrame`

The 10ms `setTimeout` in the current `openDropdown()` is removed entirely from the core. `ThekSelect.open()` simply sets `isOpen: true` in state. `DomRenderer`'s subscriber detects the transition to `isOpen === true` and schedules `requestAnimationFrame(() => this.input.focus())`. The rAF handle is stored as `focusRafId: number | null` on `DomRenderer` and cancelled in `DomRenderer.destroy()`.

### 4. `syncOriginalElement` — Wipe and Sync

The delta-patch approach is replaced with a deterministic wipe-and-sync:

1. Mark all native `<option>` elements as unselected.
2. Remove all previously injected options (tracked by `injectedOptionValues`).
3. Clear `injectedOptionValues`.
4. For each currently selected value: if a native option exists, mark it selected; otherwise inject a new option and record it.
5. Dispatch `change` event.

Single source of truth is always current state. No stale ghost data.

### 5. Checkbox Icon — Inline SVG

`checkbox.innerHTML = '<i class="fa-solid fa-check"></i>'` is replaced with a programmatically built inline SVG checkmark, consistent with how `SVG_CHEVRON`, `SVG_SPINNER`, and `SVG_SEARCH` are handled. No Font Awesome dependency.

A new test case is added to `tests/accessibility/no-external-deps.test.ts` that creates a multi-select, selects an option, opens the dropdown, and asserts no `.fa-solid` class exists anywhere in the rendered options.

### 6. Type Safety — Remove `as unknown as` Casts

The `as unknown as ThekSelectOption<T>` and `as unknown as Required<ThekSelectConfig>` casts in `thekselect.ts` are eliminated by correctly bounding the generics:

- `DomRenderer` works with the non-generic `ThekSelectOption` / `ThekSelectConfig` base forms (since the renderer is type-erased at the DOM layer).
- `ThekSelect<T>` owns the generic and passes typed values to selection logic directly.
- Renderer callbacks are typed as `(option: ThekSelectOption) => void` — the core narrows back to `ThekSelectOption<T>` at the boundary via a properly typed wrapper, not a cast.

### 7. ARIA `aria-activedescendant`

This is largely resolved by the DOM reconciliation fix — stable node IDs are no longer destroyed between renders. The existing `aria-activedescendant` assignment logic in `renderOptionsContent` is retained and now reliably finds the correct node.

---

## Files Changed

| File | Change |
|---|---|
| `src/core/thekselect.ts` | Becomes headless core; element handling moves into `init()` |
| `src/core/dom-renderer.ts` | Subscribes to core; node reconciliation; rAF focus; SVG checkbox; `syncOriginalElement` wipe-and-sync |
| `src/core/state.ts` | `getState()` returns frozen object |
| `src/index.ts` | Add `DomRenderer` named export |
| `tests/accessibility/no-external-deps.test.ts` | Add multi-select checkbox test |

---

## What Does Not Change

- `ThekSelect.init()` call signature and return shape — zero breaking changes for existing users.
- `StateManager` subscription pattern — retained as-is.
- `GlobalEventManager` singleton — already correctly implemented; no change.
- Virtualization logic — already sound; reconciliation wraps around it without disrupting scroll math.
- All existing tests — must remain green.
