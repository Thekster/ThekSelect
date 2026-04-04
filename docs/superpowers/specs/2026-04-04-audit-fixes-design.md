# Audit Fixes Implementation Design

**Date:** 2026-04-04

## Goal

Fix nine significant issues from a code audit: two error-handling gaps, three resource-management problems, two correctness bugs, one TypeScript safety gap, and one performance issue.

## Architecture

All fixes are contained within existing files. Changes touch `src/core/thekselect.ts`, `src/core/dom-renderer.ts`, `src/core/state.ts`, `src/core/types.ts`, and `src/core/config-utils.ts`. Each fix is independently testable.

## Tech Stack

TypeScript, Vitest + jsdom, existing event system (`ThekSelectEventEmitter`).

---

## Section 1 — Error Handling

### 1a. Silent remote search failures

**Files:** `src/core/types.ts`, `src/core/thekselect.ts`

Add `'error'` to `ThekSelectEvent` and `ThekSelectEventPayloadMap<T>` with payload `Error`.

In the `catch` block in `setupDebouncedSearch()`, distinguish abort from real errors. Abort errors remain silent; real errors emit `'error'`:

```ts
} catch (err) {
  if (this.isDestroyed || requestId !== this.remoteRequestId) return;
  this.stateManager.setState({ isLoading: false });
  const isAbort = err instanceof Error && err.name === 'AbortError';
  if (!isAbort) {
    this.emit('error', err instanceof Error ? err : new Error(String(err)));
  }
}
```

**Tests:**
- `loadOptions` rejecting with a real `Error` fires `'error'` and clears `isLoading`
- `loadOptions` abort does NOT fire `'error'`

---

### 1b. Render function error boundary

**File:** `src/core/dom-renderer.ts`

Add `onError: (err: Error) => void` to `RendererCallbacks<T>`. Wire in `ThekSelectDom` constructor: `onError: (err) => this.emit('error', err)`.

Add private `safeRender` helper in `DomRenderer` and replace all `renderOption`/`renderSelection` call sites:

```ts
private safeRender(
  fn: (o: ThekSelectOption<T>) => string | HTMLElement,
  option: ThekSelectOption<T>,
  fallback: string
): string | HTMLElement {
  try {
    return fn(option);
  } catch (err) {
    this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return fallback;
  }
}
```

Fallback is `String(option[this.config.displayField] ?? '')`.

**Tests:**
- `renderOption` throwing falls back to plain text and fires `'error'`
- `renderSelection` throwing falls back to plain text and fires `'error'`

---

## Section 2 — Resource Management

### 2a. Tag DnD listener accumulation

**File:** `src/core/dom-renderer.ts`

Remove `setupTagDnd()` and its call from `createTagNode()`. Replace with event delegation on `selectionContainer` registered once in `createDom()`.

The renderer gets its own private `_listenerController: AbortController` created in `createDom()`, so all delegated listeners receive `{ signal }` and are torn down automatically when `destroy()` aborts it.

```ts
// In createDom(), after creating selectionContainer:
this._listenerController = new AbortController();
const { signal } = this._listenerController;

this.selectionContainer.addEventListener('dragstart', (e) => {
  const tag = (e.target as HTMLElement).closest<HTMLElement>('.thek-tag');
  if (!tag) return;
  e.dataTransfer?.setData('text/plain', tag.dataset.index!);
  tag.classList.add('thek-dragging');
}, { signal });

this.selectionContainer.addEventListener('dragend', (e) => {
  (e.target as HTMLElement).closest<HTMLElement>('.thek-tag')?.classList.remove('thek-dragging');
}, { signal });

this.selectionContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  (e.target as HTMLElement).closest<HTMLElement>('.thek-tag')?.classList.add('thek-drag-over');
}, { signal });

this.selectionContainer.addEventListener('dragleave', (e) => {
  (e.target as HTMLElement).closest<HTMLElement>('.thek-tag')?.classList.remove('thek-drag-over');
}, { signal });

this.selectionContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const tag = (e.target as HTMLElement).closest<HTMLElement>('.thek-tag');
  if (!tag) return;
  tag.classList.remove('thek-drag-over');
  const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
  const toIndex = parseInt(tag.dataset.index!);
  if (fromIndex !== -1 && fromIndex !== toIndex) this.callbacks.onReorder(fromIndex, toIndex);
}, { signal });
```

`destroy()` adds: `this._listenerController?.abort(); this._listenerController = null;`

**Tests:**
- DnD reorder still works after multiple selection changes

---

### 2b. Dropdown orphan protection

**File:** `src/core/dom-renderer.ts`

After appending the dropdown to `document.body` in `createDom()`, set up a `MutationObserver` that auto-calls `destroy()` if the wrapper is removed without an explicit destroy:

```ts
this._orphanObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const removed of Array.from(mutation.removedNodes)) {
      if (removed === this.wrapper || (removed as Element).contains?.(this.wrapper)) {
        this.destroy();
        return;
      }
    }
  }
});
this._orphanObserver.observe(document.body, { childList: true, subtree: true });
```

