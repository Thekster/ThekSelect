import { ThekSelectConfig, ThekSelectOption, ThekSelectState } from './types.js';
import { NOOP_LOAD_OPTIONS } from './config-utils.js';

export function isRemoteMode<T = unknown>(config: Required<ThekSelectConfig<T>>): boolean {
  return config.loadOptions !== NOOP_LOAD_OPTIONS;
}

export function getFilteredOptions<T = unknown>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): ThekSelectOption<T>[] {
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
    const limit = Math.max(0, config.maxOptions);
    return filtered.slice(0, limit);
  }

  return filtered;
}

export function mergeSelectedOptionsByValue<T = unknown>(
  valueField: string,
  selectedValues: string[],
  previous: Record<string, ThekSelectOption<T>>,
  latestOptions: ThekSelectOption<T>[]
): Record<string, ThekSelectOption<T>> {
  const byValueFromLatest: Record<string, ThekSelectOption<T>> = {};
  latestOptions.forEach((option) => {
    const value = option[valueField];
    if (typeof value === 'string') {
      byValueFromLatest[value] = option;
    }
  });

  const merged: Record<string, ThekSelectOption<T>> = {};
  selectedValues.forEach((value) => {
    const option = byValueFromLatest[value] || previous[value];
    if (option) {
      merged[value] = option;
    }
  });
  return merged;
}
