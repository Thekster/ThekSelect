export interface ThekSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  data?: any;
  [key: string]: any;
}

export type ThekSelectSize = 'sm' | 'md' | 'lg';

export interface ThekSelectTheme {
  primary?: string;
  primaryLight?: string;
  bgSurface?: string;
  bgPanel?: string;
  bgSubtle?: string;
  border?: string;
  borderStrong?: string;
  textMain?: string;
  textMuted?: string;
  textInverse?: string;
  danger?: string;
  shadow?: string;
  fontFamily?: string;
  borderRadius?: string;
  heightSm?: string;
  heightMd?: string;
  heightLg?: string;
  itemPadding?: string;
}

export interface ThekSelectConfig {
  options?: ThekSelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  canCreate?: boolean;
  createText?: string; // Default "Create '{%t}'..."
  size?: ThekSelectSize;
  debounce?: number;
  maxSelectedLabels?: number;
  theme?: ThekSelectTheme;
  displayField?: string;
  valueField?: string;
  maxOptions?: number | null;
  loadOptions?: (query: string) => Promise<ThekSelectOption[]>;
  renderOption?: (option: ThekSelectOption) => string | HTMLElement;
  renderSelection?: (option: ThekSelectOption) => string | HTMLElement;
}

export interface ThekSelectState {
  options: ThekSelectOption[];
  selectedValues: string[];
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
