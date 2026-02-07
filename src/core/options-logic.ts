import { ThekSelectConfig, ThekSelectOption, ThekSelectState } from './types.js';
import { NOOP_LOAD_OPTIONS } from './config-utils.js';

export function isRemoteMode(config: Required<ThekSelectConfig>): boolean {
  return config.loadOptions !== NOOP_LOAD_OPTIONS;
}

export function getFilteredOptions(
  config: Required<ThekSelectConfig>,
  state: ThekSelectState
): ThekSelectOption[] {
  if (isRemoteMode(config) && state.inputValue) {
    return state.options;
  }

  const query = state.inputValue.toLowerCase();
  const displayField = config.displayField;
  const filtered = state.options.filter((option) => {
    const value = option[displayField];
    return value != null && value.toString().toLowerCase().includes(query);
  });

  if (config.maxOptions != null) {
    return filtered.slice(0, config.maxOptions);
  }

  return filtered;
}

export function mergeSelectedOptionsByValue(
  valueField: string,
  selectedValues: string[],
  previous: Record<string, ThekSelectOption>,
  latestOptions: ThekSelectOption[]
): Record<string, ThekSelectOption> {
  const byValueFromLatest: Record<string, ThekSelectOption> = {};
  latestOptions.forEach((option) => {
    const value = option[valueField];
    if (typeof value === 'string') {
      byValueFromLatest[value] = option;
    }
  });

  const merged: Record<string, ThekSelectOption> = {};
  selectedValues.forEach((value) => {
    const option = byValueFromLatest[value] || previous[value];
    if (option) {
      merged[value] = option;
    }
  });
  return merged;
}
