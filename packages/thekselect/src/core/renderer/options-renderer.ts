import {
  ThekSelectConfig,
  ThekSelectState,
  ThekSelectOption,
  getOptionField,
  valuesMatch
} from '../types.js';
import { RendererCallbacks, createCheckIcon, replaceChildrenWithIcon } from './constants.js';
import { safeRender } from './selection-renderer.js';

export function createSpacer(height: number): HTMLLIElement {
  const spacer = document.createElement('li');
  spacer.className = 'thek-virtual-spacer';
  spacer.style.height = `${height}px`;
  spacer.style.padding = '0';
  spacer.style.margin = '0';
  spacer.style.listStyle = 'none';
  spacer.setAttribute('aria-hidden', 'true');
  return spacer;
}

function getVirtualSpacer(
  list: HTMLElement,
  position: 'top' | 'bottom',
  before?: Node | null
): HTMLLIElement {
  const selector = `.thek-virtual-spacer[data-position="${position}"]`;
  let spacer = list.querySelector<HTMLLIElement>(selector);
  if (!spacer) {
    spacer = createSpacer(0);
    spacer.dataset.position = position;
    if (before) {
      list.insertBefore(spacer, before);
    } else {
      list.appendChild(spacer);
    }
  }
  return spacer;
}

function syncVirtualSpacerHeight(spacer: HTMLLIElement, height: number): void {
  spacer.style.height = `${height}px`;
  spacer.hidden = height === 0;
}

export function updateOptionAttrs<T extends object = ThekSelectOption>(
  li: HTMLLIElement,
  option: T,
  index: number,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  id: string
): void {
  const vField = config.valueField;
  const isSelected = state.selectedValues.some((v) =>
    valuesMatch(v, getOptionField(option, vField))
  );
  li.id = `${id}-opt-${index}`;
  li.classList.toggle('thek-selected', isSelected);
  li.classList.toggle('thek-focused', state.focusedIndex === index);
  li.setAttribute('aria-selected', isSelected.toString());
  // `disabled` is a ThekSelectOption convention; T may not declare it.
  const isDisabled = !!(option as Record<string, unknown>)['disabled'];
  li.classList.toggle('thek-disabled', isDisabled);
  if (isDisabled) {
    li.setAttribute('aria-disabled', 'true');
  } else {
    li.removeAttribute('aria-disabled');
  }
  if (config.multiple) {
    const checkbox = li.querySelector<HTMLElement>('.thek-checkbox');
    if (checkbox) {
      const hasSvg = checkbox.querySelector('.thek-check') !== null;
      if (isSelected && !hasSvg) {
        replaceChildrenWithIcon(checkbox, createCheckIcon());
      } else if (!isSelected && hasSvg) {
        checkbox.replaceChildren();
      }
    }
  }
}

export function updateOptionContent<T extends object = ThekSelectOption>(
  li: HTMLLIElement,
  option: T,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): void {
  const label = li.querySelector<HTMLElement>('.thek-option-label');
  if (!label) return;

  label.textContent = '';
  const content = safeRender(config.renderOption, option, config, callbacks.onError);
  if (content instanceof HTMLElement) {
    label.appendChild(content);
  } else {
    label.textContent = content;
  }

  li.onclick = (e) => {
    e.stopPropagation();
    callbacks.onSelect(option);
  };
}

export function createOptionItem<T extends object = ThekSelectOption>(
  option: T,
  index: number,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  id: string
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'thek-option';
  updateOptionAttrs(li, option, index, state, config, id);

  li.setAttribute('role', 'option');

  if (config.multiple) {
    const checkbox = document.createElement('div');
    checkbox.className = 'thek-checkbox';
    const isSelected = state.selectedValues.some((v) =>
      valuesMatch(v, getOptionField(option, config.valueField))
    );
    if (isSelected) {
      replaceChildrenWithIcon(checkbox, createCheckIcon());
    }
    li.appendChild(checkbox);
  }

  const label = document.createElement('span');
  label.className = 'thek-option-label';
  li.appendChild(label);

  // updateOptionContent populates the label and wires onclick — do not render inline here.
  updateOptionContent(li, option, config, callbacks);
  return li;
}

