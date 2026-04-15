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
export function getOptionField<T extends object, K extends keyof T>(
  option: T,
  field: K
): T[K] {
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
