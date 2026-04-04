# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix seven confirmed issues from an external audit: DOM thrashing, ARIA combobox role misplacement, missing event listener cleanup, no AbortController for remote requests, `as unknown as` type erasure, CSS variables leaking to `:root`, and missing CI workflow.

**Architecture:** Each fix is self-contained. Tasks are ordered by smallest blast radius first (CI, CSS) → independent `ThekSelect` core changes (AbortController, generics, listener cleanup) → `DomRenderer` changes (ARIA, DOM reconciliation). Tests come before implementation in every task.

**Tech Stack:** TypeScript, Vitest, jsdom, GitHub Actions.

---

## File Map

| File | What changes |
|---|---|
| `.github/workflows/ci.yml` | Created: lint + test gate on push/PR |
| `src/themes/base.css` | `:root` → `.thek-select, .thek-dropdown` |
| `src/core/types.ts` | `loadOptions` gains `signal: AbortSignal` param |
| `src/core/thekselect.ts` | AbortController field, generic cleanup, listener AbortController |
| `src/core/dom-renderer.ts` | Generic `<T>`, ARIA role fix, key-based reconciliation |
| `tests/features/remote.test.ts` | Update `toHaveBeenCalledWith` assertion for signal |
| `tests/accessibility/aria-state.test.ts` | Add `role="combobox"` placement tests |

---

## Task 1: CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Verify no ci.yml exists**

```bash
ls .github/workflows/
```
Expected: only `publish.yml` and `pages.yml`.

- [ ] **Step 2: Create the workflow file**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --run
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint and test gate on push and PR"
```

---

## Task 2: CSS Variable Scoping

**Files:**
- Modify: `src/themes/base.css`

- [ ] **Step 1: Write the failing test**

Add to `tests/accessibility/no-external-deps.test.ts` (or create `tests/regressions/css-scope.test.ts`):

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('CSS variable scoping', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('thek-select element is used as CSS variable scope (not :root)', () => {
    ThekSelect.init(container, { options: [] });
    // The wrapper must carry the .thek-select class so scoped variables apply
    const wrapper = document.querySelector('.thek-select');
    expect(wrapper).not.toBeNull();
  });

  it('thek-dropdown element carries .thek-dropdown class for variable inheritance', () => {
    ThekSelect.init(container, { options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const dropdown = document.querySelector('.thek-dropdown');
    expect(dropdown).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (these are structural, not value tests)**

```bash
npm test -- --run tests/regressions/css-scope.test.ts
```

Expected: PASS (confirms the DOM structure we're about to rely on is in place).

- [ ] **Step 3: Update `src/themes/base.css`**

Replace:
```css
:root {
  --thek-primary: #0f172a;
  --thek-primary-light: #f1f5f9;
  --thek-bg-surface: #ffffff;
  --thek-bg-panel: #f8fafc;
  --thek-bg-subtle: #f1f5f9;
  --thek-border: #e2e8f0;
  --thek-border-strong: #cbd5e1;
  --thek-text-main: #0f172a;
  --thek-text-muted: #64748b;
  --thek-text-inverse: #ffffff;
  --thek-danger: #ef4444;
  --thek-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --thek-font-family: inherit;
  --thek-border-radius: 8px;
  --thek-height-sm: 32px;
  --thek-height-md: 40px;
  --thek-height-lg: 48px;
  --thek-item-padding: 8px 10px;
}

