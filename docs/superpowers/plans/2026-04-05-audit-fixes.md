# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix nine audit findings covering error handling, resource leaks, correctness bugs, TypeScript field safety, and a performance issue.

**Architecture:** All changes are in-place edits to existing files. Each task is independent and produces a green test suite. Tasks are ordered so later tasks do not depend on earlier ones except Task 3 which requires Task 1's `'error'` event type.

**Tech Stack:** TypeScript, Vitest + jsdom, `AbortController`, `MutationObserver`, `requestAnimationFrame`.

---

## File Map

| File | Role in this plan |
|------|------------------|
| `src/core/types.ts` | Add `'error'` event type (Task 1) |
| `src/core/thekselect.ts` | Error emission, destroy order, label fix, rAF throttle (Tasks 2, 6, 7, 10) |
| `src/core/dom-renderer.ts` | safeRender, DnD delegation, orphan observer, onError callback (Tasks 3, 4, 5) |
| `src/core/state.ts` | Deep freeze (Task 8) |
| `src/core/config-utils.ts` | Field validation (Task 9) |
| `tests/features/remote.test.ts` | error-event tests (Task 2) |
| `tests/features/render-functions.test.ts` | safeRender tests — new file (Task 3) |
| `tests/regressions/reviewer-findings.test.ts` | destroy-race + orphan tests (Tasks 5, 6) |
| `tests/core/state-manager.test.ts` | deep-freeze test (Task 8) |
| `tests/unit/config.test.ts` | field-validation tests — new file (Task 9) |

---

## Task 1: Add `'error'` event type

**Files:**
- Modify: `src/core/types.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/core/event-types.test.ts` inside the existing `describe('Typed event callbacks', ...)` block:

```ts
it('error event callback receives an Error object', async () => {
  const ts = ThekSelect.init(container, {
    loadOptions: async () => { throw new Error('network failure'); },
    debounce: 0
  });

  const handler = vi.fn();
  ts.on('error', handler);

  const input = document.querySelector('.thek-input') as HTMLInputElement;
  input.value = 'x';
  input.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 20));

  expect(handler).toHaveBeenCalledOnce();
  const arg: Error = handler.mock.calls[0][0];
  expect(arg).toBeInstanceOf(Error);
  expect(arg.message).toBe('network failure');
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- --run tests/core/event-types.test.ts
```

Expected: FAIL — TypeScript error `Argument of type '"error"' is not assignable` or runtime `handler not called`.

- [ ] **Step 3: Add `'error'` to `ThekSelectEvent` and its payload map**

In `src/core/types.ts`, update lines 46–63:

```ts
export type ThekSelectEvent =
  | 'change'
  | 'open'
  | 'close'
  | 'search'
  | 'tagAdded'
  | 'tagRemoved'
  | 'reordered'
  | 'error';

export interface ThekSelectEventPayloadMap<T = unknown> {
  change: string | string[] | undefined;
  open: null;
  close: null;
  search: string;
  tagAdded: ThekSelectOption<T>;
  tagRemoved: ThekSelectOption<T>;
  reordered: string[];
  error: Error;
}
```

The test still fails at runtime because `emit('error', ...)` is not called yet — that is Task 2.

- [ ] **Step 4: Run tests to confirm no regressions**

```
npm test -- --run
```

Expected: 138 existing tests pass; the new test in event-types still fails (that is expected — it will pass after Task 2).

- [ ] **Step 5: Commit**

```
git add src/core/types.ts tests/core/event-types.test.ts
git commit -m "feat(types): add error event type to ThekSelectEvent"
```

---

## Task 2: Emit `'error'` on failed remote search

**Files:**
- Modify: `src/core/thekselect.ts` (lines 270–275)
- Modify: `tests/features/remote.test.ts`

**Context:** `ThekSelect.setupDebouncedSearch()` at line 270 has a `catch` block that silently swallows all errors including real network failures. We distinguish `AbortError` (intentional abort — stay silent) from genuine errors (emit `'error'`).

- [ ] **Step 1: Write the failing tests**

Add to the end of `tests/features/remote.test.ts`:

