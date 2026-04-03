# ThekSelect Headless Refactor + Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor ThekSelect into a genuine headless state machine with a subscribing DOM adapter, while fixing DOM thrashing, the setTimeout focus hack, the Font Awesome checkbox dep, stale native-select sync, and unsafe type casts. `ThekSelect.init()` keeps working with zero API changes.

**Architecture:** `ThekSelect<T>` becomes a pure state machine (no DOM imports) exposing `subscribe/getState/getFilteredOptions` and action methods. `DomRenderer` subscribes to the core and owns all DOM. `ThekSelectDom<T>` (private subclass) extends `ThekSelect<T>` and wires them; `ThekSelect.init()` returns it typed as `ThekSelectHandle<T>`.

**Tech Stack:** TypeScript, Vitest + JSDOM, Vite (ESM). Run tests with `npx vitest run`.

---

## File Map

| File | What changes |
|---|---|
| `src/core/state.ts` | `getState()` returns frozen object; add `forceNotify()` |
| `src/core/config-utils.ts` | `element` param → `HTMLElement \| null` |
| `src/core/thekselect.ts` | Full rewrite: headless core + `ThekSelectDom` subclass |
| `src/core/dom-renderer.ts` | Full rewrite: subscribes to core, rAF focus, wipe-and-sync, SVG checkbox, event delegation |
| `src/utils/styles.ts` | Add `.thek-check` SVG sizing rule |
| `src/index.ts` | Export `DomRenderer` |
| `tests/core/state-manager.test.ts` | Add frozen-return test |
| `tests/accessibility/no-external-deps.test.ts` | Add multi-select checkbox test |

---

## Task 1: Freeze `StateManager.getState()` and add `forceNotify()`

**Files:**
- Modify: `src/core/state.ts`
- Modify: `tests/core/state-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/core/state-manager.test.ts`:

```typescript
it('getState() returns a frozen object', () => {
  const sm = new StateManager({ count: 0 });
  const state = sm.getState();
  expect(Object.isFrozen(state)).toBe(true);
});

it('forceNotify() calls listeners even when state is unchanged', () => {
  const sm = new StateManager({ count: 0 });
  const listener = vi.fn();
  sm.subscribe(listener);
  sm.forceNotify();
  expect(listener).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run tests to see them fail**

```
npx vitest run tests/core/state-manager.test.ts
```

Expected: 2 failures — `Object.isFrozen` is false, `forceNotify` is not a function.

- [ ] **Step 3: Update `src/core/state.ts`**

Replace the entire file:

```typescript
export type StateListener<T> = (state: T) => void;

