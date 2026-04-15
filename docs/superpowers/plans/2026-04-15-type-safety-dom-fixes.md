# Type Safety Redesign + DOM Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `T` in `ThekSelectConfig<T>` to be the full option shape (not the `data` payload), making `valueField`/`displayField` typed as `keyof T & string`; replace all `innerHTML = ''` with `replaceChildren()`; and guard virtual scroll spacer DOM moves.

**Architecture:** Type changes cascade outward from `types.ts` → logic files → renderer files → core class. DOM fixes in the renderer files are independent and are applied first. The default option shape (`ThekSelectOption`) is unchanged, so all existing tests that use `{ value, label }` options continue to work without modification.

**Tech Stack:** TypeScript, Vitest (test runner + `expectTypeOf`), jsdom (test env), `vi.spyOn` for DOM spy tests.

---

### Task 1: DOM fixes — `replaceChildren()` and spacer guard

**Files:**

- Modify: `packages/thekselect/src/core/renderer/selection-renderer.ts`
- Modify: `packages/thekselect/src/core/renderer/options-renderer.ts`
- Modify: `packages/thekselect/tests/features/virtualization.test.ts`

- [ ] **Step 1: Write a failing test for the spacer guard**

Add to the bottom of `packages/thekselect/tests/features/virtualization.test.ts`:

```ts
import { renderOptionsContent } from '../../src/core/renderer/options-renderer';
import { buildConfig, buildInitialState } from '../../src/core/config-utils';
```

Add to the import block at the top (it already imports `ThekSelect` — add below that):

```ts
import { renderOptionsContent } from '../../src/core/renderer/options-renderer';
import { buildConfig, buildInitialState } from '../../src/core/config-utils';
```

Then add this test inside the `describe('Virtualization', ...)` block:

```ts
it('does not reinsert spacers when already in position on repeated render', () => {
  const list = document.createElement('ul');
  list.style.height = '200px';
  document.body.appendChild(list);

  const options = makeOptions(100);
  const config = buildConfig<{ value: string; label: string }>(null, {
    options,
    virtualize: true,
    virtualThreshold: 80,
    virtualItemHeight: 40
  });
  const state = buildInitialState(config);
  const callbacks = {
    onSelect: () => {},
    onCreate: () => {},
    onRemove: () => {},
    onReorder: () => {},
    onReorderKey: () => {},
    onFocusCombobox: () => {},
    onError: () => {},
    onOrphan: () => {}
  };

  // First render — creates and positions spacers
  renderOptionsContent(list, state, options, config, callbacks, 'test');

  const topSpacer = list.firstChild as HTMLElement;
  const bottomSpacer = list.lastChild as HTMLElement;

  expect(topSpacer?.dataset?.position).toBe('top');
  expect(bottomSpacer?.dataset?.position).toBe('bottom');

  const insertSpy = vi.spyOn(list, 'insertBefore');
  const appendSpy = vi.spyOn(list, 'appendChild');

  // Second render — same scroll, same state; spacers are already in position
  renderOptionsContent(list, state, options, config, callbacks, 'test');

  expect(insertSpy).not.toHaveBeenCalledWith(topSpacer, expect.anything());
  expect(appendSpy).not.toHaveBeenCalledWith(bottomSpacer);

  document.body.removeChild(list);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```
npx vitest run packages/thekselect/tests/features/virtualization.test.ts
```

Expected: the new test FAILS (insertBefore/appendChild ARE called before the guard exists).

- [ ] **Step 3: Apply the spacer guard in `options-renderer.ts`**

Find the two lines at the very bottom of the `if (shouldVirtualize)` branch (currently lines 238–239):

```ts
syncVirtualSpacerHeight(bottomSpacer, (filteredOptions.length - end) * itemHeight);
list.insertBefore(topSpacer, list.firstChild);
list.appendChild(bottomSpacer);
```

Replace with:

```ts
syncVirtualSpacerHeight(bottomSpacer, (filteredOptions.length - end) * itemHeight);
if (list.firstChild !== topSpacer) list.insertBefore(topSpacer, list.firstChild);
if (list.lastChild !== bottomSpacer) list.appendChild(bottomSpacer);
```

- [ ] **Step 4: Replace `innerHTML = ''` with `replaceChildren()` in `options-renderer.ts`**

Find (line 154):

```ts
list.innerHTML = '';
```

Replace with:

```ts
list.replaceChildren();
```

- [ ] **Step 5: Replace `innerHTML = ''` with `replaceChildren()` in `selection-renderer.ts`**

There are four occurrences. Replace each:

Line 121:

```ts
container.innerHTML = '';
```

→

```ts
container.replaceChildren();
```

Line 134:

```ts
container.innerHTML = '';
```

→

```ts
container.replaceChildren();
```

Line 143:

```ts
if (isCurrentlySummary) {
  container.innerHTML = '';
}
```

→

```ts
if (isCurrentlySummary) {
  container.replaceChildren();
}
```

Line 171:

```ts
container.innerHTML = '';
```

→

```ts
container.replaceChildren();
```

- [ ] **Step 6: Run tests to confirm all pass**

```
npx vitest run
```

Expected: all tests PASS, including the new spacer guard test.

- [ ] **Step 7: Commit**

```bash
git add packages/thekselect/src/core/renderer/options-renderer.ts \
        packages/thekselect/src/core/renderer/selection-renderer.ts \
        packages/thekselect/tests/features/virtualization.test.ts