```ts
it('emits error event when loadOptions rejects with a real error', async () => {
  const networkError = new Error('network failure');
  const ts = ThekSelect.init(container, {
    loadOptions: async (_q, _s) => { throw networkError; },
    debounce: 0
  });

  const errorHandler = vi.fn();
  ts.on('error', errorHandler);

  const input = document.querySelector('.thek-input') as HTMLInputElement;
  input.value = 'q';
  input.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 20));

  expect(errorHandler).toHaveBeenCalledOnce();
  expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(errorHandler.mock.calls[0][0].message).toBe('network failure');
  // loading state must be cleared
  expect(ts.getState().isLoading).toBe(false);
});

it('does NOT emit error event when loadOptions is aborted', async () => {
  const ts = ThekSelect.init(container, {
    loadOptions: (_q, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      }),
    debounce: 0
  });

  const errorHandler = vi.fn();
  ts.on('error', errorHandler);

  const input = document.querySelector('.thek-input') as HTMLInputElement;
  input.value = 'a';
  input.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 10));

  // Abort by typing a new query
  input.value = 'ab';
  input.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 20));

  expect(errorHandler).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run tests/features/remote.test.ts
```

Expected: 2 new tests FAIL — `errorHandler` not called / called unexpectedly.

- [ ] **Step 3: Update the catch block in `setupDebouncedSearch()`**

In `src/core/thekselect.ts`, replace lines 270–275:

```ts
          } catch (err) {
            // Guard: destroyed or superseded by a newer request — discard silently.
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            this.stateManager.setState({ isLoading: false });
            // Abort errors are intentional — do not surface to the caller.
            const isAbort = err instanceof Error && err.name === 'AbortError';
            if (!isAbort) {
              this.emit('error', err instanceof Error ? err : new Error(String(err)));
            }
          }
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run tests/features/remote.test.ts
```

Expected: all 7 tests in remote.test.ts PASS.

- [ ] **Step 5: Run full suite to confirm no regressions**

```
npm test -- --run
```

Expected: all tests pass (the event-types test added in Task 1 now passes too).

- [ ] **Step 6: Commit**

```
git add src/core/thekselect.ts tests/features/remote.test.ts
git commit -m "feat: emit error event on failed loadOptions (non-abort)"
```

---

## Task 3: Render function error boundary

**Files:**
- Modify: `src/core/dom-renderer.ts`
- Modify: `src/core/thekselect.ts` (lines 324–329)
- Create: `tests/features/render-functions.test.ts`

**Context:** `createOptionItem()` calls `this.config.renderOption(option)` (line 494). `createTagNode()` and the single-select branch of `renderSelectionContent()` each call `this.config.renderSelection(option)`. If any of these throw, the render cycle crashes. We add a `safeRender()` helper and route errors through a new `onError` callback in `RendererCallbacks<T>`.

- [ ] **Step 1: Write the failing tests**

Create `tests/features/render-functions.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('Render function error boundary', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('falls back to plain label text when renderOption throws', () => {
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple' }],
      renderOption: () => { throw new Error('render crash'); }
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    // Dropdown should be open and show the fallback text
    const option = document.querySelector('.thek-option-label') as HTMLElement;
    expect(option).not.toBeNull();
    expect(option.textContent).toBe('Apple');
  });

  it('fires error event when renderOption throws', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple' }],
      renderOption: () => { throw new Error('render crash'); }
    });

    const errorHandler = vi.fn();
    ts.on('error', errorHandler);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    expect(errorHandler).toHaveBeenCalledOnce();
    expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(errorHandler.mock.calls[0][0].message).toBe('render crash');
  });

  it('falls back to plain label text when renderSelection throws in single mode', () => {
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple', selected: true }],
      renderSelection: () => { throw new Error('selection crash'); }
    });

    // Selection content should render the fallback label
    const selection = document.querySelector('.thek-selection') as HTMLElement;
    expect(selection.textContent).toBe('Apple');
  });

  it('fires error event when renderSelection throws', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple', selected: true }],
      renderSelection: () => { throw new Error('selection crash'); }
    });

    const errorHandler = vi.fn();
    ts.on('error', errorHandler);

    // Trigger a re-render by opening/closing
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    control.click();

    expect(errorHandler).toHaveBeenCalled();
    expect(errorHandler.mock.calls[0][0].message).toBe('selection crash');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run tests/features/render-functions.test.ts
```

Expected: all 4 tests FAIL — errors propagate uncaught.

- [ ] **Step 3: Add `onError` to `RendererCallbacks<T>` in `dom-renderer.ts`**

