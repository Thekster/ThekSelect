export type ThekSelectPrimitive = string | number;
export type ThekSelectValue = ThekSelectPrimitive | ThekSelectPrimitive[] | undefined;

/**
 * A single option in a ThekSelect instance.
 *
 * `value` and `label` are the default field names used when `valueField` and
 * `displayField` are not customised. When using custom field names you still
 * need to satisfy this interface — either keep `value`/`label` as aliases or
 * use a cast. The library reads fields via `config.valueField` and
 * `config.displayField` at runtime, not via `.value`/`.label` directly.
 *
 * To carry strongly-typed domain data into render functions, use the `data`
 * field. The generic parameter `T` provides type safety exclusively there.
 */
export interface ThekSelectOption<T = unknown> {
  value: ThekSelectPrimitive;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  /** Carry strongly-typed domain data for use in custom render functions. */
  data?: T;
}

export interface ThekSelectConfig<T = unknown> {
  options?: ThekSelectOption<T>[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  canCreate?: boolean;
  createText?: string; // Default "Create '{%t}'..."
  height?: number | string;
  /**
   * Milliseconds to wait before firing `loadOptions` after each keystroke.
   * Defaults to 300. Setting to 0 still defers execution to the next event
   * loop tick (via `setTimeout(..., 0)`) — it does not make the call
   * synchronous.
   */
  debounce?: number;
  maxSelectedLabels?: number;
  displayField?: string;
  valueField?: string;
  maxOptions?: number | null;
  virtualize?: boolean;
  virtualItemHeight?: number;
  virtualOverscan?: number;
  virtualThreshold?: number;
  loadOptions?: (query: string, signal: AbortSignal) => Promise<ThekSelectOption<T>[]>;
  renderOption?: (option: ThekSelectOption<T>) => string | HTMLElement;
  renderSelection?: (option: ThekSelectOption<T>) => string | HTMLElement;
  searchPlaceholder?: string;
  noResultsText?: string;
  loadingText?: string;
  /** Mark the combobox as required for form validation (sets aria-required). */
  required?: boolean;
  /** ID of an external element containing help or validation text (sets aria-describedby). */
  describedBy?: string;
}

export interface ThekSelectState<T = unknown> {
  options: ThekSelectOption<T>[];
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, ThekSelectOption<T>>;
  isOpen: boolean;
  focusedIndex: number;
  inputValue: string;
  isLoading: boolean;
}

/**
 * @internal Read a runtime-configurable field name from an option object.
 * Required because `valueField`/`displayField` are strings known only at
 * runtime, and `ThekSelectOption` intentionally carries no index signature.
 */
export function getOptionField(option: unknown, field: string): unknown {
  return (option as Record<string, unknown>)[field];
}

/**
 * @internal Compare two option values for equality after coercing both to
 * strings.  This prevents mismatches when options use numeric `value` fields
 * but external callers pass the equivalent string (e.g. setValue('1') against
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

export interface ThekSelectEventPayloadMap<T = unknown> {
  change: ThekSelectValue;
  open: null;
  close: null;
  search: string;
  tagAdded: ThekSelectOption<T>;
  tagRemoved: ThekSelectOption<T>;
  reordered: ThekSelectPrimitive[];
  error: Error;
}