git commit -m "fix: replace innerHTML='' with replaceChildren() and guard spacer reinserts"
```

---

### Task 2: Redesign `types.ts` — core type changes

**Files:**

- Modify: `packages/thekselect/src/core/types.ts`

- [ ] **Step 1: Replace the full contents of `types.ts`**

```ts
export type ThekSelectPrimitive = string | number;
export type ThekSelectValue = ThekSelectPrimitive | ThekSelectPrimitive[] | undefined;

/**
 * Default option shape. Used as the `T` default in all generics.
 *
 * Pass a custom type to `ThekSelect.init<MyOption>(...)` to use your own
 * option objects directly. `valueField` and `displayField` in config become
 * `keyof MyOption & string`, giving you compile-time safety.
 *
 * The `selected` field controls pre-selection when building initial state from
 * a config or a native `<select>` element. It is an internal convention, not
 * required on custom option types.
 */
export interface ThekSelectOption {
  value: ThekSelectPrimitive;
  label: string;
  disabled?: boolean;
  selected?: boolean;
}

export interface ThekSelectConfig<T extends object = ThekSelectOption> {
  options?: T[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  canCreate?: boolean;
  createText?: string;
  height?: number | string;
  /**
   * Milliseconds to wait before firing `loadOptions` after each keystroke.
   * Defaults to 300. Setting to 0 still defers execution to the next event
   * loop tick (via `setTimeout(..., 0)`) — it does not make the call
   * synchronous.
   */
  debounce?: number;
  maxSelectedLabels?: number;
  displayField?: keyof T & string;
  valueField?: keyof T & string;
  maxOptions?: number | null;
  virtualize?: boolean;
  virtualItemHeight?: number;
  virtualOverscan?: number;
  virtualThreshold?: number;
  loadOptions?: (query: string, signal: AbortSignal) => Promise<T[]>;
  renderOption?: (option: T) => string | HTMLElement;
  renderSelection?: (option: T) => string | HTMLElement;
  searchPlaceholder?: string;
  noResultsText?: string;
  loadingText?: string;
  /** Mark the combobox as required for form validation (sets aria-required). */
  required?: boolean;
  /** ID of an external element containing help or validation text (sets aria-describedby). */
  describedBy?: string;
}

export interface ThekSelectState<T extends object = ThekSelectOption> {
  options: T[];
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, T>;
  isOpen: boolean;
  focusedIndex: number;
  inputValue: string;
  isLoading: boolean;
}

/**
 * @internal Read a runtime-configurable field name from an option object.
 * Generic `K extends keyof T` ensures the field is a known key of `T` at the
 * call site, eliminating `as Record<string, unknown>` casts across the codebase.
 */
export function getOptionField<T extends object, K extends keyof T>(option: T, field: K): T[K] {
  return option[field];
}

/**
 * @internal Compare two option values for equality after coercing both to
 * strings. Prevents mismatches when options use numeric `value` fields but
 * external callers pass the equivalent string (e.g. setValue('1') against
 * { value: 1 }).
 */
export function valuesMatch(a: unknown, b: unknown): boolean {
  return String(a) === String(b);
}

export type ThekSelectEvent =
  | 'change'
  | 'open'
  | 'close'
  | 'search'
  | 'tagAdded'
  | 'tagRemoved'
  | 'reordered'
  | 'error';

export interface ThekSelectEventPayloadMap<T extends object = ThekSelectOption> {
  change: ThekSelectValue;
  open: null;
  close: null;
  search: string;
  tagAdded: T;
  tagRemoved: T;
  reordered: ThekSelectPrimitive[];
  error: Error;
}
```

- [ ] **Step 2: Run `tsc` to see the cascade of errors**

```
cd packages/thekselect && npx tsc --noEmit 2>&1 | head -60
```

Expected: many errors — this is expected and will be fixed in subsequent tasks. Do not worry about them yet.

- [ ] **Step 3: Commit the types change alone**

```bash
git add packages/thekselect/src/core/types.ts
git commit -m "refactor!: redesign T as full option shape in ThekSelectConfig"
```

---

### Task 3: Update `constants.ts` — `RendererCallbacks<T>`

**Files:**

- Modify: `packages/thekselect/src/core/renderer/constants.ts`

- [ ] **Step 1: Update `RendererCallbacks` generics**

Replace the interface at the bottom of the file:

```ts
export interface RendererCallbacks<T = unknown> {
  onSelect: (option: ThekSelectOption<T>) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption<T>) => void;
  onReorder: (draggedValue: string, targetValue: string) => void;
  onReorderKey: (value: string, direction: -1 | 1) => void;
  onFocusCombobox: () => void;
  onError: (err: Error) => void;
  onOrphan: () => void;
}
```

With:

```ts
export interface RendererCallbacks<T extends object = ThekSelectOption> {
  onSelect: (option: T) => void;
  onCreate: (label: string) => void;
  onRemove: (option: T) => void;
  onReorder: (draggedValue: string, targetValue: string) => void;
  onReorderKey: (value: string, direction: -1 | 1) => void;
  onFocusCombobox: () => void;
  onError: (err: Error) => void;
  onOrphan: () => void;
}
```

The import at the top of `constants.ts` already has `import { ThekSelectOption } from '../types.js';` — keep it (it's now the non-generic default type).

- [ ] **Step 2: Verify no new errors introduced here**

```
cd packages/thekselect && npx tsc --noEmit 2>&1 | wc -l
```

Expected: error count should be the same or lower than after Task 2.

---

### Task 4: Update `config-utils.ts`

**Files:**

- Modify: `packages/thekselect/src/core/config-utils.ts`

- [ ] **Step 1: Replace the full contents of `config-utils.ts`**

```ts
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectPrimitive,
  ThekSelectState,
  getOptionField,
  valuesMatch
} from './types.js';