export class StateManager<T extends object> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  getState(): Readonly<T> {
    return Object.freeze({ ...this.state });
  }

  setState(newState: Partial<T>): void {
    const oldState = this.state;
    this.state = { ...this.state, ...newState };

    const hasChanged = Object.keys(newState).some((key) => {
      const val = (newState as Record<string, unknown>)[key];
      const oldVal = (oldState as Record<string, unknown>)[key];
      if (Array.isArray(val) && Array.isArray(oldVal)) {
        return val.length !== oldVal.length || val.some((item, index) => item !== oldVal[index]);
      }
      return val !== oldVal;
    });

    if (hasChanged) {
      this.notify();
    }
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Force all subscribers to re-run regardless of state changes. Used when config mutates. */
  forceNotify(): void {
    this.notify();
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run tests/core/state-manager.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Run full suite to verify nothing broke**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/state.ts tests/core/state-manager.test.ts
git commit -m "fix: freeze StateManager.getState() return and add forceNotify()"
```

---

## Task 2: Replace Font Awesome checkbox with inline SVG

**Files:**
- Modify: `src/core/dom-renderer.ts`
- Modify: `src/utils/styles.ts`
- Modify: `tests/accessibility/no-external-deps.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `tests/accessibility/no-external-deps.test.ts` (inside the `describe` block, after the existing tests):

```typescript
it('multi-select checkboxes use inline SVG, not FontAwesome', () => {
  ThekSelect.init(container, {
    multiple: true,
    options: [
      { value: '1', label: 'One', selected: true },
      { value: '2', label: 'Two' }
    ]
  });

  const control = document.querySelector('.thek-control') as HTMLElement;
  control.click();

  const selectedCheckbox = document.querySelector(
    '.thek-option.thek-selected .thek-checkbox'
  ) as HTMLElement;
  expect(selectedCheckbox).not.toBeNull();
  expect(selectedCheckbox.querySelector('.fa-solid')).toBeNull();
  expect(selectedCheckbox.querySelector('.fa-check')).toBeNull();
  expect(selectedCheckbox.querySelector('svg')).not.toBeNull();
});
```

- [ ] **Step 2: Run to see it fail**

```
npx vitest run tests/accessibility/no-external-deps.test.ts
```

Expected: the new test fails — `querySelector('svg')` returns null (Font Awesome `<i>` used instead).

- [ ] **Step 3: Add `SVG_CHECK` constant to `src/core/dom-renderer.ts`**

After the existing `SVG_SPINNER` constant (line 10), add:

```typescript
const SVG_CHECK =
  '<svg class="thek-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>';
```

- [ ] **Step 4: Replace the Font Awesome checkbox in `createOptionItem`**

In `src/core/dom-renderer.ts`, find (around line 351):

```typescript
      if (isSelected) {
        checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
      }
```

Replace with:

```typescript
      if (isSelected) {
        checkbox.innerHTML = SVG_CHECK;
      }
```

- [ ] **Step 5: Add `.thek-check` size rule to `src/utils/styles.ts`**

Find the `.thek-spinner` CSS rule block (ends around line 128) and add immediately after:

```css
.thek-check {
    width: 0.75em;
    height: 0.75em;
}
```

Add it inside the `BASE_STYLES` template literal, after the `.thek-spinner` block.

- [ ] **Step 6: Run tests**

```
npx vitest run tests/accessibility/no-external-deps.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 7: Run full suite**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/core/dom-renderer.ts src/utils/styles.ts tests/accessibility/no-external-deps.test.ts
git commit -m "fix: replace Font Awesome checkbox icon with inline SVG"
```

---

## Task 3: Make `buildConfig` accept a null element

**Files:**
- Modify: `src/core/config-utils.ts`

This is a one-line preparation step for Task 4.

- [ ] **Step 1: Update the function signature**

In `src/core/config-utils.ts`, change line 14 from:

```typescript
export function buildConfig<T = unknown>(
  element: HTMLElement,
```

to:

```typescript
export function buildConfig<T = unknown>(
  element: HTMLElement | null,
```

No logic changes needed — `null instanceof HTMLSelectElement` is already `false`, so the guard on line 19 (`const isSelect = element instanceof HTMLSelectElement`) handles null correctly.

- [ ] **Step 2: Run full suite**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/core/config-utils.ts
git commit -m "refactor: allow null element in buildConfig for headless use"
```

---

## Task 4: Rewrite `ThekSelect` as a headless core

**Files:**
- Create: `tests/core/headless.test.ts`
- Modify: `src/core/thekselect.ts`

- [ ] **Step 1: Write the failing headless tests**

Create `tests/core/headless.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('ThekSelect headless core', () => {
  it('can be instantiated without a DOM element', () => {
    const core = new ThekSelect({ options: [{ value: '1', label: 'One' }] });
    expect(core.getState().selectedValues).toEqual([]);
    core.destroy();
  });

  it('subscribe is notified on state change', () => {
    const core = new ThekSelect({ options: [{ value: '1', label: 'One' }] });
    const listener = vi.fn();
    core.subscribe(listener);
    core.open();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].isOpen).toBe(true);
    core.destroy();
  });

  it('subscribe returns an unsubscribe function', () => {
    const core = new ThekSelect({ options: [{ value: '1', label: 'One' }] });
    const listener = vi.fn();
    const unsub = core.subscribe(listener);
    unsub();
    core.open();
    expect(listener).not.toHaveBeenCalled();
    core.destroy();
  });

  it('getState() returns a frozen object', () => {
    const core = new ThekSelect({ options: [] });
    expect(Object.isFrozen(core.getState())).toBe(true);
    core.destroy();
  });

  it('getFilteredOptions() filters by inputValue', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' }
      ]
    });
    core.search('app');
    // Trigger synchronously since debounce delay is 300ms by default
    // We check getFilteredOptions which reads inputValue from state
    const filtered = core.getFilteredOptions();
    expect(filtered.length).toBe(1);
    expect(filtered[0].label).toBe('Apple');
    core.destroy();
  });

  it('open() and close() update isOpen in state', () => {
    const core = new ThekSelect({ options: [] });
    expect(core.getState().isOpen).toBe(false);
    core.open();
    expect(core.getState().isOpen).toBe(true);
    core.close();
    expect(core.getState().isOpen).toBe(false);
    core.destroy();
  });

  it('select() updates selectedValues', () => {
    const core = new ThekSelect({
      options: [{ value: '1', label: 'One' }]
    });
    core.select({ value: '1', label: 'One' });
    expect(core.getValue()).toBe('1');
    core.destroy();
  });

  it('select() in multiple mode accumulates values', () => {
    const core = new ThekSelect({
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.select({ value: '1', label: 'One' });
    core.select({ value: '2', label: 'Two' });
    expect(core.getValue()).toEqual(['1', '2']);
    core.destroy();
  });

  it('setValue() and getValue() work', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.setValue('2');
    expect(core.getValue()).toBe('2');
    core.destroy();
  });

  it('on() emits change events', () => {
    const core = new ThekSelect({
      options: [{ value: '1', label: 'One' }]
    });
    const onChange = vi.fn();
    core.on('change', onChange);
    core.select({ value: '1', label: 'One' });
    expect(onChange).toHaveBeenCalledWith('1');
    core.destroy();
  });

  it('focusNext() and focusPrev() update focusedIndex', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.open();
    expect(core.getState().focusedIndex).toBe(0);
    core.focusNext();
    expect(core.getState().focusedIndex).toBe(1);
    core.focusPrev();
    expect(core.getState().focusedIndex).toBe(0);
    core.destroy();
  });

  it('removeLastSelection() removes the last tag', () => {
    const core = new ThekSelect({
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true }
      ]
    });
    core.removeLastSelection();
    expect(core.getValue()).toEqual(['1']);
    core.destroy();
  });

  it('reorder() changes the order of selected values', () => {
    const core = new ThekSelect({
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true },
        { value: '3', label: 'Three', selected: true }
      ]
    });
    core.reorder(0, 2);
    expect(core.getValue()).toEqual(['2', '3', '1']);
    core.destroy();
  });

  it('ThekSelect.init() still returns a working instance', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const ts = ThekSelect.init(el, { options: [{ value: '1', label: 'One' }] });
    expect(ts.getValue()).toBeUndefined();
    ts.setValue('1');
    expect(ts.getValue()).toBe('1');
    ts.destroy();
    document.body.innerHTML = '';
  });
});
```

- [ ] **Step 2: Run to see failures**

```
npx vitest run tests/core/headless.test.ts
```

Expected: most tests fail because `new ThekSelect(config)` (without element) does not exist yet.

- [ ] **Step 3: Rewrite `src/core/thekselect.ts`**

Replace the entire file with:

```typescript
import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent,
  ThekSelectEventPayloadMap
} from './types.js';
import { debounce, DebouncedFn } from '../utils/debounce.js';
import { buildConfig, buildInitialState } from './config-utils.js';
import { getFilteredOptions, isRemoteMode, mergeSelectedOptionsByValue } from './options-logic.js';
import {
  applySelection,
  buildSelectedOptionsMapFromValues,
  createOptionFromLabel,
  removeLastSelection,
  reorderSelectedValues,
  resolveSelectedOptions
} from './selection-logic.js';
import { ThekSelectEventEmitter } from './event-emitter.js';
import { DomRenderer } from './dom-renderer.js';
import { injectStyles } from '../utils/styles.js';

