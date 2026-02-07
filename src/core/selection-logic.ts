import { ThekSelectConfig, ThekSelectOption, ThekSelectState } from './types.js';

type TagEvent = 'tagAdded' | 'tagRemoved';

export interface SelectionUpdate {
  selectedValues: string[];
  selectedOptionsByValue: Record<string, ThekSelectOption>;
  inputValue?: string;
  tagEvent?: TagEvent;
  tagOption?: ThekSelectOption;
}

export function applySelection(
  config: Required<ThekSelectConfig>,
  state: ThekSelectState,
  option: ThekSelectOption
): SelectionUpdate {
  const valueField = config.valueField;
  const optionValue = option[valueField];
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };

  if (config.multiple) {
    if (state.selectedValues.includes(optionValue)) {
      const selectedValues = state.selectedValues.filter(v => v !== optionValue);
      delete selectedOptionsByValue[optionValue];
      return {
        selectedValues,
        selectedOptionsByValue,
        inputValue: '',
        tagEvent: 'tagRemoved',
        tagOption: option
      };
    }

    const selectedValues = [...state.selectedValues, optionValue];
    selectedOptionsByValue[optionValue] = option;
    return {
      selectedValues,
      selectedOptionsByValue,
      inputValue: '',
      tagEvent: 'tagAdded',
      tagOption: option
    };
  }

  return {
    selectedValues: [optionValue],
    selectedOptionsByValue: { [optionValue]: option },
    inputValue: ''
  };
}

export function createOptionFromLabel(
  config: Required<ThekSelectConfig>,
  label: string
): ThekSelectOption {
  const value = label;
  return {
    value,
    label,
    [config.valueField]: value,
    [config.displayField]: label
  };
}

export function removeLastSelection(
  config: Required<ThekSelectConfig>,
  state: ThekSelectState
): {
  selectedValues: string[];
  selectedOptionsByValue: Record<string, ThekSelectOption>;
  removedOption?: ThekSelectOption;
} {
  const valueField = config.valueField;
  const selectedValues = [...state.selectedValues];
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };
  const removedValue = selectedValues.pop();
  if (!removedValue) {
    return { selectedValues, selectedOptionsByValue };
  }

  const removedOption = state.options.find(o => o[valueField] === removedValue) || selectedOptionsByValue[removedValue];
  delete selectedOptionsByValue[removedValue];

  return { selectedValues, selectedOptionsByValue, removedOption };
}

export function reorderSelectedValues(state: ThekSelectState, from: number, to: number): string[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return [...state.selectedValues];
  }
  if (from < 0 || to < 0 || from >= state.selectedValues.length || to >= state.selectedValues.length || from === to) {
    return [...state.selectedValues];
  }

  const selectedValues = [...state.selectedValues];
  const [movedItem] = selectedValues.splice(from, 1);
  if (typeof movedItem === 'undefined') {
    return [...state.selectedValues];
  }
  selectedValues.splice(to, 0, movedItem);
  return selectedValues;
}

export function resolveSelectedOptions(
  config: Required<ThekSelectConfig>,
  state: ThekSelectState
): ThekSelectOption[] {
  const valueField = config.valueField;
  const displayField = config.displayField;

  return state.selectedValues.map(value =>
    state.options.find(o => o[valueField] === value) ||
    state.selectedOptionsByValue[value] ||
    ({ [valueField]: value, [displayField]: value } as ThekSelectOption)
  );
}

export function buildSelectedOptionsMapFromValues(
  config: Required<ThekSelectConfig>,
  state: ThekSelectState,
  values: string[]
): Record<string, ThekSelectOption> {
  const valueField = config.valueField;
  const selectedOptionsByValue: Record<string, ThekSelectOption> = {};
  values.forEach((value) => {
    const option = state.options.find(o => o[valueField] === value) || state.selectedOptionsByValue[value];
    if (option) {
      selectedOptionsByValue[value] = option;
    }
  });
  return selectedOptionsByValue;
}
