import { ThekSelectConfig, ThekSelectOption, ThekSelectState } from './types.js';

export const NOOP_LOAD_OPTIONS = async (_query: string): Promise<ThekSelectOption[]> => [];

export function parseSelectOptions(select: HTMLSelectElement): ThekSelectOption[] {
  return Array.from(select.options).map((opt) => ({
    value: opt.value,
    label: opt.text,
    disabled: opt.disabled,
    selected: opt.selected
  }));
}

export function buildConfig<T = unknown>(
  element: HTMLElement,
  config: ThekSelectConfig<T>,
  globalDefaults: Partial<ThekSelectConfig<T>> = {}
): Required<ThekSelectConfig<T>> {
  const isSelect = element instanceof HTMLSelectElement;
  const initialOptions = isSelect ? parseSelectOptions(element) : config.options || [];

  const defaultConfig: Required<ThekSelectConfig<T>> = {
    options: initialOptions as ThekSelectOption<T>[],
    multiple: isSelect ? element.multiple : false,
    searchable: true,
    disabled: isSelect ? element.disabled : false,
    placeholder: 'Select...',
    canCreate: false,
    createText: "Create '{%t}'...",
    height: 40,
    debounce: 300,
    maxSelectedLabels: 3,
    displayField: 'label',
    valueField: 'value',
    maxOptions: null,
    virtualize: false,
    virtualItemHeight: 40,
    virtualOverscan: 4,
    virtualThreshold: 80,
    loadOptions: NOOP_LOAD_OPTIONS as (query: string) => Promise<ThekSelectOption<T>[]>,
    renderOption: (o: ThekSelectOption<T>) => o.label,
    renderSelection: (o: ThekSelectOption<T>) => o.label
  };

  const finalConfig = {
    ...defaultConfig,
    ...globalDefaults,
    ...config
  };

  const hasCustomRenderOption = !!(globalDefaults.renderOption || config.renderOption);
  const hasCustomRenderSelection = !!(globalDefaults.renderSelection || config.renderSelection);

  if (!hasCustomRenderOption) {
    finalConfig.renderOption = (o: ThekSelectOption<T>) => o[finalConfig.displayField] as string;
  }
  if (!hasCustomRenderSelection) {
    finalConfig.renderSelection = (o: ThekSelectOption<T>) =>
      o[finalConfig.displayField] as string;
  }

  return finalConfig;
}

export function buildInitialState<T = unknown>(
  config: Required<ThekSelectConfig<T>>
): ThekSelectState<T> {
  const valueField = config.valueField;
  const firstSelected = config.options.find((o) => o.selected);
  const selectedValues = config.multiple
    ? config.options.filter((o) => o.selected).map((o) => o[valueField])
    : firstSelected && valueField in firstSelected
      ? [firstSelected[valueField]]
      : [];

  const selectedOptionsByValue: Record<string, ThekSelectOption<T>> = {};
  selectedValues.forEach((value) => {
    const option = config.options.find((o) => o[valueField] === value);
    if (option) {
      selectedOptionsByValue[value as string] = option;
    }
  });

  return {
    options: config.options,
    selectedValues: selectedValues as string[],
    selectedOptionsByValue,
    isOpen: false,
    focusedIndex: -1,
    inputValue: '',
    isLoading: false
  };
}