export function renderOptionsContent<T extends object = ThekSelectOption>(
  list: HTMLElement,
  state: ThekSelectState<T>,
  filteredOptions: T[],
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  id: string,
  alignFocused: boolean = true,
  preservedScrollTop?: number
): void {
  const vField = config.valueField;
  const dField = config.displayField;

  if (state.isLoading && filteredOptions.length === 0) {
    list.replaceChildren();
    const li = document.createElement('li');
    li.className = 'thek-option thek-loading';
    li.dataset.key = '__loading__';
    li.setAttribute('aria-hidden', 'true');
    li.textContent = config.loadingText;
    list.appendChild(li);
    return;
  }

  const exactMatch = filteredOptions.some((o) => {
    const v = getOptionField(o, dField);
    return v != null && v.toString().toLowerCase() === state.inputValue.toLowerCase();
  });
  const canCreate = config.canCreate && !!state.inputValue && !exactMatch;
  const shouldVirtualize = config.virtualize && filteredOptions.length >= config.virtualThreshold;
  const itemHeight = Math.max(20, config.virtualItemHeight);
  const overscan = Math.max(0, config.virtualOverscan);

  if (shouldVirtualize) {
    const totalItems = filteredOptions.length + (canCreate ? 1 : 0);
    const viewportHeight = list.clientHeight || 240;
    if (alignFocused && state.focusedIndex >= 0 && state.focusedIndex < totalItems) {
      const focusedTop = state.focusedIndex * itemHeight;
      const focusedBottom = focusedTop + itemHeight;
      const currentTop = list.scrollTop;
      const currentBottom = currentTop + viewportHeight;
      if (focusedTop < currentTop) {
        list.scrollTop = focusedTop;
      } else if (focusedBottom > currentBottom) {
        list.scrollTop = focusedBottom - viewportHeight;
      }
    }

    const scrollTop = preservedScrollTop ?? list.scrollTop;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      totalItems,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    if (typeof preservedScrollTop === 'number') {
      list.scrollTop = preservedScrollTop;
    }

    for (const child of Array.from(list.children) as HTMLLIElement[]) {
      if (child.classList.contains('thek-loading') || child.classList.contains('thek-no-results')) {
        list.removeChild(child);
      }
    }

    const topSpacer = getVirtualSpacer(list, 'top', list.firstChild);
    const bottomSpacer = getVirtualSpacer(list, 'bottom');
    syncVirtualSpacerHeight(topSpacer, start * itemHeight);

    const existingOptions = Array.from(
      list.querySelectorAll<HTMLLIElement>('.thek-option:not(.thek-loading):not(.thek-no-results)')
    );
    const needed = end - start;

    for (let offset = 0; offset < needed; offset++) {
      const optionIndex = start + offset;
      const isCreate = canCreate && optionIndex === filteredOptions.length;
      let li = existingOptions[offset];

      if (isCreate) {
        if (!li || li.dataset.key !== '__create__') {
          const createLi = document.createElement('li');
          createLi.className = 'thek-option thek-create';
          createLi.setAttribute('role', 'option');
          createLi.setAttribute('aria-selected', 'false');
          createLi.dataset.key = '__create__';
          createLi.onclick = (e) => {
            e.stopPropagation();
            callbacks.onCreate(state.inputValue);
          };
          if (li) {
            list.replaceChild(createLi, li);
            existingOptions[offset] = createLi;
            li = createLi;
          } else {
            list.insertBefore(createLi, bottomSpacer);
            li = createLi;
          }
        }
        li.textContent = config.createText.replace('{%t}', state.inputValue);
        li.classList.toggle('thek-focused', state.focusedIndex === filteredOptions.length);
      } else {
        const option = filteredOptions[optionIndex];
        if (!li || li.dataset.key === '__create__') {
          const newLi = createOptionItem(option, optionIndex, state, config, callbacks, id);
          if (li) {
            list.replaceChild(newLi, li);
            existingOptions[offset] = newLi;
            li = newLi;
          } else {
            list.insertBefore(newLi, bottomSpacer);
            li = newLi;
          }
        } else {
          updateOptionAttrs(li, option, optionIndex, state, config, id);
          updateOptionContent(li, option, config, callbacks);
        }
      }
    }

    for (let index = existingOptions.length - 1; index >= needed; index--) {
      existingOptions[index].remove();
    }

    syncVirtualSpacerHeight(bottomSpacer, (totalItems - end) * itemHeight);
    if (list.firstChild !== topSpacer) list.insertBefore(topSpacer, list.firstChild);
    if (list.lastChild !== bottomSpacer) list.appendChild(bottomSpacer);
  } else {
    for (const child of Array.from(list.children) as HTMLLIElement[]) {
      if (child.classList.contains('thek-virtual-spacer')) {
        list.removeChild(child);
      }
    }

    const existing = new Map<string, HTMLLIElement>();
    for (const child of Array.from(list.children) as HTMLLIElement[]) {
      const key = child.dataset.key;
      if (key) existing.set(key, child);
    }

    filteredOptions.forEach((option, index) => {
      const fv = getOptionField(option, vField);
      const key = fv != null ? `v:${String(fv)}` : `i:${index}`;
      let li = existing.get(key);
      if (li) {
        existing.delete(key);
        updateOptionAttrs(li, option, index, state, config, id);
        updateOptionContent(li, option, config, callbacks);
      } else {
        li = createOptionItem(option, index, state, config, callbacks, id);
        li.dataset.key = key;
      }
      list.appendChild(li);
    });

    if (canCreate) {
      const createKey = '__create__';
      let createLi = existing.get(createKey) as HTMLLIElement | undefined;
      existing.delete(createKey);
      if (!createLi) {
        createLi = document.createElement('li');
        createLi.className = 'thek-option thek-create';
        createLi.setAttribute('role', 'option');
        createLi.setAttribute('aria-selected', 'false');
        createLi.dataset.key = createKey;
      }
      createLi.onclick = (e) => {
        e.stopPropagation();
        callbacks.onCreate(state.inputValue);
      };
      createLi.textContent = config.createText.replace('{%t}', state.inputValue);
      createLi.classList.toggle('thek-focused', state.focusedIndex === filteredOptions.length);
      list.appendChild(createLi);
    }

    if (filteredOptions.length === 0 && (!config.canCreate || !state.inputValue)) {
      const noResultsKey = '__no-results__';
      let noLi = existing.get(noResultsKey) as HTMLLIElement | undefined;
      existing.delete(noResultsKey);
      if (!noLi) {
        noLi = document.createElement('li');
        noLi.className = 'thek-option thek-no-results';
        noLi.setAttribute('aria-hidden', 'true');
        noLi.dataset.key = noResultsKey;
      }
      noLi.textContent = config.noResultsText;
      list.appendChild(noLi);
    }

    for (const node of existing.values()) {
      list.removeChild(node);
    }
  }
}
