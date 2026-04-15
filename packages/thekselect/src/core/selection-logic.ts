import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectPrimitive,
  ThekSelectState,
  getOptionField,
  valuesMatch
} from './types.js';

type TagEvent = 'tagAdded' | 'tagRemoved';

export interface SelectionUpdate<T extends object = ThekSelectOption> {
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, T>;
  inputValue?: string;
  tagEvent?: TagEvent;
  tagOption?: T;
}

export function applySelection<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>,
  option: T
): SelectionUpdate<T> {
  const valueField = config.valueField;
  const optionValue = getOptionField(option, valueField) as ThekSelectPrimitive;
  const optionKey = String(optionValue);
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };

  if (config.multiple) {
    if (state.selectedValues.some((v) => valuesMatch(v, optionValue))) {
      const selectedValues = state.selectedValues.filter((v) => !valuesMatch(v, optionValue));
      delete selectedOptionsByValue[optionKey];
      return {
        selectedValues,
        selectedOptionsByValue,
        inputValue: '',
        tagEvent: 'tagRemoved',
        tagOption: option
      };
    }

    const selectedValues = [...state.selectedValues, optionValue];
    selectedOptionsByValue[optionKey] = option;
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
    selectedOptionsByValue: { [optionKey]: option },
    inputValue: ''
  };
}

export function createOptionFromLabel<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  label: string
): T {
  // Creates a minimal option with only the required display and value fields.
  // Other fields on T are not populated — callers using canCreate with custom T
  // should provide a loadOptions or onCreate handler instead.
  return {
    [config.valueField]: label,
    [config.displayField]: label
  } as unknown as T;
}

export function removeLastSelection<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): {
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, T>;
  removedOption?: T;
} {
  const valueField = config.valueField;
  const selectedValues = [...state.selectedValues];
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };
  const removedValue = selectedValues.pop();
  if (removedValue === undefined) {
    return { selectedValues, selectedOptionsByValue };
  }

  const removedOption =
    state.options.find((o) => valuesMatch(getOptionField(o, valueField), removedValue)) ||
    selectedOptionsByValue[String(removedValue)];
  delete selectedOptionsByValue[String(removedValue)];

  return { selectedValues, selectedOptionsByValue, removedOption };
}

export function reorderSelectedValues(
  state: { selectedValues: ThekSelectPrimitive[] },
  from: number,
  to: number
): ThekSelectPrimitive[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return [...state.selectedValues];
  }
  if (
    from < 0 ||
    to < 0 ||
    from >= state.selectedValues.length ||
    to >= state.selectedValues.length ||
    from === to
  ) {
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

export function resolveSelectedOptions<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): T[] {
  const valueField = config.valueField;
  const displayField = config.displayField;

  return state.selectedValues.map(
    (value) =>
      state.options.find((o) => valuesMatch(getOptionField(o, valueField), value)) ||
      state.selectedOptionsByValue[String(value)] ||
      ({
        [valueField]: value,
        [displayField]: String(value)
      } as unknown as T)
  );
}

export function buildSelectedOptionsMapFromValues<T extends object = ThekSelectOption>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>,
  values: ThekSelectPrimitive[]
): Record<string, T> {
  const valueField = config.valueField;
  const selectedOptionsByValue: Record<string, T> = {};
  values.forEach((value) => {
    const option =
      state.options.find((o) => valuesMatch(getOptionField(o, valueField), value)) ||
      state.selectedOptionsByValue[String(value)];
    if (option) {
      selectedOptionsByValue[String(value)] = option;
    }
  });
  return selectedOptionsByValue;
}
