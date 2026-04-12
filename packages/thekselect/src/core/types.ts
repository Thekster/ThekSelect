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
 * The index signature `[key: string]: unknown` is required so TypeScript allows
 * dynamic access like `option[config.valueField]`. It has the side-effect of
 * making the generic parameter `T` apply only to the `data` field — `T` does
 * **not** add type safety to arbitrary extra fields. To carry strongly-typed
 * domain data into render functions, use the `data` field.
 */
export interface ThekSelectOption<T = unknown> {
  value: ThekSelectPrimitive;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  /** Carry strongly-typed domain data for use in custom render functions. */
  data?: T;
  [key: string]: unknown;
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
