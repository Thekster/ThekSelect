import { ThekSelectConfig } from '../types.js';
import { RendererCallbacks, SVG_CHEVRON, SVG_SEARCH } from './constants.js';

export interface RendererElements {
  wrapper: HTMLElement;
  control: HTMLElement;
  selectionContainer: HTMLElement;
  indicatorsContainer: HTMLElement;
  placeholderElement: HTMLElement;
  input: HTMLInputElement;
  dropdown: HTMLElement;
  optionsList: HTMLElement;
}

export function createRendererSkeleton<T>(
  id: string,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>,
  signal: AbortSignal
): RendererElements {
  const wrapper = document.createElement('div');
  wrapper.className = 'thek-select';
  if (config.disabled) wrapper.classList.add('thek-disabled');
  if (config.multiple) wrapper.classList.add('thek-multiple');

  const control = document.createElement('div');
  control.className = 'thek-control';
  if (!config.searchable) {
    control.setAttribute('role', 'combobox');
    control.setAttribute('aria-expanded', 'false');
    control.setAttribute('aria-haspopup', 'listbox');
    control.setAttribute('aria-controls', `${id}-list`);
  }
  control.setAttribute('tabindex', config.searchable ? '-1' : '0');

  const selectionContainer = document.createElement('div');
  selectionContainer.className = 'thek-selection';

  // Setup DnD
  selectionContainer.addEventListener('dragstart', (e) => {
    const tag = (e.target as HTMLElement).closest<HTMLElement>('.thek-tag');
    if (!tag) return;
    e.dataTransfer?.setData('text/plain', tag.dataset.index!);
    tag.classList.add('thek-dragging');
  }, { signal });

  selectionContainer.addEventListener('dragend', (e) => {
    (e.target as HTMLElement).closest<HTMLElement>('.thek-tag')?.classList.remove('thek-dragging');
  }, { signal });

  selectionContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    (e.target as HTMLElement).closest<HTMLElement>('.thek-tag')?.classList.add('thek-drag-over');
  }, { signal });

  selectionContainer.addEventListener('dragleave', (e) => {
    (e.target as HTMLElement).closest<HTMLElement>('.thek-tag')?.classList.remove('thek-drag-over');
  }, { signal });

  selectionContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const tag = (e.target as HTMLElement).closest<HTMLElement>('.thek-tag');
    if (!tag) return;
    tag.classList.remove('thek-drag-over');
    const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
    const toIndex = parseInt(tag.dataset.index!);
    if (fromIndex !== -1 && fromIndex !== toIndex) {
      callbacks.onReorder(fromIndex, toIndex);
    }
  }, { signal });

  const placeholderElement = document.createElement('span');
  placeholderElement.className = 'thek-placeholder';
  placeholderElement.textContent = config.placeholder;

  const indicatorsContainer = document.createElement('div');
  indicatorsContainer.className = 'thek-indicators';
  indicatorsContainer.innerHTML = SVG_CHEVRON;

  control.appendChild(selectionContainer);
  control.appendChild(placeholderElement);
  control.appendChild(indicatorsContainer);

  const dropdown = document.createElement('div');
  dropdown.className = 'thek-dropdown';
  dropdown.hidden = true;

  let input: HTMLInputElement;
  if (config.searchable) {
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'thek-search-wrapper';
    searchWrapper.innerHTML = SVG_SEARCH;

    input = document.createElement('input');
    input.className = 'thek-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = config.searchPlaceholder;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', `${id}-list`);
    input.setAttribute('aria-autocomplete', 'list');

    searchWrapper.appendChild(input);
    dropdown.appendChild(searchWrapper);
  } else {
    input = document.createElement('input');
    input.type = 'hidden';
  }

  const optionsList = document.createElement('ul');
  optionsList.className = 'thek-options';
  optionsList.id = `${id}-list`;
  optionsList.setAttribute('role', 'listbox');

  dropdown.appendChild(optionsList);
  wrapper.appendChild(control);

  return {
    wrapper,
    control,
    selectionContainer,
    indicatorsContainer,
    placeholderElement,
    input,
    dropdown,
    optionsList
  };
}