In `src/core/dom-renderer.ts`, update lines 15–20:

```ts
export interface RendererCallbacks<T = unknown> {
  onSelect: (option: ThekSelectOption<T>) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption<T>) => void;
  onReorder: (from: number, to: number) => void;
  onError: (err: Error) => void;
}
```

- [ ] **Step 4: Add `safeRender()` private method to `DomRenderer`**

In `src/core/dom-renderer.ts`, add this method right before `createDom()` (before line 59):

```ts
  private safeRender(
    fn: (o: ThekSelectOption<T>) => string | HTMLElement,
    option: ThekSelectOption<T>
  ): string | HTMLElement {
    try {
      return fn(option);
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return String(option[this.config.displayField] ?? '');
    }
  }
```

- [ ] **Step 5: Replace `renderOption` and `renderSelection` call sites**

In `src/core/dom-renderer.ts`:

**In `createOptionItem()` (around line 494)**, replace:
```ts
    const content = this.config.renderOption(option);
```
with:
```ts
    const content = this.safeRender(this.config.renderOption, option);
```

**In `createTagNode()` (around line 261)**, replace:
```ts
    const content = this.config.renderSelection(option);
```
with:
```ts
    const content = this.safeRender(this.config.renderSelection, option);
```

**In `renderSelectionContent()` single-select branch (around line 220)**, replace:
```ts
        const content = this.config.renderSelection(option);
```
with:
```ts
        const content = this.safeRender(this.config.renderSelection, option);
```

- [ ] **Step 6: Wire `onError` callback in `ThekSelectDom` constructor**

In `src/core/thekselect.ts`, update the `callbacks` object (lines 324–329):

```ts
    const callbacks: RendererCallbacks<T> = {
      onSelect: (option) => this.select(option),
      onCreate: (label) => this.create(label),
      onRemove: (option) => this.select(option),
      onReorder: (from, to) => this.reorder(from, to),
      onError: (err) => this.emit('error', err)
    };
```

- [ ] **Step 7: Run tests to verify they pass**

```
npm test -- --run tests/features/render-functions.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 8: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```
git add src/core/dom-renderer.ts src/core/thekselect.ts tests/features/render-functions.test.ts
git commit -m "feat: add safeRender error boundary for renderOption/renderSelection"
```

---

## Task 4: Replace per-tag DnD listeners with event delegation

**Files:**
- Modify: `src/core/dom-renderer.ts`

**Context:** `setupTagDnd()` (lines 577–601) adds 5 listeners per tag element. Tags removed during reconciliation leave those listeners attached in memory. Replace with one set of delegated listeners on `selectionContainer`, owned by a private `_listenerController` in the renderer that is aborted in `destroy()`.

The existing `dnd.test.ts` dispatches events with `bubbles: true` on individual tags — delegation works because bubbling reaches `selectionContainer`.

- [ ] **Step 1: Run the existing DnD tests to establish baseline**

```
npm test -- --run tests/features/dnd.test.ts tests/regressions/reviewer-findings.test.ts
```

Expected: all pass (they are the regression guard for this task).

- [ ] **Step 2: Add `_listenerController` field and delegated DnD listeners in `createDom()`**

In `src/core/dom-renderer.ts`, add the private field at the top of the class, alongside the other private fields (near line 32):

```ts
  private _listenerController: AbortController | null = null;
```

In `createDom()`, immediately after the line `this.selectionContainer.className = 'thek-selection';` (line 77), insert:

```ts
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
      if (fromIndex !== -1 && fromIndex !== toIndex) {
        this.callbacks.onReorder(fromIndex, toIndex);
      }
    }, { signal });
```

- [ ] **Step 3: Remove `setupTagDnd()` and its call**

In `createTagNode()`, remove the line:
```ts
    this.setupTagDnd(tag);
```

Delete the entire `setupTagDnd()` method (lines 577–601):
```ts
  private setupTagDnd(tag: HTMLElement): void {
    tag.addEventListener('dragstart', ...);
    ...
  }