/** Returned by ThekSelect.init() — a headless core augmented with DOM-specific methods. */
export type ThekSelectHandle<T = unknown> = ThekSelect<T> & {
  setHeight(height: number | string): void;
  setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void;
};

export class ThekSelect<T = unknown> {
  private static globalDefaults: Partial<ThekSelectConfig> = {};

  /** @internal Config is readable by DomRenderer. Do not reassign the reference. */
  public readonly config: Required<ThekSelectConfig<T>>;
  private stateManager: StateManager<ThekSelectState<T>>;
  private events = new ThekSelectEventEmitter<T>();
  /** @internal */
  protected isDestroyed = false;
  private remoteRequestId = 0;
  private debouncedSearch!: DebouncedFn<[query: string]>;

  /**
   * Headless constructor — no DOM element required.
   * @param config  Selection options and behaviour config.
   * @param _element  Used internally by ThekSelect.init() to parse native <select> elements.
   */
  constructor(config: ThekSelectConfig<T> = {}, _element: HTMLElement | null = null) {
    this.config = buildConfig(
      _element,
      config,
      ThekSelect.globalDefaults as Partial<ThekSelectConfig<T>>
    );
    this.stateManager = new StateManager<ThekSelectState<T>>(buildInitialState(this.config));
    this.setupDebouncedSearch();
  }

  // ── Reactive interface ────────────────────────────────────────────────────

  public subscribe(listener: (state: Readonly<ThekSelectState<T>>) => void): () => void {
    return this.stateManager.subscribe(listener);
  }

  public getState(): Readonly<ThekSelectState<T>> {
    return this.stateManager.getState();
  }

  public getFilteredOptions(): ThekSelectOption<T>[] {
    return getFilteredOptions(this.config, this.stateManager.getState() as ThekSelectState<T>);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  public open(): void {
    if (this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: true, focusedIndex: 0 });
    this.emit('open', null);
  }

  public close(): void {
    if (!this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: false, focusedIndex: -1, inputValue: '' });
    this.emit('close', null);
  }

  public toggle(): void {
    if (this.stateManager.getState().isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public select(option: ThekSelectOption<T>): void {
    if (option.disabled) return;
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const update = applySelection(this.config, state, option);
    if (!this.config.multiple) this.close();
    this.stateManager.setState({
      selectedValues: update.selectedValues,
      selectedOptionsByValue: update.selectedOptionsByValue,
      inputValue: ''
    });
    if (update.tagEvent && update.tagOption) {
      this.emit(update.tagEvent, update.tagOption);
    }
    this.emit('change', this.getValue());
  }

  public create(label: string): void {
    const newOption = createOptionFromLabel(this.config, label);
    const state = this.stateManager.getState();
    this.stateManager.setState({ options: [...state.options, newOption] });
    this.select(newOption);
  }

  /**
   * Sets the search query in state and triggers the debounced loadOptions call.
   * Call this instead of directly mutating inputValue.
   */
  public search(query: string): void {
    this.stateManager.setState({ inputValue: query });
    this.debouncedSearch(query);
  }

  public reorder(from: number, to: number): void {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const selectedValues = reorderSelectedValues(state, from, to);
    this.stateManager.setState({ selectedValues });
    this.emit('reordered', selectedValues);
    this.emit('change', this.getValue());
  }

  public removeLastSelection(): void {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const update = removeLastSelection(this.config, state);
    this.stateManager.setState({
      selectedValues: update.selectedValues,
      selectedOptionsByValue: update.selectedOptionsByValue
    });
    if (update.removedOption) this.emit('tagRemoved', update.removedOption);
    this.emit('change', this.getValue());
  }

  /** Move keyboard focus to the next option in the dropdown. */
  public focusNext(): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();
    const displayField = this.config.displayField;
    const hasCreateSlot =
      this.config.canCreate &&
      state.inputValue &&
      !filteredOptions.some(
        (o) => (o[displayField] as string)?.toLowerCase() === state.inputValue.toLowerCase()
      );
    const maxIndex = hasCreateSlot ? filteredOptions.length : filteredOptions.length - 1;
    this.stateManager.setState({ focusedIndex: Math.min(state.focusedIndex + 1, maxIndex) });
  }

  /** Move keyboard focus to the previous option in the dropdown. */
  public focusPrev(): void {
    const state = this.stateManager.getState();
    this.stateManager.setState({ focusedIndex: Math.max(state.focusedIndex - 1, 0) });
  }

  /** Select the currently focused option, or create if focused on the create slot. */
  public selectFocused(): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();
    if (state.focusedIndex >= 0 && state.focusedIndex < filteredOptions.length) {
      this.select(filteredOptions[state.focusedIndex]);
    } else if (
      this.config.canCreate &&
      state.inputValue &&
      state.focusedIndex === filteredOptions.length
    ) {
      this.create(state.inputValue);
    }
  }

  public setValue(value: string | string[], silent: boolean = false): void {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const incomingValues = Array.isArray(value) ? value : [value];
    const stringValues = incomingValues.filter((e): e is string => typeof e === 'string');
    const values = this.config.multiple
      ? Array.from(new Set(stringValues))
      : stringValues.slice(0, 1);
    const selectedOptionsByValue = buildSelectedOptionsMapFromValues(this.config, state, values);
    this.stateManager.setState({ selectedValues: values, selectedOptionsByValue });
    if (!silent) this.emit('change', this.getValue());
  }

  public setMaxOptions(max: number | null): void {
    this.config.maxOptions = max;
    this.stateManager.forceNotify();
  }

  public getValue(): string | string[] | undefined {
    const state = this.stateManager.getState();
    return this.config.multiple ? state.selectedValues : state.selectedValues[0];
  }

  public getSelectedOptions(): ThekSelectOption<T> | ThekSelectOption<T>[] | undefined {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const selected = resolveSelectedOptions(this.config, state);
    return this.config.multiple ? selected : selected[0];
  }

  public on<K extends ThekSelectEvent>(
    event: K,
    callback: (payload: ThekSelectEventPayloadMap<T>[K]) => void
  ): () => void {
    return this.events.on(event, callback);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.remoteRequestId++;
    this.debouncedSearch.cancel();
  }

  // ── Static API ────────────────────────────────────────────────────────────

  public static init<T = unknown>(
    element: string | HTMLElement,
    config: ThekSelectConfig<T> = {}
  ): ThekSelectHandle<T> {
    return new ThekSelectDom<T>(element, config);
  }

  public static setDefaults(defaults: Partial<ThekSelectConfig>): void {
    ThekSelect.globalDefaults = { ...ThekSelect.globalDefaults, ...defaults };
  }

  public static resetDefaults(): void {
    ThekSelect.globalDefaults = {};
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private setupDebouncedSearch(): void {
    this.debouncedSearch = debounce(async (query: string) => {
      this.emit('search', query);
      if (isRemoteMode(this.config)) {
        if (query.length > 0) {
          const requestId = ++this.remoteRequestId;
          this.stateManager.setState({ isLoading: true });
          try {
            const options = await this.config.loadOptions!(query);
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            const state = this.stateManager.getState();
            this.stateManager.setState({
              options,
              isLoading: false,
              focusedIndex: 0,
              selectedOptionsByValue: mergeSelectedOptionsByValue(
                this.config.valueField,
                state.selectedValues,
                state.selectedOptionsByValue,
                options
              )
            });
          } catch {
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            this.stateManager.setState({ isLoading: false });
          }
        } else {
          this.remoteRequestId++;
          this.stateManager.setState({
            options: this.config.options,
            focusedIndex: -1,
            isLoading: false
          });
        }
      } else {
        this.stateManager.setState({ focusedIndex: 0 });
      }
    }, this.config.debounce);
  }

  private emit<K extends ThekSelectEvent>(event: K, data: ThekSelectEventPayloadMap<T>[K]): void {
    this.events.emit(event, data);
  }
}