export const NOOP_LOAD_OPTIONS = async (_query: string): Promise<ThekSelectOption[]> => [];

export function parseSelectOptions(select: HTMLSelectElement): ThekSelectOption[] {
  return Array.from(select.options).map((opt) => ({
    value: opt.value,
    label: opt.text,
    disabled: opt.disabled,
    selected: opt.selected
  }));
}

export function buildConfig<T extends object = ThekSelectOption>(
  element: HTMLElement | null,
  config: ThekSelectConfig<T>,
  globalDefaults: Partial<ThekSelectConfig<T>> = {}
): Required<ThekSelectConfig<T>> {
  const isSelect = element instanceof HTMLSelectElement;
  // parseSelectOptions always produces ThekSelectOption shape. When T is the
  // default ThekSelectOption this is an identity cast; for custom T it is a
  // structural cast that is safe only when used with a native <select> element.
  const initialOptions = isSelect
    ? (parseSelectOptions(element) as unknown as T[])
    : config.options || [];

  const defaultConfig: Required<ThekSelectConfig<T>> = {
    options: initialOptions,
    multiple: isSelect ? element.multiple : false,
    searchable: true,
    disabled: isSelect ? element.disabled : false,
    placeholder: 'Select...',
    canCreate: false,
    createText: "Create '{%t}'...",
    height: 40,
    debounce: 300,
    maxSelectedLabels: 3,
    displayField: 'label' as keyof T & string,
    valueField: 'value' as keyof T & string,
    maxOptions: null,
    virtualize: false,
    virtualItemHeight: 40,
    virtualOverscan: 4,
    virtualThreshold: 80,
    loadOptions: NOOP_LOAD_OPTIONS as unknown as (
      query: string,
      signal: AbortSignal
    ) => Promise<T[]>,
    renderOption: (o: T) => String(getOptionField(o, 'label' as keyof T & string) ?? ''),
    renderSelection: (o: T) => String(getOptionField(o, 'label' as keyof T & string) ?? ''),
    searchPlaceholder: 'Search...',
    noResultsText: 'No results found',
    loadingText: 'Loading...',
    required: false,
    describedBy: ''
  };

  const finalConfig = {
    ...defaultConfig,
    ...globalDefaults,
    ...config
  };

  if (finalConfig.height == null) {
    finalConfig.height = 40;
  }

  if (finalConfig.maxSelectedLabels < 1) {
    finalConfig.maxSelectedLabels = 1;
  }

  if (typeof finalConfig.loadOptions !== 'function') {
    finalConfig.loadOptions = NOOP_LOAD_OPTIONS as unknown as (
      query: string,
      signal: AbortSignal
    ) => Promise<T[]>;
  }

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
        `ThekSelect: valueField "${String(finalConfig.valueField)}" not found on first option. Check your config.`
      );
    }
    if (!(finalConfig.displayField in sample)) {
      console.warn(
        `ThekSelect: displayField "${String(finalConfig.displayField)}" not found on first option. Check your config.`
      );
    }
  }

  const hasCustomRenderOption = !!(globalDefaults.renderOption || config.renderOption);
  const hasCustomRenderSelection = !!(globalDefaults.renderSelection || config.renderSelection);

  if (!hasCustomRenderOption) {
    finalConfig.renderOption = (o: T) => String(getOptionField(o, finalConfig.displayField) ?? '');
  }
  if (!hasCustomRenderSelection) {
    finalConfig.renderSelection = (o: T) =>
      String(getOptionField(o, finalConfig.displayField) ?? '');
  }

  return finalConfig;
}