`destroy()` adds: `this._orphanObserver?.disconnect(); this._orphanObserver = null;`

**Tests:**
- Removing `renderer.wrapper` from DOM without calling `destroy()` removes the dropdown from `document.body`

---

### 2c. Destroy ordering

**File:** `src/core/thekselect.ts`

Move `super.destroy()` to immediately after `this.isDestroyed = true` in `ThekSelectDom.destroy()`, before all DOM cleanup. Remove the `super.destroy()` call at the end:

```ts
public override destroy(): void {
  this.isDestroyed = true;
  super.destroy(); // abort requests + cancel debounce immediately
  if (this.focusTimeoutId !== null) { ... }
  // ... rest of DOM cleanup ...
  // no super.destroy() at end
}
```

**Tests:**
- `destroy()` called while a fetch is pending does not mutate state after teardown

---

## Section 3 — Correctness Fixes

### 3a. syncOriginalElement loses option label

**File:** `src/core/thekselect.ts`

When injecting a new native `<option>`, look up the full option from state to get the display label:

```ts
values.forEach((val) => {
  if (!Array.from(select.options).some((opt) => opt.value === val)) {
    const state = this.stateManager.getState();
    const found =
      state.options.find((o) => o[this.config.valueField] === val) ||
      state.selectedOptionsByValue[val];
    const label = found ? String(found[this.config.displayField] ?? val) : val;
    const opt = new Option(label, val, true, true);
    select.add(opt);
    this.injectedOptionValues.add(val);
  }
});
```

**Tests:**
- Native `<select>` option text matches the display label, not the raw value

---

### 3b. Shallow Object.freeze on state

**File:** `src/core/state.ts`

Freeze nested plain objects so the `Readonly<>` contract holds at runtime:

```ts
getState(): Readonly<T> {
  const shallow = { ...this.state };
  for (const key of Object.keys(shallow) as (keyof T)[]) {
    const val = shallow[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      (shallow as Record<string, unknown>)[key as string] = Object.freeze({ ...(val as object) });
    }
  }
  return Object.freeze(shallow);
}
```

**Tests:**
- Mutating `state.selectedOptionsByValue` after `getState()` throws in strict mode

---

## Section 4 — TypeScript Field Safety

**File:** `src/core/config-utils.ts`

Runtime validation in `buildConfig()` after resolving the final config:

```ts
if (!finalConfig.valueField || typeof finalConfig.valueField !== 'string') {
  throw new Error('ThekSelect: valueField must be a non-empty string');
}
if (!finalConfig.displayField || typeof finalConfig.displayField !== 'string') {
  throw new Error('ThekSelect: displayField must be a non-empty string');
}
if (finalConfig.options.length > 0) {
  const sample = finalConfig.options[0];
  if (!(finalConfig.valueField in sample)) {
    console.warn(
      `ThekSelect: valueField "${finalConfig.valueField}" not found on first option. Check your config.`
    );
  }
  if (!(finalConfig.displayField in sample)) {
    console.warn(
      `ThekSelect: displayField "${finalConfig.displayField}" not found on first option. Check your config.`
    );
  }
}
```

**Tests:**
- `valueField: ''` throws at init
- Mismatched field name with non-empty options emits `console.warn`

---

## Section 5 — Performance

### Dropdown positioning throttle

**File:** `src/core/thekselect.ts`

Throttle scroll/resize positioning via `requestAnimationFrame`:

```ts
let rafPending = false;
const schedulePosition = () => {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (!this.isDestroyed) this.renderer.positionDropdown();
  });
};
this.unsubscribeEvents.push(globalEventManager.onResize(schedulePosition));
this.unsubscribeEvents.push(globalEventManager.onScroll(schedulePosition));
```

**Tests:**
- Multiple rapid resize events result in only one `positionDropdown()` call per rAF tick

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `src/core/types.ts` | Add `error` event and payload type |
| `src/core/thekselect.ts` | Error emit in catch, destroy ordering fix, syncOriginalElement label fix, rAF throttle |
| `src/core/dom-renderer.ts` | `safeRender()` helper, DnD delegation with `_listenerController`, orphan MutationObserver, `onError` callback |
| `src/core/state.ts` | Deep freeze of nested plain-object state fields |
| `src/core/config-utils.ts` | Runtime validation of `valueField` and `displayField` |

## Test Files

| File | Tests added |
|------|-------------|
| `tests/features/remote.test.ts` | error event on rejection; no error on abort |
| `tests/regressions/reviewer-findings.test.ts` | destroy race guard; orphan dropdown cleanup |
| `tests/features/render-functions.test.ts` | safeRender fallback and error event (new file) |
| `tests/unit/state.test.ts` | deep freeze assertion (new file) |
| `tests/unit/config.test.ts` | field validation throw and warn (new file) |