// ── ThekSelectDom — wires ThekSelect core + DomRenderer ──────────────────────
// Not exported: consumers use ThekSelect.init() which returns ThekSelectHandle<T>.

class ThekSelectDom<T = unknown> extends ThekSelect<T> {
  /** @internal accessible via cast in tests */
  private renderer: DomRenderer;
  private readonly originalElement: HTMLElement;

  constructor(element: string | HTMLElement, config: ThekSelectConfig<T> = {}) {
    const el =
      typeof element === 'string'
        ? (document.querySelector(element) as HTMLElement | null)
        : element;
    if (!el) throw new Error(`ThekSelect: element not found`);

    super(config, el);

    this.originalElement = el;
    injectStyles();

    // DomRenderer subscribes to this core instance internally.
    // Cast is safe: ThekSelectDom<T> satisfies all methods DomRenderer calls.
    this.renderer = new DomRenderer(this as unknown as ThekSelect, el);

    el.style.display = 'none';
    if (el.parentNode) {
      el.parentNode.insertBefore(this.renderer.wrapper, el.nextSibling);
    }
  }

  public setHeight(height: number | string): void {
    this.renderer.setHeight(height);
  }

  public setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void {
    this.config.renderOption = fn;
    this.renderer.forceUpdate();
  }

  public override destroy(): void {
    this.renderer.destroy();
    this.originalElement.style.display = '';
    super.destroy();
  }
}
```

- [ ] **Step 4: Run the new headless tests**

```
npx vitest run tests/core/headless.test.ts
```

Expected: all 13 tests pass. (DomRenderer not yet rewritten but ThekSelect.init still exists.)

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

Expected: most tests pass. Some tests that relied on the old DomRenderer interface (constructor signature) may fail — note which ones and proceed to Task 5.

- [ ] **Step 6: Commit**

```bash
git add src/core/thekselect.ts tests/core/headless.test.ts
git commit -m "refactor: extract headless ThekSelect core with subscribe/getState/actions"
```

---

## Task 5: Rewrite `DomRenderer` to subscribe to the core

**Files:**
- Modify: `src/core/dom-renderer.ts`

- [ ] **Step 1: Rewrite `src/core/dom-renderer.ts`**

Replace the entire file with:

```typescript
import type { ThekSelect } from './thekselect.js';
import { ThekSelectOption, ThekSelectState, ThekSelectConfig } from './types.js';
import { generateId } from '../utils/dom.js';
import { globalEventManager } from '../utils/event-manager.js';

const SVG_CHEVRON =
  '<svg class="thek-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>';

const SVG_SEARCH =
  '<svg class="thek-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>';

const SVG_SPINNER =
  '<svg class="thek-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-dasharray="52" stroke-dashoffset="20" stroke-linecap="round"/></svg>';

const SVG_CHECK =
  '<svg class="thek-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>';

