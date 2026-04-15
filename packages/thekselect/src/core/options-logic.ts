import { ThekSelectConfig, ThekSelectOption, ThekSelectState, getOptionField } from './types.js';
import { NOOP_LOAD_OPTIONS } from './config-utils.js';

export function isRemoteMode<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>
): boolean {
  return (
    config.loadOptions !==
    (NOOP_LOAD_OPTIONS as unknown as Required<ThekSelectConfig<T>>['loadOptions'])
  );
}

export function getFilteredOptions<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): T[] {
  if (isRemoteMode(config) && state.inputValue) {
    return state.options;
  }

  const query = state.inputValue.toLowerCase();
  const displayField = config.displayField;
  const filtered = state.options.filter((option) => {
    const value = getOptionField(option, displayField);
    return value != null && value.toString().toLowerCase().includes(query);
  });

  if (config.maxOptions != null) {
    const limit = Math.max(0, config.maxOptions);
    return filtered.slice(0, limit);
  }

  return filtered;
}

export function mergeSelectedOptionsByValue<T extends object = ThekSelectOption>(
  valueField: keyof T & string,
  selectedValues: Array<string | number>,
  previous: Record<string, T>,
  latestOptions: T[]
): Record<string, T> {
  const byValueFromLatest: Record<string, T> = {};
  latestOptions.forEach((option) => {
    const value = getOptionField(option, valueField);
    if (typeof value === 'string' || typeof value === 'number') {
      byValueFromLatest[String(value)] = option;
    }
  });

  const merged: Record<string, T> = {};
  selectedValues.forEach((value) => {
    const key = String(value);
    const option = byValueFromLatest[key] || previous[key];
    if (option) {
      merged[key] = option;
    }
  });
  return merged;
}
