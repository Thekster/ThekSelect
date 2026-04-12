import { ThekSelectConfig, ThekSelectState, ThekSelectOption } from '../types.js';
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

export function updateOptionAttrs<T>(
  li: HTMLLIElement,
  option: ThekSelectOption<T>,
  index: number,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  id: string
): void {
  const vField = config.valueField;
  const isSelected = state.selectedValues.includes(option[vField] as string | number);
  li.id = `${id}-opt-${index}`;
  li.classList.toggle('thek-selected', isSelected);
  li.classList.toggle('thek-focused', state.focusedIndex === index);
  li.setAttribute('aria-selected', isSelected.toString());
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

export function updateOptionContent<T>(
  li: HTMLLIElement,
  option: ThekSelectOption<T>,
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

export function createOptionItem<T>(
  option: ThekSelectOption<T>,
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
    const isSelected = state.selectedValues.includes(option[config.valueField] as string | number);
    if (isSelected) {
      replaceChildrenWithIcon(checkbox, createCheckIcon());
    }
    li.appendChild(checkbox);
  }

  const label = document.createElement('span');
  label.className = 'thek-option-label';
  const content = safeRender(config.renderOption, option, config, callbacks.onError);
  if (content instanceof HTMLElement) {
    label.appendChild(content);
  } else {
    label.textContent = content;
  }
  li.appendChild(label);

  updateOptionContent(li, option, config, callbacks);
  return li;
}

export function renderOptionsContent<T>(
  list: HTMLElement,
  state: ThekSelectState<T>,
  filteredOptions: ThekSelectOption<T>[],
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  id: string,
  alignFocused: boolean = true,
  preservedScrollTop?: number
): void {
  const vField = config.valueField;
  const dField = config.displayField;

  if (state.isLoading && filteredOptions.length === 0) {
    list.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'thek-option thek-loading';
    li.dataset.key = '__loading__';
    li.textContent = config.loadingText;
    list.appendChild(li);
    return;
  }

  const exactMatch = filteredOptions.some(
    (o) => o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
  );
  const canCreate = config.canCreate && !!state.inputValue && !exactMatch;
  const shouldVirtualize =
    config.virtualize && filteredOptions.length >= config.virtualThreshold && !canCreate;
  const itemHeight = Math.max(20, config.virtualItemHeight);
  const overscan = Math.max(0, config.virtualOverscan);

  if (shouldVirtualize) {
    const viewportHeight = list.clientHeight || 240;
    if (alignFocused && state.focusedIndex >= 0 && state.focusedIndex < filteredOptions.length) {
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
      filteredOptions.length,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    if (start > 0) {
      list.appendChild(createSpacer(start * itemHeight));
    }

    for (let index = start; index < end; index++) {
      list.appendChild(
        createOptionItem(filteredOptions[index], index, state, config, callbacks, id)
      );
    }

    if (end < filteredOptions.length) {
      list.appendChild(createSpacer((filteredOptions.length - end) * itemHeight));
    }

    if (typeof preservedScrollTop === 'number') {
      list.scrollTop = preservedScrollTop;
    }

    for (const child of Array.from(list.children) as HTMLLIElement[]) {
      if (
        child.classList.contains('thek-loading') ||
        child.classList.contains('thek-no-results') ||
        child.classList.contains('thek-create')
      ) {
        list.removeChild(child);
      }
    }

    const topSpacer = getVirtualSpacer(list, 'top', list.firstChild);
    const bottomSpacer = getVirtualSpacer(list, 'bottom');
    syncVirtualSpacerHeight(topSpacer, start * itemHeight);

    const existingOptions = Array.from(
      list.querySelectorAll<HTMLLIElement>(
        '.thek-option:not(.thek-loading):not(.thek-no-results):not(.thek-create)'
      )
    );
    const needed = end - start;

    for (let offset = 0; offset < needed; offset++) {
      const optionIndex = start + offset;
      const option = filteredOptions[optionIndex];
      let li = existingOptions[offset];
      if (li) {
        updateOptionAttrs(li, option, optionIndex, state, config, id);
        updateOptionContent(li, option, config, callbacks);
      } else {
        li = createOptionItem(option, optionIndex, state, config, callbacks, id);
        list.insertBefore(li, bottomSpacer);
      }
    }

    for (let index = existingOptions.length - 1; index >= needed; index--) {
      existingOptions[index].remove();
    }

    syncVirtualSpacerHeight(bottomSpacer, (filteredOptions.length - end) * itemHeight);
    list.insertBefore(topSpacer, list.firstChild);
    list.appendChild(bottomSpacer);
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
      const key = option[vField] != null ? `v:${String(option[vField])}` : `i:${index}`;
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
