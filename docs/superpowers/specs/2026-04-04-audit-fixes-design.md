# Audit Fixes Design — 2026-04-04

## Overview

Seven issues identified in an external code audit. All are valid and are fixed in this spec.
Ordered by severity: DOM thrashing → ARIA → event cleanup → AbortController → type safety → CSS scope → CI.

---

## Fix 1 — DOM Reconciliation (replaces `innerHTML = ''`)

### Problem
`DomRenderer.renderOptionsContent` and `renderSelectionContent` both clear their containers with `innerHTML = ''` and rebuild every DOM node on every state change (every keystroke, focus move, or selection). This destroys layout caching and causes GC pressure.

### Solution: Key-based reconciliation

**`renderOptionsContent` — non-virtualized path:**

1. Build a `Map<string, HTMLLIElement>` from the container's current children using `data-key` attributes.
2. Walk `filteredOptions`. For each option:
   - If its key exists in the map: update `aria-selected`, `thek-selected`, `thek-focused`, `thek-disabled` in place. Reuse the node.
   - If its key is absent: create a new `<li>` with `data-key` set.
   - Append in order (DOM `appendChild` moves an existing node cheaply).
3. Remove any child whose `data-key` is no longer in the new list.
4. Handle the "no results" and "create" sentinel items separately (keyed as `__no-results__` and `__create__`).

**`renderOptionsContent` — virtualized path:**
Unchanged. The virtual window is bounded to ~10–20 visible nodes, making GC impact negligible.

**`renderSelectionContent`:**
Same diff-and-update pattern for multi-select tags, keyed by option value.
Single-select path reconciles the single content node rather than clearing the container.

### Files changed
- `src/core/dom-renderer.ts`

---

## Fix 2 — ARIA Combobox Role (WAI-ARIA 1.2)

### Problem
`role="combobox"` is always placed on `div.thek-control`. In searchable mode the `<input>` is the focused element — the role must follow focus per the ARIA 1.2 combobox pattern. Screen readers fail to track active descendants correctly.

### Solution

**Searchable mode:**
- `<input>` receives `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`.
- `div.thek-control` loses `role="combobox"` — it becomes a plain layout container.

**Non-searchable mode:**
- `div.thek-control` retains `role="combobox"` (valid for a non-editable combobox per ARIA 1.1/1.2).
- No change.

`render()` updates `aria-expanded` on whichever element holds the role.
`aria-activedescendant` logic is already correct and is not changed.

### Files changed
- `src/core/dom-renderer.ts`

---

## Fix 3 — Event Listener Cleanup in `destroy()`

### Problem
Four direct `addEventListener` calls in `ThekSelectDom.setupListeners()` are never paired with `removeEventListener`. If an external reference holds a DOM node after `destroy()`, those listeners leak.

### Solution
Use a single `AbortController` for all direct listeners:

```ts
private listenerController: AbortController | null = null;

// setupListeners():
this.listenerController = new AbortController();
const { signal } = this.listenerController;
element.addEventListener('event', handler, { signal });

// destroy():
this.listenerController?.abort();
this.listenerController = null;
```

One `abort()` detaches all four listeners atomically.

### Files changed
- `src/core/thekselect.ts`

---

## Fix 4 — AbortController for Remote Requests

### Problem
`loadOptions` is called via a debounced async function. When the user types rapidly, multiple in-flight requests are queued. `remoteRequestId` prevents applying stale responses but the HTTP requests themselves are never cancelled.

### Solution

**API change (breaking):**
```ts
// before
loadOptions?: (query: string) => Promise<ThekSelectOption<T>[]>

// after
loadOptions?: (query: string, signal: AbortSignal) => Promise<ThekSelectOption<T>[]>
```

Implementation:
- A `currentSearchAbortController: AbortController | null` field is maintained on `ThekSelect`.
- On each debounced search: abort the previous controller, create a new one, pass its signal to `loadOptions`.
- The `remoteRequestId` guard is retained as a belt-and-suspenders guard against stale setState calls even when the consumer ignores the signal.

JS consumers whose `loadOptions` ignores extra arguments are unaffected. TypeScript consumers need a trivial signature update.

### Files changed
- `src/core/thekselect.ts`
- `src/core/types.ts`

---

## Fix 5 — Generic `DomRenderer<T>` (remove `as unknown as`)

### Problem
`DomRenderer` and `RendererCallbacks` are not generic. `ThekSelectDom<T>` bridges the gap with `as unknown as ThekSelectOption<T>` and `as unknown as Required<ThekSelectConfig>` casts, silently stripping type safety at the integration boundary.

### Solution
Add `<T = unknown>` to `DomRenderer<T>` and `RendererCallbacks<T>`. `ThekSelectDom<T>` instantiates `DomRenderer<T>` directly. All `as unknown as` casts at the boundary are removed.

Internal methods that accept `ThekSelectOption` or `ThekSelectConfig` parameters update their signatures to carry the generic.

### Files changed
- `src/core/dom-renderer.ts`
- `src/core/thekselect.ts`

---

## Fix 6 — CSS Variable Scoping

### Problem
All `--thek-*` custom properties are declared on `:root`, making them global. Multiple instances on one page cannot have independent themes; consumer overrides bleed everywhere.

### Solution
Move all `--thek-*` declarations from `:root` to `.thek-select, .thek-dropdown`. The dropdown is appended to `<body>` (outside `.thek-select`), so it needs to be included in the selector to inherit the variables.

The dark mode `@media (prefers-color-scheme: dark)` block scopes to the same selector.

**Breaking:** consumers overriding variables on `:root` must update their selector to `.thek-select`.

### Files changed
- `src/themes/base.css`

---

## Fix 7 — CI Workflow

### Problem
`.github/workflows/` contains only `publish.yml` and `pages.yml`. No automated gate runs tests or lint on pushes or pull requests to `main`. Regressions can land undetected.

### Solution
New file `.github/workflows/ci.yml`:
- Triggers on `push` and `pull_request` targeting `main`.
- Single job: `node 22`, `npm ci`, `npm run lint`, `npm test -- --run`.
- No build step required (tests use Vitest with jsdom, no dist needed).

### Files changed
- `.github/workflows/ci.yml` (new)

---

## Test Impact

- Existing ARIA tests in `tests/accessibility/aria-state.test.ts` will need updates for the `role="combobox"` location change.
- Existing remote tests in `tests/features/remote.test.ts` will need updates for the new `loadOptions` signature.
- DOM reconciliation tests should pass without changes (tests assert final DOM state).
- New tests: none required beyond updating existing ones; the fixes are behavioral corrections not new features.