```

- [ ] **Step 4: Abort `_listenerController` in `destroy()`**

In `src/core/dom-renderer.ts`, update `destroy()` (lines 612–621):

```ts
  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._listenerController?.abort();
    this._listenerController = null;
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
```

- [ ] **Step 5: Run DnD and reviewer-findings tests**

```
npm test -- --run tests/features/dnd.test.ts tests/regressions/reviewer-findings.test.ts
```

Expected: all pass.

- [ ] **Step 6: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```
git add src/core/dom-renderer.ts
git commit -m "refactor: replace per-tag DnD listeners with selectionContainer delegation"
```

---

## Task 5: Dropdown orphan protection via MutationObserver

**Files:**
- Modify: `src/core/dom-renderer.ts`
- Modify: `tests/regressions/reviewer-findings.test.ts`

**Context:** The dropdown is appended to `document.body`. If a SPA removes the wrapper without calling `destroy()`, the dropdown stays orphaned. A `MutationObserver` watching for wrapper removal auto-calls `destroy()`.

- [ ] **Step 1: Write the failing test**

Add to `tests/regressions/reviewer-findings.test.ts` inside the existing `describe` block:

```ts
  it('removes dropdown from body when wrapper is removed without calling destroy()', async () => {
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    // Dropdown is appended to document.body and is hidden but present
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(document.body.contains(dropdown)).toBe(true);

    // Remove the wrapper without calling destroy() — simulates SPA teardown
    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    wrapper.remove();

    // Give MutationObserver a tick to fire
    await new Promise((r) => setTimeout(r, 0));

    expect(document.body.contains(dropdown)).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: the new test FAIL — dropdown still in body after wrapper removal.

- [ ] **Step 3: Add `_orphanObserver` field**

In `src/core/dom-renderer.ts`, add to the private fields (near line 32):

```ts
  private _orphanObserver: MutationObserver | null = null;
```

- [ ] **Step 4: Set up the MutationObserver in `createDom()`**

In `createDom()`, after the line `document.body.appendChild(this.dropdown);` (line 130), insert:

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

- [ ] **Step 5: Disconnect observer in `destroy()`**

In `src/core/dom-renderer.ts`, update `destroy()` to also disconnect the observer (place before the DOM removal lines):

```ts
  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._orphanObserver?.disconnect();
    this._orphanObserver = null;
    this._listenerController?.abort();
    this._listenerController = null;
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
```

- [ ] **Step 6: Run tests to verify they pass**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: all tests pass including the new one.

- [ ] **Step 7: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```
git add src/core/dom-renderer.ts tests/regressions/reviewer-findings.test.ts
git commit -m "feat: auto-destroy when wrapper removed from DOM (orphan dropdown protection)"
```

---

## Task 6: Fix destroy ordering — abort requests before DOM cleanup

**Files:**
- Modify: `src/core/thekselect.ts`
- Modify: `tests/regressions/reviewer-findings.test.ts`

**Context:** In `ThekSelectDom.destroy()`, `super.destroy()` (which calls `abort()` and increments `remoteRequestId`) is currently called last (line 572), after DOM cleanup. If a pending fetch resolves between the start of cleanup and `super.destroy()`, the state guard misses a small window. Moving `super.destroy()` immediately after `this.isDestroyed = true` closes this.

- [ ] **Step 1: Write the failing test**

Add to `tests/regressions/reviewer-findings.test.ts`:

```ts
  it('does not mutate state after destroy when a fetch is in-flight', async () => {
    let resolveRemote!: (opts: { value: string; label: string }[]) => void;
    const ts = ThekSelect.init(container, {
      loadOptions: (_q, _signal) =>
        new Promise((resolve) => { resolveRemote = resolve; }),
      debounce: 0
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await flush(10); // fetch is now in-flight

    ts.destroy();

    // Resolve the fetch AFTER destroy — should be a no-op
    resolveRemote([{ value: 'x', label: 'X' }]);
    await flush(10);

    // isLoading must still be false (the component is destroyed; no state mutation)
    expect(ts.getState().isLoading).toBe(false);
    expect(ts.getState().options).toHaveLength(0);
  });
```

- [ ] **Step 2: Run test to verify it fails or note it may pass already**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Note: `isDestroyed` is already set at line 550, so the guard at line 257 may already catch this. If the test passes, the ordering fix is still correct for code clarity.

- [ ] **Step 3: Move `super.destroy()` to immediately after `this.isDestroyed = true`**

In `src/core/thekselect.ts`, update `ThekSelectDom.destroy()` (lines 549–573). The current code ends with `super.destroy()` at line 572. Change it so `super.destroy()` is called second, right after setting `isDestroyed`:

```ts
  public override destroy(): void {
    this.isDestroyed = true;
    super.destroy(); // abort in-flight requests and cancel debounce immediately

    if (this.focusTimeoutId !== null) {
      clearTimeout(this.focusTimeoutId);
      this.focusTimeoutId = null;
    }
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = undefined;
    }
    this.unsubscribeEvents.forEach((unsub) => unsub());
    this.unsubscribeEvents = [];
    this.listenerController?.abort();
    this.listenerController = null;
    this.renderer.destroy();
    if (this.originalElement instanceof HTMLSelectElement && this.injectedOptionValues.size > 0) {
      const select = this.originalElement;
      Array.from(select.options)
        .filter((opt) => this.injectedOptionValues.has(opt.value))
        .forEach((opt) => select.remove(opt.index));
      this.injectedOptionValues.clear();
    }
    this.originalElement.style.display = '';
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/core/thekselect.ts tests/regressions/reviewer-findings.test.ts
git commit -m "fix: move super.destroy() before DOM cleanup to close fetch race window"
```

---

## Task 7: Fix `syncOriginalElement` losing option label

**Files:**
- Modify: `src/core/thekselect.ts` (lines 486–500)

**Context:** When a dynamically created option is injected into the native `<select>`, the current code uses `new Option(val, val, ...)` — setting both value and text to the raw value string. The fix looks up the option's display label from state first.

- [ ] **Step 1: Write the failing test**

Add to `tests/regressions/reviewer-findings.test.ts`:

```ts
  it('syncOriginalElement uses display label not raw value for injected options', () => {
    document.body.innerHTML = `
      <select id="fruit">
        <option value="apple">Apple</option>
      </select>
    `;
    const select = document.getElementById('fruit') as HTMLSelectElement;
    const ts = ThekSelect.init(select, { canCreate: true });

    ts.create('Mango');

    const injected = Array.from(select.options).find((o) => o.value === 'Mango');
    expect(injected).toBeDefined();
    // Text (label) must be the display label, not the raw value
    expect(injected!.text).toBe('Mango');
    // For a created option the value and label are the same string, so also verify
    // a case where valueField differs from displayField
    ts.destroy();

    document.body.innerHTML = `
      <select id="country">
        <option value="us">United States</option>
      </select>
    `;
    const select2 = document.getElementById('country') as HTMLSelectElement;
    ThekSelect.init(select2, {
      options: [{ value: 'us', label: 'United States' }],
      valueField: 'value',
      displayField: 'label'
    });
    // The native option text should be the label, not re-written
    const usOption = Array.from(select2.options).find((o) => o.value === 'us');
    expect(usOption?.text).toBe('United States');
  });
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: the new test FAILs on the label assertion because `new Option(val, val, ...)` uses raw value.

- [ ] **Step 3: Update `syncOriginalElement` in `thekselect.ts`**

Replace lines 492–497 (the `values.forEach` block inside `syncOriginalElement`):

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

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/core/thekselect.ts tests/regressions/reviewer-findings.test.ts
git commit -m "fix: use display label (not raw value) when injecting into native select"
```

---

## Task 8: Deep freeze nested state objects

**Files:**
- Modify: `src/core/state.ts`
- Modify: `tests/core/state-manager.test.ts`

**Context:** `getState()` currently does `Object.freeze({ ...this.state })` — a shallow freeze. Nested plain objects like `selectedOptionsByValue` remain mutable despite the `Readonly<>` TypeScript type. Fix: also freeze nested plain objects (not arrays).

- [ ] **Step 1: Write the failing test**

Add to `tests/core/state-manager.test.ts`:

```ts
  it('getState() returns a deeply frozen object — nested plain objects are frozen', () => {
    const sm = new StateManager<{ count: number; meta: { x: number } }>({
      count: 0,
      meta: { x: 1 }
    });
    const state = sm.getState();
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.meta)).toBe(true);
    // Attempt mutation should throw in strict mode (vitest runs in strict mode)
    expect(() => {
      (state.meta as { x: number }).x = 99;
    }).toThrow();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- --run tests/core/state-manager.test.ts
```

Expected: the new test FAIL — `state.meta` is not frozen, mutation does not throw.

- [ ] **Step 3: Update `getState()` in `src/core/state.ts`**

Replace lines 11–13:

```ts
  getState(): Readonly<T> {
    const shallow = { ...this.state } as Record<string, unknown>;
    for (const key of Object.keys(shallow)) {
      const val = shallow[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        shallow[key] = Object.freeze({ ...(val as object) });
      }
    }
    return Object.freeze(shallow) as Readonly<T>;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run tests/core/state-manager.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/core/state.ts tests/core/state-manager.test.ts
git commit -m "fix: deep freeze nested plain objects in StateManager.getState()"
```

---

## Task 9: Runtime validation of `valueField` and `displayField`

**Files:**
- Modify: `src/core/config-utils.ts`
- Create: `tests/unit/config.test.ts`

**Context:** `displayField` and `displayField` are plain strings. A typo is only caught at runtime. Add a validation block at the end of `buildConfig()` (after line 72) that throws on empty strings and warns when the field is absent from the first option.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/config.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('Config field validation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('throws when valueField is an empty string', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    expect(() =>
      ThekSelect.init(el, {
        valueField: '',
        options: [{ value: '1', label: 'One' }]
      })
    ).toThrow('ThekSelect: valueField must be a non-empty string');
  });

  it('throws when displayField is an empty string', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    expect(() =>
      ThekSelect.init(el, {
        displayField: '',
        options: [{ value: '1', label: 'One' }]
      })
    ).toThrow('ThekSelect: displayField must be a non-empty string');
  });

  it('warns when valueField does not exist on first option', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ThekSelect.init(el, {
      valueField: 'id',
      options: [{ value: '1', label: 'One' }]
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('valueField "id" not found on first option')
    );
    warnSpy.mockRestore();
  });

  it('warns when displayField does not exist on first option', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ThekSelect.init(el, {
      displayField: 'name',
      options: [{ value: '1', label: 'One' }]
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('displayField "name" not found on first option')
    );
    warnSpy.mockRestore();
  });

  it('does not warn when fields correctly match option shape', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ThekSelect.init(el, {
      options: [{ value: '1', label: 'One' }]
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run tests/unit/config.test.ts
```

Expected: all 5 tests FAIL.

- [ ] **Step 3: Add validation to `buildConfig()` in `src/core/config-utils.ts`**

In `src/core/config-utils.ts`, insert after the closing brace of the `if (typeof finalConfig.loadOptions !== 'function')` block (after line 60), before the `hasCustomRenderOption` line:

```ts
  // Runtime validation of field names — catches typos early.
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

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run tests/unit/config.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/core/config-utils.ts tests/unit/config.test.ts
git commit -m "feat: runtime validation of valueField and displayField in buildConfig"
```

---

## Task 10: Throttle dropdown positioning with `requestAnimationFrame`

**Files:**
- Modify: `src/core/thekselect.ts` (lines 414–419)

**Context:** Every scroll and resize event calls `positionDropdown()` synchronously. Wrapping in `requestAnimationFrame` caps the work at one call per animation frame (~16ms).

Note: `requestAnimationFrame` is not available in jsdom. The test uses a `vi.spyOn` approach to verify the throttle skips duplicate calls rather than testing rAF timing directly.

- [ ] **Step 1: Write the failing test**

Add to `tests/regressions/reviewer-findings.test.ts`:

```ts
  it('throttles positionDropdown calls — multiple rapid resize events cause only one call per rAF', async () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    // Open dropdown so positionDropdown is meaningful
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const positionSpy = vi.spyOn(
      (ts as unknown as { renderer: { positionDropdown: () => void } }).renderer,
      'positionDropdown'
    );

    // Fire 5 rapid resize events
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    // Wait for the rAF callback to fire (jsdom implements rAF as a microtask/setTimeout)
    await new Promise((r) => setTimeout(r, 50));

    // Should be called at most once (the rAF collapses duplicate events)
    expect(positionSpy).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: the new test FAIL — `positionSpy` is called 5 times (once per event).

- [ ] **Step 3: Update `setupListeners()` in `thekselect.ts`**

In `src/core/thekselect.ts`, replace lines 414–419:

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
    this.unsubscribeEvents.push(
      globalEventManager.onResize(schedulePosition)
    );
    this.unsubscribeEvents.push(
      globalEventManager.onScroll(schedulePosition)
    );
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run tests/regressions/reviewer-findings.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/core/thekselect.ts tests/regressions/reviewer-findings.test.ts
git commit -m "perf: throttle positionDropdown via requestAnimationFrame on scroll/resize"
```
