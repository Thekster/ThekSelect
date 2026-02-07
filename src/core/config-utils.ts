import { ThekSelectConfig, ThekSelectOption, ThekSelectState } from './types.js';

export const NOOP_LOAD_OPTIONS = async (_query: string): Promise<ThekSelectOption[]> => [];

export function parseSelectOptions(select: HTMLSelectElement): ThekSelectOption[] {
  return Array.from(select.options).map(opt => ({
    value: opt.value,
    label: opt.text,
    disabled: opt.disabled,
    selected: opt.selected
  }));
}

export function buildConfig(
  element: HTMLElement,
  config: ThekSelectConfig,
  globalDefaults: Partial<ThekSelectConfig> = {}
): Required<ThekSelectConfig> {
  const isSelect = element instanceof HTMLSelectElement;
  const initialOptions = isSelect ? parseSelectOptions(element) : (config.options || []);

  const defaultConfig: Required<ThekSelectConfig> = {
    options: initialOptions,
    multiple: isSelect ? element.multiple : false,
    searchable: true,
    disabled: isSelect ? element.disabled : false,
    placeholder: 'Select...',
    canCreate: false,
    createText: "Create '{%t}'...",
    size: 'md',
    debounce: 300,
    maxSelectedLabels: 3,
    theme: {},
    displayField: 'label',
    valueField: 'value',
    maxOptions: null,
    virtualize: false,
    virtualItemHeight: 40,
    virtualOverscan: 4,
    virtualThreshold: 80,
    loadOptions: NOOP_LOAD_OPTIONS,
    renderOption: (o: ThekSelectOption) => o.label,
    renderSelection: (o: ThekSelectOption) => o.label
  };

  const finalConfig = {
    ...defaultConfig,
    ...globalDefaults,
    ...config
  };

  finalConfig.theme = {
    ...defaultConfig.theme,
    ...(globalDefaults.theme || {}),
    ...(config.theme || {})
  };

  const hasCustomRenderOption = !!(globalDefaults.renderOption || config.renderOption);
  const hasCustomRenderSelection = !!(globalDefaults.renderSelection || config.renderSelection);

  if (!hasCustomRenderOption) {
    finalConfig.renderOption = (o: ThekSelectOption) => o[finalConfig.displayField];
  }
  if (!hasCustomRenderSelection) {
    finalConfig.renderSelection = (o: ThekSelectOption) => o[finalConfig.displayField];
  }

  return finalConfig;
}

export function buildInitialState(config: Required<ThekSelectConfig>): ThekSelectState {
  const valueField = config.valueField;
  const selectedValues = config.multiple
    ? config.options.filter(o => o.selected).map(o => o[valueField])
    : (config.options.find(o => o.selected)?.[valueField]
      ? [config.options.find(o => o.selected)![valueField]]
      : []);

  const selectedOptionsByValue: Record<string, ThekSelectOption> = {};
  selectedValues.forEach((value) => {
    const option = config.options.find(o => o[valueField] === value);
    if (option) {
      selectedOptionsByValue[value] = option;
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