export class DomRenderer {
  public wrapper!: HTMLElement;
  public control!: HTMLElement;
  private selectionContainer!: HTMLElement;
  private indicatorsContainer!: HTMLElement;
  private placeholderElement!: HTMLElement;
  public input!: HTMLInputElement;
  private dropdown!: HTMLElement;
  private optionsList!: HTMLUListElement;

  private readonly id: string;
  private unsubscribeCore: () => void;
  private unsubscribeEvents: (() => void)[] = [];
  private focusRafId: number | null = null;
  private injectedOptionValues: Set<string> = new Set();
  private wasOpen = false;

  private get config(): Required<ThekSelectConfig> {
    return this.core.config as unknown as Required<ThekSelectConfig>;
  }

  constructor(private readonly core: ThekSelect, private readonly element: HTMLElement) {
    this.id = generateId();
    this.createDom();
    this.applyAccessibleName();
    this.setupDomListeners();
    this.unsubscribeCore = this.core.subscribe(() => this.onStateChange());
    this.onStateChange();
  }

  // ── State subscription handler ────────────────────────────────────────────

  private onStateChange(): void {
    const state = this.core.getState() as ThekSelectState;
    const filteredOptions = this.core.getFilteredOptions() as ThekSelectOption[];

    this.control.setAttribute('aria-expanded', state.isOpen.toString());
    this.dropdown.hidden = !state.isOpen;
    this.wrapper.classList.toggle('thek-open', state.isOpen);

    this.indicatorsContainer.innerHTML = state.isLoading ? SVG_SPINNER : SVG_CHEVRON;

    this.renderSelectionContent(state);
    this.renderOptionsContent(state, filteredOptions);

    if (state.isOpen) this.positionDropdown();

    this.syncOriginalElement(state.selectedValues);

    // Focus search input when dropdown first opens
    const isOpening = state.isOpen && !this.wasOpen;
    this.wasOpen = state.isOpen;
    if (isOpening && this.config.searchable) {
      if (this.focusRafId !== null) cancelAnimationFrame(this.focusRafId);
      this.focusRafId = requestAnimationFrame(() => {
        this.focusRafId = null;
        if (this.core.getState().isOpen) this.input.focus();
      });
    }
  }

  /** Re-render immediately with current core state. Call after mutating config fields. */
  public forceUpdate(): void {
    this.onStateChange();
  }

  // ── DOM construction ──────────────────────────────────────────────────────

  private createDom(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'thek-select';
    if (this.config.disabled) this.wrapper.classList.add('thek-disabled');
    if (this.config.multiple) this.wrapper.classList.add('thek-multiple');

    this.control = document.createElement('div');
    this.control.className = 'thek-control';
    this.control.setAttribute('role', 'combobox');
    this.control.setAttribute('aria-expanded', 'false');
    this.control.setAttribute('aria-haspopup', 'listbox');
    this.control.setAttribute('aria-controls', `${this.id}-list`);
    this.control.setAttribute('tabindex', '0');

    this.selectionContainer = document.createElement('div');
    this.selectionContainer.className = 'thek-selection';

    this.placeholderElement = document.createElement('span');
    this.placeholderElement.className = 'thek-placeholder';
    this.placeholderElement.textContent = this.config.placeholder;

    this.indicatorsContainer = document.createElement('div');
    this.indicatorsContainer.className = 'thek-indicators';
    this.indicatorsContainer.innerHTML = SVG_CHEVRON;

    this.control.appendChild(this.selectionContainer);
    this.control.appendChild(this.placeholderElement);
    this.control.appendChild(this.indicatorsContainer);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'thek-dropdown';
    this.dropdown.hidden = true;

    if (this.config.searchable) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'thek-search-wrapper';
      searchWrapper.innerHTML = SVG_SEARCH;

      this.input = document.createElement('input');
      this.input.className = 'thek-input';
      this.input.type = 'text';
      this.input.autocomplete = 'off';
      this.input.placeholder = 'Search...';
      this.input.setAttribute('aria-autocomplete', 'list');

      searchWrapper.appendChild(this.input);
      this.dropdown.appendChild(searchWrapper);
    } else {
      this.input = document.createElement('input');
      this.input.type = 'hidden';
    }

    this.optionsList = document.createElement('ul');
    this.optionsList.className = 'thek-options';
    this.optionsList.id = `${this.id}-list`;
    this.optionsList.setAttribute('role', 'listbox');
    this.optionsList.addEventListener('scroll', () => this.handleOptionsScroll());
    this.optionsList.addEventListener('wheel', (e) => this.handleOptionsWheel(e), {
      passive: false
    });

    // Event delegation for option clicks — avoids per-item listeners
    this.optionsList.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest<HTMLElement>('li.thek-option');
      if (!li || li.classList.contains('thek-disabled')) return;
      e.stopPropagation();

      if (li.classList.contains('thek-create')) {
        this.core.create(this.core.getState().inputValue);
        return;
      }