export function buildInitialState<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>
): ThekSelectState<T> {
  const valueField = config.valueField;

  // `selected` is a convention on ThekSelectOption (and native <select> options).
  // For custom T shapes it may not exist; the cast is intentional.
  const isPreSelected = (o: T): boolean => !!(o as Record<string, unknown>)['selected'];

  const firstSelected = config.options.find(isPreSelected);
  const selectedValues: ThekSelectPrimitive[] = config.multiple
    ? config.options
        .filter(isPreSelected)
        .map((o) => getOptionField(o, valueField) as ThekSelectPrimitive)
    : firstSelected
      ? [getOptionField(firstSelected, valueField) as ThekSelectPrimitive]
      : [];

  const selectedOptionsByValue: Record<string, T> = {};
  selectedValues.forEach((value) => {
    const option = config.options.find((o) => valuesMatch(getOptionField(o, valueField), value));
    if (option) {
      selectedOptionsByValue[String(value)] = option;
    }
  });

  return {
    options: config.options,
    selectedValues,
    selectedOptionsByValue,
    isOpen: false,
    focusedIndex: -1,
    inputValue: '',
    isLoading: false
  };
}
```

- [ ] **Step 2: Verify error count is dropping**

```
cd packages/thekselect && npx tsc --noEmit 2>&1 | wc -l
```

---

### Task 5: Update logic files — `options-logic.ts` and `selection-logic.ts`

**Files:**

- Modify: `packages/thekselect/src/core/options-logic.ts`
- Modify: `packages/thekselect/src/core/selection-logic.ts`

- [ ] **Step 1: Replace `options-logic.ts`**

```ts
import { ThekSelectConfig, ThekSelectOption, ThekSelectState, getOptionField } from './types.js';
import { NOOP_LOAD_OPTIONS } from './config-utils.js';

export function isRemoteMode<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>
): boolean {
  return config.loadOptions !== NOOP_LOAD_OPTIONS;
}

export function getFilteredOptions<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): T[] {
  if (isRemoteMode(config) && state.inputValue) {
    return state.options;
  }

  const query = state.inputValue.toLowerCase();
  const displayField = config.displayField;
  const filtered = state.options.filter((option) => {
    const value = getOptionField(option, displayField);
    return value != null && value.toString().toLowerCase().includes(query);
  });

  if (config.maxOptions != null) {
    const limit = Math.max(0, config.maxOptions);
    return filtered.slice(0, limit);
  }

  return filtered;
}

