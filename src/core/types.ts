export interface ThekSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  data?: any;
  [key: string]: any;
}

export interface ThekSelectConfig {
  options?: ThekSelectOption[];
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
  loadOptions?: (query: string) => Promise<ThekSelectOption[]>;
  renderOption?: (option: ThekSelectOption) => string | HTMLElement;
  renderSelection?: (option: ThekSelectOption) => string | HTMLElement;
}

export interface ThekSelectState {
  options: ThekSelectOption[];
  selectedValues: string[];
  selectedOptionsByValue: Record<string, ThekSelectOption>;
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
