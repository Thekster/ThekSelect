import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectPrimitive,
  ThekSelectState,
  getOptionField,
  valuesMatch
} from './types.js';

type TagEvent = 'tagAdded' | 'tagRemoved';

export interface SelectionUpdate<T = unknown> {
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, ThekSelectOption<T>>;
  inputValue?: string;
  tagEvent?: TagEvent;
  tagOption?: ThekSelectOption<T>;
}

export function applySelection<T = unknown>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>,
  option: ThekSelectOption<T>
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

export function createOptionFromLabel<T = unknown>(
  config: Required<ThekSelectConfig<T>>,
  label: string
): ThekSelectOption<T> {
  const value = label;
  return {
    value,
    label,
    [config.valueField]: value,
    [config.displayField]: label
  };
}

export function removeLastSelection<T = unknown>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): {
  selectedValues: ThekSelectPrimitive[];
  selectedOptionsByValue: Record<string, ThekSelectOption<T>>;
  removedOption?: ThekSelectOption<T>;
} {
  const valueField = config.valueField;
  const selectedValues = [...state.selectedValues];
  const selectedOptionsByValue = { ...state.selectedOptionsByValue };
  const removedValue = selectedValues.pop();
  if (!removedValue) {
    return { selectedValues, selectedOptionsByValue };
  }

  const removedOption =
    state.options.find((o) => valuesMatch(getOptionField(o, valueField), removedValue)) ||
    selectedOptionsByValue[String(removedValue)];
  delete selectedOptionsByValue[String(removedValue)];

  return { selectedValues, selectedOptionsByValue, removedOption };
}

export function reorderSelectedValues(
  state: ThekSelectState,
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

export function resolveSelectedOptions<T = unknown>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>
): ThekSelectOption<T>[] {
  const valueField = config.valueField;
  const displayField = config.displayField;

  return state.selectedValues.map(
    (value) =>
      state.options.find((o) => valuesMatch(getOptionField(o, valueField), value)) ||
      state.selectedOptionsByValue[String(value)] ||
      ({
        value,
        label: String(value),
        [valueField]: value,
        [displayField]: String(value)
      } as unknown as ThekSelectOption<T>)
  );
}

export function buildSelectedOptionsMapFromValues<T = unknown>(
  config: Required<ThekSelectConfig<T>>,
  state: ThekSelectState<T>,
  values: ThekSelectPrimitive[]
): Record<string, ThekSelectOption<T>> {
  const valueField = config.valueField;
  const selectedOptionsByValue: Record<string, ThekSelectOption<T>> = {};
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
