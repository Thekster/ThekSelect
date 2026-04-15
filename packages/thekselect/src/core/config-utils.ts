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