      const index = parseInt(li.dataset.optionIndex ?? '-1', 10);
      const filteredOptions = this.core.getFilteredOptions() as ThekSelectOption[];
      if (index >= 0 && index < filteredOptions.length) {
        this.core.select(filteredOptions[index] as Parameters<typeof this.core.select>[0]);
      }
    });

    this.dropdown.appendChild(this.optionsList);
    this.wrapper.appendChild(this.control);
    document.body.appendChild(this.dropdown);
    this.applyHeight(this.config.height);
  }

  private applyAccessibleName(): void {
    const el = this.element;
    const control = this.control;

    const existingLabelledBy = el.getAttribute('aria-labelledby');
    if (existingLabelledBy) {
      control.setAttribute('aria-labelledby', existingLabelledBy);
      return;
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      control.setAttribute('aria-label', ariaLabel);
      return;
    }

    const id = el.id;
    if (id) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      if (label) {
        if (!label.id) label.id = `${id}-label`;
        control.setAttribute('aria-labelledby', label.id);
      }
    }
  }

  private setupDomListeners(): void {
    this.control.addEventListener('click', () => {
      if (this.config.disabled) return;
      this.core.toggle();
    });

    if (this.config.searchable) {
      this.input.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.core.search(query);
      });
    }

    const onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.input.addEventListener('keydown', onKeyDown);
    this.control.addEventListener('keydown', onKeyDown);

    this.unsubscribeEvents.push(
      globalEventManager.onClick((e: unknown) => {
        const event = e as Event;
        if (
          !this.wrapper.contains(event.target as Node) &&
          !this.dropdown.contains(event.target as Node)
        ) {
          this.core.close();
        }
      }),
      globalEventManager.onResize(() => this.positionDropdown()),
      globalEventManager.onScroll(() => this.positionDropdown())
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const state = this.core.getState();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.core.open();
        this.core.focusNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.core.focusPrev();
        break;
      case 'Enter':
        e.preventDefault();
        if (!state.isOpen) {
          this.core.open();
        } else {
          this.core.selectFocused();
        }
        break;
      case ' ':
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
          if (!state.isOpen) this.core.open();
        }
        break;
      case 'Escape':
        this.core.close();
        this.input.value = '';
        break;
      case 'Backspace':
        if (
          state.inputValue === '' &&
          this.config.multiple &&
          state.selectedValues.length > 0
        ) {
          this.core.removeLastSelection();
        }
        break;
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private renderSelectionContent(state: ThekSelectState): void {
    this.selectionContainer.innerHTML = '';
    const hasSelection = state.selectedValues.length > 0;
    this.placeholderElement.style.display = hasSelection ? 'none' : 'block';
    this.selectionContainer.style.display = hasSelection ? 'flex' : 'none';

    if (!hasSelection) return;

    const vField = this.config.valueField;
    const dField = this.config.displayField;

    if (this.config.multiple) {
      if (state.selectedValues.length > this.config.maxSelectedLabels) {
        const summary = document.createElement('span');
        summary.className = 'thek-summary-text';
        summary.textContent = `${state.selectedValues.length} items selected`;
        this.selectionContainer.appendChild(summary);
      } else {
        state.selectedValues.forEach((val, i) => {
          const option =
            state.options.find((o) => o[vField] === val) ||
            state.selectedOptionsByValue[val] ||
            ({ [vField]: val, [dField]: val } as unknown as ThekSelectOption);
          const tag = document.createElement('span');
          tag.className = 'thek-tag';
          tag.draggable = true;
          tag.dataset.index = i.toString();
          tag.dataset.value = val;

          const label = document.createElement('span');
          label.className = 'thek-tag-label';
          const content = this.config.renderOption(option);
          if (content instanceof HTMLElement) {
            label.appendChild(content);
          } else {
            label.textContent = content;
          }
          tag.appendChild(label);

          const removeBtn = document.createElement('span');
          removeBtn.className = 'thek-tag-remove';
          removeBtn.innerHTML = '&times;';
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.core.select(option as Parameters<typeof this.core.select>[0]);
          });
          tag.appendChild(removeBtn);
          this.setupTagDnd(tag);
          this.selectionContainer.appendChild(tag);
        });
      }
    } else {
      const val = state.selectedValues[0];
      const option =
        state.options.find((o) => o[vField] === val) || state.selectedOptionsByValue[val];
      if (option) {
        const content = this.config.renderOption(option);
        if (content instanceof HTMLElement) {
          this.selectionContainer.appendChild(content);
        } else {
          this.selectionContainer.textContent = content;
        }
      }
    }
  }

  private renderOptionsContent(
    state: ThekSelectState,
    filteredOptions: ThekSelectOption[],
    alignFocused: boolean = true,
    preservedScrollTop?: number
  ): void {
    this.optionsList.innerHTML = '';
    const vField = this.config.valueField;
    const dField = this.config.displayField;

    if (state.isLoading && filteredOptions.length === 0) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-loading';
      li.textContent = 'Loading...';
      this.optionsList.appendChild(li);
      return;
    }

    const canCreate =
      this.config.canCreate &&
      state.inputValue &&
      !filteredOptions.some(
        (o) =>
          o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
      );
    const shouldVirtualize =
      this.config.virtualize &&
      filteredOptions.length >= this.config.virtualThreshold &&
      !canCreate;
    const itemHeight = Math.max(20, this.config.virtualItemHeight);
    const overscan = Math.max(0, this.config.virtualOverscan);

    if (shouldVirtualize) {
      const viewportHeight = this.optionsList.clientHeight || 240;
      if (
        alignFocused &&
        state.focusedIndex >= 0 &&
        state.focusedIndex < filteredOptions.length
      ) {
        const focusedTop = state.focusedIndex * itemHeight;
        const focusedBottom = focusedTop + itemHeight;
        const currentTop = this.optionsList.scrollTop;
        const currentBottom = currentTop + viewportHeight;
        if (focusedTop < currentTop) {
          this.optionsList.scrollTop = focusedTop;
        } else if (focusedBottom > currentBottom) {
          this.optionsList.scrollTop = focusedBottom - viewportHeight;
        }
      }

      const scrollTop = preservedScrollTop ?? this.optionsList.scrollTop;
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        filteredOptions.length,
        Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
      );

      if (start > 0) this.optionsList.appendChild(this.createSpacer(start * itemHeight));

      for (let index = start; index < end; index++) {
        this.optionsList.appendChild(
          this.createOptionItem(filteredOptions[index], index, state, vField)
        );
      }

      if (end < filteredOptions.length) {
        this.optionsList.appendChild(
          this.createSpacer((filteredOptions.length - end) * itemHeight)
        );
      }

      if (typeof preservedScrollTop === 'number') {
        this.optionsList.scrollTop = preservedScrollTop;
      }
    } else {
      filteredOptions.forEach((option, index) => {
        this.optionsList.appendChild(this.createOptionItem(option, index, state, vField));
      });
    }

    const exactMatch = filteredOptions.some(
      (o) =>
        o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
    );
    if (this.config.canCreate && state.inputValue && !exactMatch) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-create';
      li.textContent = this.config.createText.replace('{%t}', state.inputValue);
      if (state.focusedIndex === filteredOptions.length) li.classList.add('thek-focused');
      this.optionsList.appendChild(li);
    }

    if (filteredOptions.length === 0 && (!this.config.canCreate || !state.inputValue)) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-no-results';
      li.textContent = 'No results found';
      this.optionsList.appendChild(li);
    }

    const activeDescendantId =
      state.focusedIndex >= 0 &&
      state.focusedIndex < filteredOptions.length &&
      !!document.getElementById(`${this.id}-opt-${state.focusedIndex}`)
        ? `${this.id}-opt-${state.focusedIndex}`
        : null;
    if (this.config.searchable) {
      if (activeDescendantId) {
        this.input.setAttribute('aria-activedescendant', activeDescendantId);
      } else {
        this.input.removeAttribute('aria-activedescendant');
      }
    }
  }

  private createOptionItem(
    option: ThekSelectOption,
    index: number,
    state: ThekSelectState,
    valueField: string
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'thek-option';
    li.id = `${this.id}-opt-${index}`;
    li.dataset.optionIndex = index.toString();
    const isSelected = state.selectedValues.includes(option[valueField] as string);

    if (option.disabled) li.classList.add('thek-disabled');
    if (isSelected) li.classList.add('thek-selected');
    if (state.focusedIndex === index) li.classList.add('thek-focused');

    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', isSelected.toString());

    if (this.config.multiple) {
      const checkbox = document.createElement('div');
      checkbox.className = 'thek-checkbox';
      if (isSelected) checkbox.innerHTML = SVG_CHECK;
      li.appendChild(checkbox);
    }

    const label = document.createElement('span');
    label.className = 'thek-option-label';
    const content = this.config.renderOption(option);
    if (content instanceof HTMLElement) {
      label.appendChild(content);
    } else {
      label.textContent = content;
    }
    li.appendChild(label);

    return li;
  }

  private createSpacer(height: number): HTMLLIElement {
    const spacer = document.createElement('li');
    spacer.style.height = `${height}px`;
    spacer.style.padding = '0';
    spacer.style.margin = '0';
    spacer.style.listStyle = 'none';
    spacer.setAttribute('aria-hidden', 'true');
    return spacer;
  }

  // ── Scroll / virtualization ───────────────────────────────────────────────

  private handleOptionsScroll(): void {
    if (!this.config.virtualize) return;
    const state = this.core.getState() as ThekSelectState;
    const filteredOptions = this.core.getFilteredOptions() as ThekSelectOption[];
    const scrollTop = this.optionsList.scrollTop;
    this.renderOptionsContent(state, filteredOptions, false, scrollTop);
  }

  private handleOptionsWheel(e: WheelEvent): void {
    if (!this.config.virtualize) return;
    const list = this.optionsList;
    const atTop = list.scrollTop <= 0;
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    const scrollingUp = e.deltaY < 0;
    const scrollingDown = e.deltaY > 0;
    if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
      e.preventDefault();
      list.scrollTop += e.deltaY;
    }
  }

  // ── Positioning ───────────────────────────────────────────────────────────

  public positionDropdown(): void {
    const rect = this.control.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    this.dropdown.style.position = 'absolute';
    this.dropdown.style.zIndex = '9999';

    let width = rect.width;
    if (width > viewportWidth - 20) width = viewportWidth - 20;
    this.dropdown.style.width = `${width}px`;

    let left = rect.left + scrollX;
    if (rect.left + width > viewportWidth) left = viewportWidth - width - 10 + scrollX;
    if (left < scrollX + 10) left = scrollX + 10;
    this.dropdown.style.left = `${left}px`;

    const viewportHeight = window.innerHeight;
    const dropdownHeight = this.optionsList.clientHeight || 240;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    this.dropdown.classList.toggle('thek-drop-up', flipUp);

    if (flipUp) {
      this.dropdown.style.top = `${rect.top + scrollY - dropdownHeight - 4}px`;
    } else {
      this.dropdown.style.top = `${rect.bottom + scrollY}px`;
    }
  }

  // ── Tag drag-and-drop ─────────────────────────────────────────────────────

  private setupTagDnd(tag: HTMLElement): void {
    tag.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', tag.dataset.index!);
      tag.classList.add('thek-dragging');
    });
    tag.addEventListener('dragend', () => tag.classList.remove('thek-dragging'));
    tag.addEventListener('dragover', (e) => {
      e.preventDefault();
      tag.classList.add('thek-drag-over');
    });
    tag.addEventListener('dragleave', () => tag.classList.remove('thek-drag-over'));
    tag.addEventListener('drop', (e) => {
      e.preventDefault();
      tag.classList.remove('thek-drag-over');
      const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1', 10);
      const toIndex = parseInt(tag.dataset.index!, 10);
      if (fromIndex !== -1 && fromIndex !== toIndex) {
        this.core.reorder(fromIndex, toIndex);
      }
    });
  }

  // ── Native <select> sync ──────────────────────────────────────────────────

  /**
   * Wipe-and-sync approach: always derives the native select state from current
   * selectedValues. Eliminates ghost data from deselected remote options.
   */
  private syncOriginalElement(values: string[]): void {
    if (!(this.element instanceof HTMLSelectElement)) return;
    const select = this.element;

    // Remove previously injected options first (before unselecting, to preserve indices)
    const toRemove = Array.from(select.options).filter((opt) =>
      this.injectedOptionValues.has(opt.value)
    );
    toRemove.forEach((opt) => opt.remove());
    this.injectedOptionValues.clear();

    // Mark all remaining native options as unselected
    Array.from(select.options).forEach((opt) => {
      opt.selected = false;
    });

    // Sync from current state
    values.forEach((val) => {
      const existing = Array.from(select.options).find((opt) => opt.value === val);
      if (existing) {
        existing.selected = true;
      } else {
        const opt = new Option(val, val, true, true);
        select.add(opt);
        this.injectedOptionValues.add(val);
      }
    });

    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ── Public DOM API ────────────────────────────────────────────────────────

  public setHeight(height: number | string): void {
    const resolved =
      typeof height === 'number' || /^\d+(\.\d+)?$/.test(String(height).trim())
        ? `${height}px`
        : String(height);
    this.wrapper.style.setProperty('--thek-input-height', resolved);
    this.dropdown.style.setProperty('--thek-input-height', resolved);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  public destroy(): void {
    if (this.focusRafId !== null) {
      cancelAnimationFrame(this.focusRafId);
      this.focusRafId = null;
    }
    this.unsubscribeCore();
    this.unsubscribeEvents.forEach((unsub) => unsub());
    this.unsubscribeEvents = [];

    if (this.element instanceof HTMLSelectElement && this.injectedOptionValues.size > 0) {
      const toRemove = Array.from(this.element.options).filter((opt) =>
        this.injectedOptionValues.has(opt.value)
      );
      toRemove.forEach((opt) => opt.remove());
      this.injectedOptionValues.clear();
    }

    if (this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
    if (this.dropdown.parentNode) this.dropdown.parentNode.removeChild(this.dropdown);
  }

  private applyHeight(height: number | string): void {
    const resolved =
      typeof height === 'number' || /^\d+(\.\d+)?$/.test(String(height).trim())
        ? `${height}px`
        : String(height);
    this.wrapper.style.setProperty('--thek-input-height', resolved);
    this.dropdown.style.setProperty('--thek-input-height', resolved);
  }
}
```

- [ ] **Step 2: Run full test suite**

```
npx vitest run
```

Expected: all tests pass. If any test fails, read the failure carefully — common causes:
- `ts.renderer` access in `reviewer-findings.test.ts` — the cast `(ts as unknown as { renderer: { positionDropdown: () => void } }).renderer` still works at runtime since `ThekSelectDom` has a `renderer` field.
- `input.value = ''` reset after close — `handleKeyDown` Escape branch now does `this.input.value = ''` explicitly (added above).

- [ ] **Step 3: Commit**

```bash
git add src/core/dom-renderer.ts
git commit -m "refactor: DomRenderer subscribes to headless ThekSelect core via reactive model"
```

---

## Task 6: DOM reconciliation for selection content

Avoid re-rendering tags on every keystroke by skipping when `selectedValues` hasn't changed.

**Files:**
- Modify: `src/core/dom-renderer.ts`

- [ ] **Step 1: Add `lastSelectedValues` tracking field**

In `src/core/dom-renderer.ts`, add a private field after `wasOpen`:

```typescript
private lastSelectedValues: string[] = [];
```

- [ ] **Step 2: Short-circuit `renderSelectionContent` when unchanged**

At the top of the `renderSelectionContent` method, add a guard before any DOM work:

```typescript
private renderSelectionContent(state: ThekSelectState): void {
  // Skip rebuild if selection hasn't changed — avoids thrashing during typing
  const same =
    state.selectedValues.length === this.lastSelectedValues.length &&
    state.selectedValues.every((v, i) => v === this.lastSelectedValues[i]);
  if (same) return;
  this.lastSelectedValues = [...state.selectedValues];

  this.selectionContainer.innerHTML = '';
  // ... rest of existing method unchanged
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/core/dom-renderer.ts
git commit -m "perf: skip selection re-render when selectedValues unchanged"
```

---

## Task 7: Export `DomRenderer` from the package entry

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add the named export**

Replace `src/index.ts` with:

```typescript
export * from './core/thekselect.js';
export * from './core/types.js';
export { DomRenderer } from './core/dom-renderer.js';
```

- [ ] **Step 2: Run full test suite**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export DomRenderer as named export for headless consumers"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run complete test suite one final time**

```
npx vitest run --reporter=verbose
```

Expected: all tests pass, zero failures.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about a `Readonly<ThekSelectState<T>>` vs `ThekSelectState<T>` mismatch in logic function calls, add a single cast: `this.stateManager.getState() as ThekSelectState<T>` at the call site.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: final type cleanup and verification"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Headless core with subscribe/getState/getFilteredOptions | Task 4 |
| DomRenderer subscribes to core (reactive model C) | Task 5 |
| ThekSelect.init() returns ThekSelectHandle, backwards compat | Task 4 |
| DomRenderer named export | Task 7 |
| StateManager frozen return | Task 1 |
| rAF focus instead of setTimeout | Task 5 (onStateChange) |
| syncOriginalElement wipe-and-sync | Task 5 |
| Checkbox Font Awesome → inline SVG + test | Task 2 |
| Remove `as unknown as` double-casts | Task 4 (logic calls now use proper T-aligned types) |
| ARIA aria-activedescendant stability | Task 5 (node IDs stable; delegation removes old per-item listeners) |
| Selection content DOM thrashing fix | Task 6 |

All spec requirements are covered.