export function mergeSelectedOptionsByValue<T extends object = ThekSelectOption>(
  valueField: keyof T & string,
  selectedValues: Array<string | number>,
  previous: Record<string, T>,
  latestOptions: T[]
): Record<string, T> {
  const byValueFromLatest: Record<string, T> = {};
  latestOptions.forEach((option) => {
    const value = getOptionField(option, valueField);
    if (typeof value === 'string' || typeof value === 'number') {
      byValueFromLatest[String(value)] = option;
    }
  });

  const merged: Record<string, T> = {};
  selectedValues.forEach((value) => {
    const key = String(value);
    const option = byValueFromLatest[key] || previous[key];
    if (option) {
      merged[key] = option;
    }
  });
  return merged;
}
```

- [ ] **Step 2: Replace `selection-logic.ts`**

```ts
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectPrimitive,
  ThekSelectState,
  getOptionField,
  valuesMatch
} from './types.js';

type TagEvent = 'tagAdded' | 'tagRemoved';

export interface SelectionUpdate<T extends object = ThekSelectOption> {
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, T>;
  inputValue?: string;
  tagEvent?: TagEvent;
  tagOption?: T;
}

export function applySelection<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>,
  option: T
): SelectionUpdate<T> {
  const valueField = config.valueField;
  const optionValue = getOptionField(option, valueField) as ThekSelectPrimitive;
  const optionKey = String(optionValue);
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };

  if (config.multiple) {
    if (state.selectedValues.some((v) => valuesMatch(v, optionValue))) {
      const selectedValues = state.selectedValues.filter((v) => !valuesMatch(v, optionValue));
      delete selectedOptionsByValue[optionKey];
      return {
        selectedValues,
        selectedOptionsByValue,
        inputValue: '',
        tagEvent: 'tagRemoved',
        tagOption: option
      };
    }

    const selectedValues = [...state.selectedValues, optionValue];
    selectedOptionsByValue[optionKey] = option;
    return {
      selectedValues,
      selectedOptionsByValue,
      inputValue: '',
      tagEvent: 'tagAdded',
      tagOption: option
    };
  }

  return {
    selectedValues: [optionValue],
    selectedOptionsByValue: { [optionKey]: option },
    inputValue: ''
  };
}

export function createOptionFromLabel<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  label: string
): T {
  // Creates a minimal option with only the required display and value fields.
  // Other fields on T are not populated — callers using canCreate with custom T
  // should provide a loadOptions or onCreate handler instead.
  return {
    [config.valueField]: label,
    [config.displayField]: label
  } as unknown as T;
}

export function removeLastSelection<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): {
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, T>;
  removedOption?: T;
} {
  const valueField = config.valueField;
  const selectedValues = [...state.selectedValues];
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };
  const removedValue = selectedValues.pop();
  if (removedValue === undefined) {
    return { selectedValues, selectedOptionsByValue };
  }

  const removedOption =
    state.options.find((o) => valuesMatch(getOptionField(o, valueField), removedValue)) ||
    selectedOptionsByValue[String(removedValue)];
  delete selectedOptionsByValue[String(removedValue)];

  return { selectedValues, selectedOptionsByValue, removedOption };
}

export function reorderSelectedValues(
  state: { selectedValues: ThekSelectPrimitive[] },
  from: number,
  to: number
): ThekSelectPrimitive[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return [...state.selectedValues];
  }
  if (
    from < 0 ||
    to < 0 ||
    from >= state.selectedValues.length ||
    to >= state.selectedValues.length ||
    from === to
  ) {
    return [...state.selectedValues];
  }

  const selectedValues = [...state.selectedValues];
  const [movedItem] = selectedValues.splice(from, 1);
  if (typeof movedItem === 'undefined') {
    return [...state.selectedValues];
  }
  selectedValues.splice(to, 0, movedItem);
  return selectedValues;
}

export function resolveSelectedOptions<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): T[] {
  const valueField = config.valueField;
  const displayField = config.displayField;

  return state.selectedValues.map(
    (value) =>
      state.options.find((o) => valuesMatch(getOptionField(o, valueField), value)) ||
      state.selectedOptionsByValue[String(value)] ||
      ({
        [valueField]: value,
        [displayField]: String(value)
      } as unknown as T)
  );
}

