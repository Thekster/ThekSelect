export interface ThekSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  [key: string]: any;
}

export type ThekSelectSize = 'sm' | 'md' | 'lg';

export interface ThekSelectConfig {
  options?: ThekSelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  canCreate?: boolean;
  createText?: string;
  size?: ThekSelectSize;
  debounce?: number;
  loadOptions?: (query: string) => Promise<ThekSelectOption[]>;
  renderOption?: (option: ThekSelectOption) => string | HTMLElement;
  renderSelection?: (option: ThekSelectOption) => string | HTMLElement;
}

export interface ThekSelectState {
  options: ThekSelectOption[];
  selectedValues: string[];
  selectedOptions: ThekSelectOption[]; // Added for data integrity
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
