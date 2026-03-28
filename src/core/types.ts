export interface ThekSelectOption<T = unknown> {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
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
  loadOptions?: (query: string) => Promise<ThekSelectOption<T>[]>;
  renderOption?: (option: ThekSelectOption<T>) => string | HTMLElement;
  renderSelection?: (option: ThekSelectOption<T>) => string | HTMLElement;
}

export interface ThekSelectState<T = unknown> {
  options: ThekSelectOption<T>[];
  selectedValues: string[];
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
  | 'reordered';