export function buildSelectedOptionsMapFromValues<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>,
  values: ThekSelectPrimitive[]
): Record<string, T> {
  const valueField = config.valueField;
  const selectedOptionsByValue: Record<string, T> = {};
  values.forEach((value) => {
    const option =
      state.options.find((o) => valuesMatch(getOptionField(o, valueField), value)) ||
      state.selectedOptionsByValue[String(value)];
    if (option) {
      selectedOptionsByValue[String(value)] = option;
    }
  });
  return selectedOptionsByValue;
}
```

- [ ] **Step 3: Verify error count continues to drop**

```
cd packages/thekselect && npx tsc --noEmit 2>&1 | wc -l
```

---

### Task 6: Update renderer files — `dom-assembly.ts`, `selection-renderer.ts`, `options-renderer.ts`

**Files:**

- Modify: `packages/thekselect/src/core/renderer/dom-assembly.ts`
- Modify: `packages/thekselect/src/core/renderer/selection-renderer.ts`
- Modify: `packages/thekselect/src/core/renderer/options-renderer.ts`

- [ ] **Step 1: Update generics in `dom-assembly.ts`**

First, add `ThekSelectOption` to the existing import at the top of the file:

```ts
import { ThekSelectConfig, ThekSelectOption } from '../types.js';
```

Then replace the function signature:

```ts
export function createRendererSkeleton<T>(
  id: string,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  signal: AbortSignal
): RendererElements {
```

With:

```ts
export function createRendererSkeleton<T extends object = ThekSelectOption>(
  id: string,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  signal: AbortSignal
): RendererElements {
```

Also update the drop handler (currently passes `option: ThekSelectOption` via `callbacks.onSelect`). The DnD callbacks use `draggedValue`/`targetValue` strings and call `callbacks.onReorder`, not `onSelect` — no changes needed to the callback call sites in dom-assembly.

- [ ] **Step 2: Update generics in `selection-renderer.ts`**

`selection-renderer.ts` already imports `ThekSelectOption` from `'../types.js'` — no import change needed.

Update all four function signatures (the DOM fixes were already applied in Task 1):

```ts
export function safeRender<T extends object = ThekSelectOption>(
  fn: (o: T) => string | HTMLElement,
  option: T,
  config: Required<ThekSelectConfig<T>>,
  onError: (err: Error) => void
): string | HTMLElement {
```

```ts
export function createTagNode<T extends object = ThekSelectOption>(
  option: T,
  val: string | number,
  index: number,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): HTMLElement {
```

```ts
export function updateTagNode<T extends object = ThekSelectOption>(
  tag: HTMLElement,
  option: T,
  val: string | number,
  index: number,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): void {
```

```ts
export function renderSelectionContent<T extends object = ThekSelectOption>(
  container: HTMLElement,
  placeholder: HTMLElement,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): void {
```

Inside `renderSelectionContent`, the fallback synthetic option construction now needs a cast since `T` may not have `value`/`label`:

Find:

```ts
({ [vField]: val, [dField]: String(val) }) as unknown as ThekSelectOption<T>;
```

Replace with:

```ts
({ [vField]: val, [dField]: String(val) }) as unknown as T;
```

- [ ] **Step 3: Update generics in `options-renderer.ts`**

`options-renderer.ts` already imports `ThekSelectOption` from `'../types.js'` — no import change needed.

Update all function signatures (DOM fixes were already applied in Task 1):

```ts
export function updateOptionAttrs<T extends object = ThekSelectOption>(
  li: HTMLLIElement,
  option: T,
  index: number,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  id: string
): void {
```

Inside `updateOptionAttrs`, the `disabled` field access needs the intentional internal cast (the only remaining one in the codebase). Find:

```ts
const isDisabled = !!getOptionField(option, 'disabled');
```

Replace with:

```ts
// `disabled` is a ThekSelectOption convention; T may not declare it.
const isDisabled = !!(option as Record<string, unknown>)['disabled'];
```

```ts
export function updateOptionContent<T extends object = ThekSelectOption>(
  li: HTMLLIElement,
  option: T,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): void {
```

```ts
export function createOptionItem<T extends object = ThekSelectOption>(
  option: T,
  index: number,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  id: string
): HTMLLIElement {
```

```ts
export function renderOptionsContent<T extends object = ThekSelectOption>(
  list: HTMLElement,
  state: ThekSelectState<T>,
  filteredOptions: T[],
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  id: string,
  alignFocused: boolean = true,
  preservedScrollTop?: number
): void {
```

- [ ] **Step 4: Verify tsc error count**

```
cd packages/thekselect && npx tsc --noEmit 2>&1 | wc -l
```

---

### Task 7: Update `dom-renderer.ts`

**Files:**

- Modify: `packages/thekselect/src/core/dom-renderer.ts`

- [ ] **Step 1: Update class declaration and all method signatures**

Change the class declaration:

```ts
export class DomRenderer<T extends object = ThekSelectOption> {
```

Update `lastFilteredOptions` field type:

```ts
  private lastFilteredOptions: T[] = [];
```

Update `render` method signature:

```ts
  public render(state: ThekSelectState<T>, filteredOptions: T[]): void {
```

Update `scrollToSelected` method signature:

```ts
  public scrollToSelected(state: ThekSelectState<T>, filteredOptions: T[]): void {
```

Inside `scrollToSelected`, `getOptionField(opt, vField)` now returns `T[keyof T & string]` and `valuesMatch` accepts `unknown` — no cast needed here.

Update `updateConfig` signature:

```ts
  public updateConfig(newConfig: Partial<Required<ThekSelectConfig<T>>>): void {
```

- [ ] **Step 2: Verify tsc error count is near zero**

```
cd packages/thekselect && npx tsc --noEmit 2>&1 | wc -l
```

---

### Task 8: Update `thekselect.ts` — core class

**Files:**

- Modify: `packages/thekselect/src/core/thekselect.ts`

- [ ] **Step 1: Update exported types and class declaration**

Replace:

```ts
export type ThekSelectHandle<T = unknown> = ThekSelect<T> & {
  setHeight(height: number | string): void;
  setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void;
  setDisabled(disabled: boolean): void;
};

export class ThekSelect<T = unknown> {
  private static globalDefaults: Partial<ThekSelectConfig> = {};
```

With:

```ts
export type ThekSelectHandle<T extends object = ThekSelectOption> = ThekSelect<T> & {
  setHeight(height: number | string): void;
  setRenderOption(fn: (option: T) => string | HTMLElement): void;
  setDisabled(disabled: boolean): void;
};

export class ThekSelect<T extends object = ThekSelectOption> {
  private static globalDefaults: Partial<ThekSelectConfig<ThekSelectOption>> = {};
```

- [ ] **Step 2: Update protected/private field types**

```ts
  protected readonly config: Required<ThekSelectConfig<T>>;
  protected stateManager: StateManager<ThekSelectState<T>>;
```

These are already correct — no changes needed.

- [ ] **Step 3: Update method signatures that reference `ThekSelectOption<T>`**

`select`:

```ts
  public select(option: T): void {
```

`setOptions`:

```ts
  public setOptions(options: T[]): void {
```

`getSelectedOptions`:

```ts
  public getSelectedOptions(): T | T[] | undefined {
```

`on`:

```ts
  public on<K extends ThekSelectEvent>(
    event: K,
    callback: (payload: ThekSelectEventPayloadMap<T>[K]) => void
  ): () => void {
```

`init` static method:

```ts
  public static init<T extends object = ThekSelectOption>(
    element: string | HTMLElement,
    config: ThekSelectConfig<T> = {}
  ): ThekSelectHandle<T> {
```

`setDefaults` static method:

```ts
  public static setDefaults(defaults: Partial<ThekSelectConfig<ThekSelectOption>>): void {
```

- [ ] **Step 4: Update `ThekSelectDom` class**

Change class declaration:

```ts
class ThekSelectDom<T extends object = ThekSelectOption> extends ThekSelect<T> {
```

Update callbacks object inside constructor — `onSelect` and `onRemove` now take `T`:

```ts
    const callbacks: RendererCallbacks<T> = {
      onSelect: (option) => this.select(option),
      onCreate: (label) => this.create(label),
      onRemove: (option) => this.select(option),
```

Update `setRenderOption`:

```ts
  public setRenderOption(fn: (option: T) => string | HTMLElement): void {
    this.config.renderOption = fn;
    this.renderer.updateConfig({ renderOption: fn });
    this.render();
  }
```

Update `select` override — parameter is now `T`:

```ts
  public override select(option: T): void {
    const wasSelected = this.stateManager.getState().selectedValues.some((v) =>
      valuesMatch(v, getOptionField(option, this.config.valueField))
    );
    super.select(option);
    this.syncOriginalElement(this.stateManager.getState().selectedValues);
    this.renderer.input.value = '';
    const label = String(getOptionField(option, this.config.displayField) ?? '');
    this.renderer.announce(
      this.config.multiple
        ? wasSelected
          ? `${label} removed`
          : `${label} selected`
        : `${label} selected`
    );
  }
```

- [ ] **Step 5: Fix `focusNext` and `focusPrev` — `disabled` field access**

These methods call `filteredOptions[next]?.disabled` directly. Since `T` may not have `disabled`, add a cast:

Find in `focusNext`:

```ts
    while (next < filteredOptions.length && !!filteredOptions[next]?.disabled) {
```

Replace with:

```ts
    while (next < filteredOptions.length && !!((filteredOptions[next] as Record<string, unknown>)?.['disabled'])) {
```

Find in `focusPrev`:

```ts
    while (prev >= 0 && !!filteredOptions[prev]?.disabled) {
```

Replace with:

```ts
    while (prev >= 0 && !!((filteredOptions[prev] as Record<string, unknown>)?.['disabled'])) {
```

Find in `open`:

```ts
    while (initialFocus < filteredOptions.length && !!filteredOptions[initialFocus]?.disabled) {
```

Replace with:

```ts
    while (initialFocus < filteredOptions.length && !!((filteredOptions[initialFocus] as Record<string, unknown>)?.['disabled'])) {
```

- [ ] **Step 6: Confirm TypeScript compiles clean**

```
cd packages/thekselect && npx tsc --noEmit 2>&1
```

Expected: zero errors. If any remain, fix them before continuing.

- [ ] **Step 7: Run the full test suite**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/thekselect/src/
git commit -m "refactor!: update all call sites to T extends object = ThekSelectOption"
```

---

### Task 9: Add type-level tests

**Files:**

- Create: `packages/thekselect/tests/core/types.test-d.ts`

- [ ] **Step 1: Create the type-level test file**

```ts
import { describe, it, expectTypeOf } from 'vitest';
import { ThekSelectConfig, ThekSelectOption } from '../../src/core/types';

interface ProductOption {
  id: number;
  name: string;
  category: string;
  disabled?: boolean;
}

describe('ThekSelectConfig type safety', () => {
  it('valueField accepts keyof T', () => {
    const config: ThekSelectConfig<ProductOption> = {
      options: [{ id: 1, name: 'Widget', category: 'tools' }],
      valueField: 'id',
      displayField: 'name'
    };
    expectTypeOf(config.valueField).toEqualTypeOf<(keyof ProductOption & string) | undefined>();
  });

  it('renderOption callback receives T', () => {
    const config: ThekSelectConfig<ProductOption> = {
      renderOption: (option) => {
        expectTypeOf(option).toEqualTypeOf<ProductOption>();
        return option.name;
      }
    };
    void config;
  });

  it('loadOptions returns Promise<T[]>', () => {
    const config: ThekSelectConfig<ProductOption> = {
      loadOptions: async (_query, _signal) => {
        const results: ProductOption[] = [{ id: 2, name: 'Gadget', category: 'tech' }];
        return results;
      }
    };
    void config;
  });

  it('default T is ThekSelectOption', () => {
    const config: ThekSelectConfig = {
      options: [{ value: '1', label: 'One' }]
    };
    expectTypeOf(config.options).toEqualTypeOf<ThekSelectOption[] | undefined>();
  });
});

// Compile-time rejection tests — these must NOT be removed or the guard is gone
// @ts-expect-error: 'nonexistent' is not keyof ProductOption
const _badValueField: ThekSelectConfig<ProductOption> = { valueField: 'nonexistent' };

// @ts-expect-error: number is not a valid option shape (must extend object)
type _badConstraint = ThekSelectConfig<number>;
```

- [ ] **Step 2: Run the type tests**

```
npx vitest run packages/thekselect/tests/core/types.test-d.ts
```

Expected: PASS — all `expectTypeOf` assertions hold, all `@ts-expect-error` lines correctly catch type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/thekselect/tests/core/types.test-d.ts
git commit -m "test: add type-level tests for ThekSelectConfig<T> generic constraints"
```

---

### Task 10: Final verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 2: Run TypeScript type check**

```
cd packages/thekselect && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run build**

```
npm run build --workspace=packages/thekselect
```

Expected: clean build, no errors.

- [ ] **Step 4: Final commit if everything passes**

```bash
git add -A
git status  # verify nothing untracked/unexpected
git commit -m "chore: final cleanup — type safety + DOM fixes complete"
```