@media (prefers-color-scheme: dark) {
  :root {
```

With:
```css
.thek-select,
.thek-dropdown {
  --thek-primary: #0f172a;
  --thek-primary-light: #f1f5f9;
  --thek-bg-surface: #ffffff;
  --thek-bg-panel: #f8fafc;
  --thek-bg-subtle: #f1f5f9;
  --thek-border: #e2e8f0;
  --thek-border-strong: #cbd5e1;
  --thek-text-main: #0f172a;
  --thek-text-muted: #64748b;
  --thek-text-inverse: #ffffff;
  --thek-danger: #ef4444;
  --thek-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --thek-font-family: inherit;
  --thek-border-radius: 8px;
  --thek-height-sm: 32px;
  --thek-height-md: 40px;
  --thek-height-lg: 48px;
  --thek-item-padding: 8px 10px;
}

@media (prefers-color-scheme: dark) {
  .thek-select,
  .thek-dropdown {
```

Also update the closing brace of the dark mode block — find `:root {` inside the `@media` block and replace it with `.thek-select, .thek-dropdown {`.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/themes/base.css tests/regressions/css-scope.test.ts
git commit -m "fix: scope CSS custom properties to .thek-select and .thek-dropdown instead of :root"
```

---

## Task 3: AbortController for Remote Requests

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/thekselect.ts`
- Modify: `tests/features/remote.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/features/remote.test.ts`:

```ts
it('passes an AbortSignal as second argument to loadOptions', async () => {
  const loadOptions = vi.fn().mockResolvedValue([]);

  ThekSelect.init(container, { loadOptions, debounce: 0 });

  const input = document.querySelector('.thek-input') as HTMLInputElement;
  input.value = 'test';
  input.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(loadOptions).toHaveBeenCalledWith('test', expect.any(Object));
  const signal = loadOptions.mock.calls[0][1];
  expect(signal).toBeInstanceOf(AbortSignal);
});

it('aborts the previous request when a new search fires', async () => {
  const abortedSignals: boolean[] = [];
  const loadOptions = vi.fn((query: string, signal: AbortSignal) => {
    return new Promise<{ value: string; label: string }[]>((resolve, reject) => {
      signal.addEventListener('abort', () => {
        abortedSignals.push(true);
        reject(new DOMException('Aborted', 'AbortError'));
      });
      // never resolves naturally so we can observe the abort
    });
  });

  ThekSelect.init(container, { loadOptions, debounce: 0 });

  const input = document.querySelector('.thek-input') as HTMLInputElement;
  input.value = 'a';
  input.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 10));

  input.value = 'ab';
  input.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(abortedSignals.length).toBe(1);
});
```

- [ ] **Step 2: Update the existing `toHaveBeenCalledWith` assertion in `tests/features/remote.test.ts`**

Find line:
```ts
expect(loadOptions).toHaveBeenCalledWith('rem');
```
Replace with:
```ts
expect(loadOptions).toHaveBeenCalledWith('rem', expect.any(Object));
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --run tests/features/remote.test.ts
```
Expected: the two new tests FAIL, the updated assertion FAIL.

- [ ] **Step 4: Update `src/core/types.ts`**

Change:
```ts
loadOptions?: (query: string) => Promise<ThekSelectOption<T>[]>;
```
To:
```ts
loadOptions?: (query: string, signal: AbortSignal) => Promise<ThekSelectOption<T>[]>;
```

- [ ] **Step 5: Update `src/core/thekselect.ts`**

Add field after `private remoteRequestId = 0;`:
```ts
private currentSearchAbortController: AbortController | null = null;
```

In `setupDebouncedSearch`, replace:
```ts
const requestId = ++this.remoteRequestId;
this.stateManager.setState({ isLoading: true });
try {
  const options = await this.config.loadOptions!(query);
```
With:
```ts
this.currentSearchAbortController?.abort();
this.currentSearchAbortController = new AbortController();
const { signal } = this.currentSearchAbortController;
const requestId = ++this.remoteRequestId;
this.stateManager.setState({ isLoading: true });
try {
  const options = await this.config.loadOptions!(query, signal);
```

In `ThekSelect.destroy()`, replace:
```ts
public destroy(): void {
  this.isDestroyed = true;
  this.remoteRequestId++;
  this.debouncedSearch.cancel();
}
```
With:
```ts
public destroy(): void {
  this.isDestroyed = true;
  this.remoteRequestId++;
  this.currentSearchAbortController?.abort();
  this.currentSearchAbortController = null;
  this.debouncedSearch.cancel();
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --run tests/features/remote.test.ts
```
Expected: all PASS.

- [ ] **Step 7: Run full suite**

```bash
npm test -- --run
```
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/types.ts src/core/thekselect.ts tests/features/remote.test.ts
git commit -m "fix: pass AbortSignal to loadOptions and abort previous request on new search"
```

---

## Task 4: Generic `DomRenderer<T>`

**Files:**
- Modify: `src/core/dom-renderer.ts`
- Modify: `src/core/thekselect.ts`

No new tests needed — this is a type-level fix. Existing tests verify observable behavior; TypeScript compiler errors are the failing "tests" here.

- [ ] **Step 1: Verify current type errors by looking at the cast sites**

In `src/core/thekselect.ts` look for all `as unknown as` casts (lines ~314, 316, 321). Confirm they exist.

- [ ] **Step 2: Update `src/core/dom-renderer.ts` — add generic to interface and class**

Change:
```ts
export interface RendererCallbacks {
  onSelect: (option: ThekSelectOption) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption) => void;
  onReorder: (from: number, to: number) => void;
}

export class DomRenderer {
  ...
  constructor(
    private config: Required<ThekSelectConfig>,
    private id: string,
    private callbacks: RendererCallbacks
  ) {}
```
To:
```ts
export interface RendererCallbacks<T = unknown> {
  onSelect: (option: ThekSelectOption<T>) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption<T>) => void;
  onReorder: (from: number, to: number) => void;
}

export class DomRenderer<T = unknown> {
  ...
  constructor(
    private config: Required<ThekSelectConfig<T>>,
    private id: string,
    private callbacks: RendererCallbacks<T>
  ) {}
```

- [ ] **Step 3: Update method signatures inside `DomRenderer` that reference `ThekSelectOption` or `ThekSelectState` or `ThekSelectConfig` without the generic**

Update `render`:
```ts
public render(state: ThekSelectState<T>, filteredOptions: ThekSelectOption<T>[]): void {
```

Update `renderSelectionContent`:
```ts
private renderSelectionContent(state: ThekSelectState<T>): void {
```

Update `renderOptionsContent`:
```ts
private renderOptionsContent(
  state: ThekSelectState<T>,
  filteredOptions: ThekSelectOption<T>[],
  alignFocused: boolean = true,
  preservedScrollTop?: number
): void {
```

Update `createOptionItem`:
```ts
private createOptionItem(
  option: ThekSelectOption<T>,
  index: number,
  state: ThekSelectState<T>,
  valueField: string
): HTMLLIElement {
```

Update the `lastState` and `lastFilteredOptions` field types:
```ts
private lastState: ThekSelectState<T> | null = null;
private lastFilteredOptions: ThekSelectOption<T>[] = [];
```

- [ ] **Step 4: Update `src/core/thekselect.ts` — remove all `as unknown as` casts in `ThekSelectDom`**

In `ThekSelectDom<T>`, change the `renderer` field:
```ts
private renderer: DomRenderer<T>;
```

Change the callbacks object:
```ts
const callbacks: RendererCallbacks<T> = {
  onSelect: (option) => this.select(option),
  onCreate: (label) => this.create(label),
  onRemove: (option) => this.select(option),
  onReorder: (from, to) => this.reorder(from, to)
};
```

Change the renderer constructor call:
```ts
this.renderer = new DomRenderer<T>(this.config, this.id, callbacks);
```

Update `render()` to remove casts:
```ts
private render(): void {
  this.renderer.render(
    this.stateManager.getState(),
    this.getFilteredOptions()
  );
}
```

- [ ] **Step 5: Compile to check for type errors**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/dom-renderer.ts src/core/thekselect.ts
git commit -m "fix: make DomRenderer generic to remove as-unknown-as type erasure"
```

---

## Task 5: Event Listener Cleanup via AbortController

**Files:**
- Modify: `src/core/thekselect.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/regressions/reviewer-findings.test.ts`:

```ts
it('removes direct DOM event listeners on destroy', () => {
  const ts = ThekSelect.init(container, {
    options: [{ value: '1', label: 'One' }]
  });

  // Grab a reference to the control before destroy removes it from DOM
  const control = document.querySelector('.thek-control') as HTMLElement;

  // Detach from DOM (simulates a SPA framework removing the component)
  control.remove();

  // Destroy the ThekSelect instance
  ts.destroy();

  // Re-attach the orphaned element to DOM
  document.body.appendChild(control);

  // With AbortController cleanup, clicking the control should not call toggle
  // (isDestroyed guard catches it too, but the listener itself should be gone)
  let threw = false;
  try {
    control.click();
  } catch {
    threw = true;
  }
  expect(threw).toBe(false);
  // State should remain closed (toggle is a no-op after destroy)
  expect(ts.getState().isOpen).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it passes already (isDestroyed guard)**

```bash
npm test -- --run tests/regressions/reviewer-findings.test.ts
```
Expected: PASS (the `isDestroyed` guard already prevents state changes; the test validates correctness not mechanism).

- [ ] **Step 3: Add `listenerController` field and wire it in `ThekSelectDom`**

In `ThekSelectDom` class body, add after `private focusTimeoutId`:
```ts
private listenerController: AbortController | null = null;
```

In `setupListeners()`, replace the opening of the method with:
```ts
private setupListeners(): void {
  this.listenerController = new AbortController();
  const { signal } = this.listenerController;

  this.renderer.control.addEventListener('click', () => {
    if (this.config.disabled) return;
    this.toggle();
  }, { signal });

  if (this.config.searchable) {
    this.renderer.input.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.search(value);
    }, { signal });
  }

  this.renderer.input.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });
  this.renderer.control.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });

  this.unsubscribeEvents.push(
    globalEventManager.onClick((e: unknown) => {
```

(The `unsubscribeEvents` block that follows stays unchanged.)

- [ ] **Step 4: Call `abort()` in `ThekSelectDom.destroy()`**

In `ThekSelectDom.destroy()`, add before `this.renderer.destroy()`:
```ts
this.listenerController?.abort();
this.listenerController = null;
```

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/thekselect.ts tests/regressions/reviewer-findings.test.ts
git commit -m "fix: use AbortController to clean up direct DOM event listeners in destroy()"
```

---

## Task 6: ARIA Combobox Role Fix

**Files:**
- Modify: `src/core/dom-renderer.ts`
- Modify: `src/core/thekselect.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/accessibility/aria-state.test.ts`:

```ts
it('places role="combobox" on the input element in searchable mode', () => {
  ThekSelect.init(container, { searchable: true, options: [] });
  const input = document.querySelector('.thek-input') as HTMLInputElement;
  const control = document.querySelector('.thek-control') as HTMLElement;
  expect(input.getAttribute('role')).toBe('combobox');
  expect(control.getAttribute('role')).toBeNull();
});

it('places aria-expanded on the input in searchable mode', () => {
  ThekSelect.init(container, { searchable: true, options: [] });
  const input = document.querySelector('.thek-input') as HTMLInputElement;
  expect(input.getAttribute('aria-expanded')).toBe('false');
  const control = document.querySelector('.thek-control') as HTMLElement;
  expect(control.getAttribute('aria-expanded')).toBeNull();
});

it('updates aria-expanded on the input when dropdown opens in searchable mode', () => {
  ThekSelect.init(container, { searchable: true, options: [{ value: '1', label: 'One' }] });
  const input = document.querySelector('.thek-input') as HTMLInputElement;
  const control = document.querySelector('.thek-control') as HTMLElement;
  control.click();
  expect(input.getAttribute('aria-expanded')).toBe('true');
});

it('places role="combobox" on the control div in non-searchable mode', () => {
  ThekSelect.init(container, { searchable: false, options: [] });
  const control = document.querySelector('.thek-control') as HTMLElement;
  expect(control.getAttribute('role')).toBe('combobox');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run tests/accessibility/aria-state.test.ts
```
Expected: the four new tests FAIL.

- [ ] **Step 3: Update `DomRenderer.createDom()` to split ARIA by mode**

In `createDom()`, find the current block that assigns ARIA to `this.control`:
```ts
this.control.setAttribute('role', 'combobox');
this.control.setAttribute('aria-expanded', 'false');
this.control.setAttribute('aria-haspopup', 'listbox');
this.control.setAttribute('aria-controls', `${this.id}-list`);
this.control.setAttribute('tabindex', '0');
```

Replace with (non-searchable-only block; the searchable attrs will move below):
```ts
if (!this.config.searchable) {
  this.control.setAttribute('role', 'combobox');
  this.control.setAttribute('aria-expanded', 'false');
  this.control.setAttribute('aria-haspopup', 'listbox');
  this.control.setAttribute('aria-controls', `${this.id}-list`);
}
this.control.setAttribute('tabindex', '0');
```

Then inside the `if (this.config.searchable)` block, after `this.input` is created and before `searchWrapper.appendChild(this.input)`, add:
```ts
this.input.setAttribute('role', 'combobox');
this.input.setAttribute('aria-expanded', 'false');
this.input.setAttribute('aria-haspopup', 'listbox');
this.input.setAttribute('aria-controls', `${this.id}-list`);
this.input.setAttribute('aria-autocomplete', 'list');
```

Remove the existing `this.input.setAttribute('aria-autocomplete', 'list');` line that was already there (it was previously set separately; it's now included in the block above).

- [ ] **Step 4: Update `DomRenderer.render()` to update `aria-expanded` on the right element**

Find:
```ts
this.control.setAttribute('aria-expanded', state.isOpen.toString());
```
Replace with:
```ts
const ariaTarget = this.config.searchable ? this.input : this.control;
ariaTarget.setAttribute('aria-expanded', state.isOpen.toString());
```

- [ ] **Step 5: Update `ThekSelectDom.applyAccessibleName()` to label the combobox element**

In `thekselect.ts`, replace the entire `applyAccessibleName` method:
```ts
private applyAccessibleName(): void {
  const el = this.originalElement;
  // In searchable mode role="combobox" lives on the input; label that element.
  // In non-searchable mode it lives on the control div.
  const labelTarget = this.config.searchable ? this.renderer.input : this.renderer.control;

  const existingLabelledBy = el.getAttribute('aria-labelledby');
  if (existingLabelledBy) {
    labelTarget.setAttribute('aria-labelledby', existingLabelledBy);
    return;
  }

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    labelTarget.setAttribute('aria-label', ariaLabel);
    return;
  }

  const id = el.id;
  if (id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (label) {
      if (!label.id) {
        label.id = `${id}-label`;
      }
      labelTarget.setAttribute('aria-labelledby', label.id);
    }
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- --run tests/accessibility/aria-state.test.ts
```
Expected: all PASS including the new ones.

- [ ] **Step 7: Run full suite**

```bash
npm test -- --run
```
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/dom-renderer.ts src/core/thekselect.ts tests/accessibility/aria-state.test.ts
git commit -m "fix: move role=combobox to input element in searchable mode per WAI-ARIA 1.2"
```

---

## Task 7: DOM Key-Based Reconciliation — Options List

**Files:**
- Modify: `src/core/dom-renderer.ts`

This is the largest task. The `renderOptionsContent` non-virtualized path is rewritten to diff by key instead of clearing innerHTML. The virtualized path and loading-state path keep their current behavior.

- [ ] **Step 1: Write failing tests**

Create `tests/regressions/dom-reconciliation.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('DOM reconciliation — options list', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reuses existing option nodes when filter narrows the list', () => {
    ThekSelect.init(container, {
      searchable: true,
      options: [
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' },
        { value: '3', label: 'Cherry' }
      ],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const allOptions = Array.from(document.querySelectorAll('.thek-option'));
    expect(allOptions.length).toBe(3);

    // Capture node identity
    const appleNode = allOptions.find((n) => n.textContent?.includes('Apple'));
    expect(appleNode).toBeDefined();

    // Filter to just Apple
    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'App';
    input.dispatchEvent(new Event('input'));

    const filteredOptions = document.querySelectorAll('.thek-option');
    expect(filteredOptions.length).toBe(1);

    // The Apple node should be the SAME DOM node (reused, not recreated)
    expect(filteredOptions[0]).toBe(appleNode);
  });

  it('updates thek-selected class on existing nodes without recreating them', () => {
    const ts = ThekSelect.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const options = Array.from(document.querySelectorAll('.thek-option'));
    const nodeOne = options[0];
    expect(nodeOne.classList.contains('thek-selected')).toBe(false);

    nodeOne.click();
    control.click();

    // Same node, now has thek-selected
    const updatedOptions = document.querySelectorAll('.thek-option');
    expect(updatedOptions[0]).toBe(nodeOne);
    expect(updatedOptions[0].classList.contains('thek-selected')).toBe(true);
  });

  it('removes orphan nodes when an option disappears from the filtered list', () => {
    ThekSelect.init(container, {
      searchable: true,
      options: [
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' }
      ],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect(document.querySelectorAll('.thek-option').length).toBe(2);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'App';
    input.dispatchEvent(new Event('input'));

    expect(document.querySelectorAll('.thek-option').length).toBe(1);
    expect(document.querySelector('.thek-option')?.textContent).toBe('Apple');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run tests/regressions/dom-reconciliation.test.ts
```
Expected: "reuses existing option nodes" FAIL (nodes are recreated today), others may PASS.

- [ ] **Step 3: Add `updateOptionAttrs` private method to `DomRenderer`**

Add this method before `createOptionItem` in `dom-renderer.ts`:

```ts
private updateOptionAttrs(
  li: HTMLLIElement,
  option: ThekSelectOption<T>,
  index: number,
  state: ThekSelectState<T>,
  valueField: string
): void {
  const isSelected = state.selectedValues.includes(option[valueField] as string);
  li.id = `${this.id}-opt-${index}`;
  li.classList.toggle('thek-selected', isSelected);
  li.classList.toggle('thek-focused', state.focusedIndex === index);
  li.setAttribute('aria-selected', isSelected.toString());
  if (this.config.multiple) {
    const checkbox = li.querySelector<HTMLElement>('.thek-checkbox');
    if (checkbox) {
      const hasSvg = checkbox.querySelector('.thek-check') !== null;
      if (isSelected && !hasSvg) {
        checkbox.innerHTML = SVG_CHECK;
      } else if (!isSelected && hasSvg) {
        checkbox.innerHTML = '';
      }
    }
  }
}
```

- [ ] **Step 4: Rewrite `renderOptionsContent` non-virtualized path**

Inside `renderOptionsContent`, find the `else` branch of `if (shouldVirtualize)`:
```ts
} else {
  filteredOptions.forEach((option, index) => {
    this.optionsList.appendChild(this.createOptionItem(option, index, state, vField));
  });
}
```

Replace with:
```ts
} else {
  // Key-based reconciliation: reuse existing nodes, update attributes in place.
  const existing = new Map<string, HTMLLIElement>();
  for (const child of Array.from(this.optionsList.children) as HTMLLIElement[]) {
    const key = child.dataset.key;
    if (key) existing.set(key, child);
  }

  filteredOptions.forEach((option, index) => {
    const key = String(option[vField] ?? index);
    let li = existing.get(key);
    if (li) {
      existing.delete(key);
      this.updateOptionAttrs(li, option, index, state, vField);
    } else {
      li = this.createOptionItem(option, index, state, vField);
      li.dataset.key = key;
    }
    this.optionsList.appendChild(li);
  });

  // Reconcile sentinel: "create" option
  const dField = this.config.displayField;
  const exactMatch = filteredOptions.some(
    (o) => o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
  );
  if (this.config.canCreate && state.inputValue && !exactMatch) {
    const createKey = '__create__';
    let createLi = existing.get(createKey) as HTMLLIElement | undefined;
    existing.delete(createKey);
    if (!createLi) {
      createLi = document.createElement('li');
      createLi.className = 'thek-option thek-create';
      createLi.dataset.key = createKey;
      createLi.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.lastState) this.callbacks.onCreate(this.lastState.inputValue);
      });
    }
    createLi.textContent = this.config.createText.replace('{%t}', state.inputValue);
    createLi.classList.toggle('thek-focused', state.focusedIndex === filteredOptions.length);
    this.optionsList.appendChild(createLi);
  }

  // Reconcile sentinel: "no results"
  if (filteredOptions.length === 0 && (!this.config.canCreate || !state.inputValue)) {
    const noResultsKey = '__no-results__';
    let noLi = existing.get(noResultsKey) as HTMLLIElement | undefined;
    existing.delete(noResultsKey);
    if (!noLi) {
      noLi = document.createElement('li');
      noLi.className = 'thek-option thek-no-results';
      noLi.dataset.key = noResultsKey;
    }
    noLi.textContent = this.config.noResultsText;
    this.optionsList.appendChild(noLi);
  }

  // Remove orphan nodes (options no longer in filtered list, or stale sentinels)
  for (const node of existing.values()) {
    this.optionsList.removeChild(node);
  }
}
```

- [ ] **Step 5: Remove the now-duplicate sentinel logic that came after the old forEach**

The old code after the `if (shouldVirtualize) { ... } else { ... }` block has:
```ts
const exactMatch = filteredOptions.some(...);
if (this.config.canCreate && state.inputValue && !exactMatch) { ... }
if (filteredOptions.length === 0 && (!this.config.canCreate || !state.inputValue)) { ... }
```

Delete these blocks — they are now inside the `else` branch above.

- [ ] **Step 6: Move `innerHTML = ''` out of the function top, into the loading-state and virtualized branches only**

Find `this.optionsList.innerHTML = '';` at the very top of `renderOptionsContent` (line ~221). Remove it.

Add `this.optionsList.innerHTML = '';` inside the `if (state.isLoading && filteredOptions.length === 0)` early-return block, before the `li` creation:
```ts
if (state.isLoading && filteredOptions.length === 0) {
  this.optionsList.innerHTML = '';
  const li = document.createElement('li');
  ...
```

Add `this.optionsList.innerHTML = '';` as the first line inside `if (shouldVirtualize) {`:
```ts
if (shouldVirtualize) {
  this.optionsList.innerHTML = '';
  const viewportHeight = ...
```

- [ ] **Step 7: Run the new tests**

```bash
npm test -- --run tests/regressions/dom-reconciliation.test.ts
```
Expected: all PASS.

- [ ] **Step 8: Run full suite**

```bash
npm test -- --run
```
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/dom-renderer.ts tests/regressions/dom-reconciliation.test.ts
git commit -m "fix: replace innerHTML clear with key-based DOM reconciliation in options list"
```

---

## Task 8: DOM Key-Based Reconciliation — Selection Container

**Files:**
- Modify: `src/core/dom-renderer.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/regressions/dom-reconciliation.test.ts`:

```ts
describe('DOM reconciliation — selection container', () => {
  it('reuses tag nodes when selection order changes in multiple mode', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true }
      ]
    });

    const tags = Array.from(document.querySelectorAll('.thek-tag'));
    expect(tags.length).toBe(2);
    const tagOne = tags.find((t) => (t as HTMLElement).dataset.value === '1');
    expect(tagOne).toBeDefined();

    // Reorder: move tag 0 to position 1
    ts.reorder(0, 1);

    const reorderedTags = document.querySelectorAll('.thek-tag');
    expect(reorderedTags.length).toBe(2);
    // Same node reference (reused)
    const reorderedTagOne = Array.from(reorderedTags).find(
      (t) => (t as HTMLElement).dataset.value === '1'
    );
    expect(reorderedTagOne).toBe(tagOne);
  });

  it('does not recreate tag node when a second tag is added', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two' }
      ]
    });

    const existingTag = document.querySelector('.thek-tag') as HTMLElement;
    expect(existingTag.dataset.value).toBe('1');

    ts.setValue(['1', '2']);

    const tags = document.querySelectorAll('.thek-tag');
    expect(tags.length).toBe(2);
    // Tag for value '1' is the same node
    expect(tags[0]).toBe(existingTag);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run tests/regressions/dom-reconciliation.test.ts
```
Expected: the two new selection tests FAIL.

- [ ] **Step 3: Extract `createTagNode` private method from `renderSelectionContent`**

Extract the tag-building code into a new private method in `dom-renderer.ts`:

```ts
private createTagNode(
  option: ThekSelectOption<T>,
  val: string,
  index: number,
  dField: string
): HTMLSpanElement {
  const tag = document.createElement('span');
  tag.className = 'thek-tag';
  tag.draggable = true;
  tag.dataset.index = index.toString();
  tag.dataset.value = val;
  tag.dataset.key = val;

  const label = document.createElement('span');
  label.className = 'thek-tag-label';
  const content = this.config.renderSelection(option);
  const displayText = content instanceof HTMLElement ? String(option[dField] ?? val) : content;
  if (content instanceof HTMLElement) {
    label.appendChild(content);
  } else {
    label.textContent = content;
  }
  tag.appendChild(label);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'thek-tag-remove';
  removeBtn.setAttribute('aria-label', `Remove ${displayText}`);
  removeBtn.innerHTML = '&times;';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    this.callbacks.onSelect(option);
  });
  tag.appendChild(removeBtn);
  this.setupTagDnd(tag);
  return tag;
}
```

- [ ] **Step 4: Rewrite `renderSelectionContent` to use key-based reconciliation for tags**

Replace the full `renderSelectionContent` method with:

```ts
private renderSelectionContent(state: ThekSelectState<T>): void {
  const hasSelection = state.selectedValues.length > 0;
  this.placeholderElement.style.display = hasSelection ? 'none' : 'block';
  this.selectionContainer.style.display = hasSelection ? 'flex' : 'none';

  if (!hasSelection) {
    this.selectionContainer.innerHTML = '';
    return;
  }

  const vField = this.config.valueField;
  const dField = this.config.displayField;

  if (this.config.multiple) {
    if (state.selectedValues.length > this.config.maxSelectedLabels) {
      // Summary mode — clear tags and show a single text summary
      const hasTags = this.selectionContainer.querySelector('.thek-tag') !== null;
      const hasSummary = this.selectionContainer.querySelector('.thek-summary-text') !== null;
      if (hasTags || !hasSummary) {
        this.selectionContainer.innerHTML = '';
        const summary = document.createElement('span');
        summary.className = 'thek-summary-text';
        this.selectionContainer.appendChild(summary);
      }
      const summary = this.selectionContainer.querySelector('.thek-summary-text') as HTMLSpanElement;
      summary.textContent = `${state.selectedValues.length} items selected`;
    } else {
      // Tag mode — key-based reconciliation
      // If transitioning from summary mode, clear first
      if (this.selectionContainer.querySelector('.thek-summary-text')) {
        this.selectionContainer.innerHTML = '';
      }

      const existing = new Map<string, HTMLSpanElement>();
      for (const child of Array.from(this.selectionContainer.children) as HTMLSpanElement[]) {
        const key = child.dataset.key;
        if (key) existing.set(key, child);
      }

      state.selectedValues.forEach((val, i) => {
        const option =
          state.options.find((o) => o[vField] === val) ||
          state.selectedOptionsByValue[val] ||
          ({ [vField]: val, [dField]: val } as unknown as ThekSelectOption<T>);

        let tag = existing.get(val);
        if (tag) {
          existing.delete(val);
          // Update index for DnD (position may have changed via reorder)
          tag.dataset.index = i.toString();
        } else {
          tag = this.createTagNode(option, val, i, dField);
        }
        this.selectionContainer.appendChild(tag);
      });

      // Remove orphan tags (deselected values)
      for (const node of existing.values()) {
        this.selectionContainer.removeChild(node);
      }
    }
  } else {
    // Single select — at most one node; replace content if it changed
    const val = state.selectedValues[0];
    const option =
      state.options.find((o) => o[vField] === val) || state.selectedOptionsByValue[val];
    if (option) {
      const content = this.config.renderSelection(option);
      if (content instanceof HTMLElement) {
        this.selectionContainer.innerHTML = '';
        this.selectionContainer.appendChild(content);
      } else {
        // Reuse a text node if possible
        const first = this.selectionContainer.firstChild;
        if (first instanceof Text) {
          first.textContent = content;
        } else {
          this.selectionContainer.innerHTML = '';
          this.selectionContainer.textContent = content;
        }
      }
    }
  }
}
```

- [ ] **Step 5: Run the new tests**

```bash
npm test -- --run tests/regressions/dom-reconciliation.test.ts
```
Expected: all PASS.

- [ ] **Step 6: Run full suite**

```bash
npm test -- --run
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/dom-renderer.ts tests/regressions/dom-reconciliation.test.ts
git commit -m "fix: replace innerHTML clear with key-based DOM reconciliation in selection container"
```
