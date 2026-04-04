import { ThekSelectConfig, ThekSelectState, ThekSelectOption } from './types.js';

const SVG_CHEVRON =
  '<svg class="thek-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>';

const SVG_SEARCH =
  '<svg class="thek-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>';

const SVG_SPINNER =
  '<svg class="thek-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-dasharray="52" stroke-dashoffset="20" stroke-linecap="round"/></svg>';

const SVG_CHECK =
  '<svg class="thek-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>';

export interface RendererCallbacks<T = unknown> {
  onSelect: (option: ThekSelectOption<T>) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption<T>) => void;
  onReorder: (from: number, to: number) => void;
}

export class DomRenderer<T = unknown> {
  public wrapper!: HTMLElement;
  public control!: HTMLElement;
  public selectionContainer!: HTMLElement;
  public indicatorsContainer!: HTMLElement;
  public placeholderElement!: HTMLElement;
  public input!: HTMLInputElement;
  public dropdown!: HTMLElement;
  public optionsList!: HTMLElement;

  private lastState: ThekSelectState<T> | null = null;
  private lastFilteredOptions: ThekSelectOption<T>[] = [];
  private _destroyed = false;

  constructor(
    private config: Required<ThekSelectConfig<T>>,
    private id: string,
    private callbacks: RendererCallbacks<T>
  ) {}

  private normalizeHeight(value: number | string): string {
    if (typeof value === 'number') {
      return `${value}px`;
    }
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }

  private applyHeight(height: number | string): void {
    const resolved = this.normalizeHeight(height);
    this.wrapper.style.setProperty('--thek-input-height', resolved);
    this.dropdown.style.setProperty('--thek-input-height', resolved);
  }

  public createDom(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'thek-select';
    if (this.config.disabled) this.wrapper.classList.add('thek-disabled');
    if (this.config.multiple) this.wrapper.classList.add('thek-multiple');

    this.control = document.createElement('div');
    this.control.className = 'thek-control';
    this.control.setAttribute('role', 'combobox');
    this.control.setAttribute('aria-expanded', 'false');
    this.control.setAttribute('aria-haspopup', 'listbox');
    this.control.setAttribute('aria-controls', `${this.id}-list`);
    this.control.setAttribute('tabindex', '0');

    this.selectionContainer = document.createElement('div');
    this.selectionContainer.className = 'thek-selection';

    this.placeholderElement = document.createElement('span');
    this.placeholderElement.className = 'thek-placeholder';
    this.placeholderElement.textContent = this.config.placeholder;

    this.indicatorsContainer = document.createElement('div');
    this.indicatorsContainer.className = 'thek-indicators';
    this.indicatorsContainer.innerHTML = SVG_CHEVRON;

    this.control.appendChild(this.selectionContainer);
    this.control.appendChild(this.placeholderElement);
    this.control.appendChild(this.indicatorsContainer);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'thek-dropdown';
    this.dropdown.hidden = true;

    if (this.config.searchable) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'thek-search-wrapper';
      searchWrapper.innerHTML = SVG_SEARCH;

      this.input = document.createElement('input');
      this.input.className = 'thek-input';
      this.input.type = 'text';
      this.input.autocomplete = 'off';
      this.input.placeholder = this.config.searchPlaceholder;
      this.input.setAttribute('aria-autocomplete', 'list');

      searchWrapper.appendChild(this.input);
      this.dropdown.appendChild(searchWrapper);
    } else {
      this.input = document.createElement('input');
      this.input.type = 'hidden';
    }

    this.optionsList = document.createElement('ul');
    this.optionsList.className = 'thek-options';
    this.optionsList.id = `${this.id}-list`;
    this.optionsList.setAttribute('role', 'listbox');
    this.optionsList.addEventListener('scroll', () => this.handleOptionsScroll());
    this.optionsList.addEventListener('wheel', (e) => this.handleOptionsWheel(e), {
      passive: false
    });

    this.dropdown.appendChild(this.optionsList);

    this.wrapper.appendChild(this.control);
    document.body.appendChild(this.dropdown);
    this.applyHeight(this.config.height);
  }

  public render(state: ThekSelectState<T>, filteredOptions: ThekSelectOption<T>[]): void {
    this.lastState = state;
    this.lastFilteredOptions = filteredOptions;
    this.control.setAttribute('aria-expanded', state.isOpen.toString());
    this.dropdown.hidden = !state.isOpen;
    this.wrapper.classList.toggle('thek-open', state.isOpen);

    if (state.isLoading) {
      this.indicatorsContainer.innerHTML = SVG_SPINNER;
    } else {
      this.indicatorsContainer.innerHTML = SVG_CHEVRON;
    }

    this.renderSelectionContent(state);
    this.renderOptionsContent(state, filteredOptions);
    // positionDropdown is NOT called here: it runs on open(), resize, and scroll events.
  }

  private renderSelectionContent(state: ThekSelectState<T>): void {
    this.selectionContainer.innerHTML = '';
    const hasSelection = state.selectedValues.length > 0;
    this.placeholderElement.style.display = hasSelection ? 'none' : 'block';
    this.selectionContainer.style.display = hasSelection ? 'flex' : 'none';

    if (hasSelection) {
      const vField = this.config.valueField;
      const dField = this.config.displayField;

      if (this.config.multiple) {
        if (state.selectedValues.length > this.config.maxSelectedLabels) {
          const summary = document.createElement('span');
          summary.className = 'thek-summary-text';
          summary.textContent = `${state.selectedValues.length} items selected`;
          this.selectionContainer.appendChild(summary);
        } else {
          state.selectedValues.forEach((val, i) => {
            const option =
              state.options.find((o) => o[vField] === val) ||
              state.selectedOptionsByValue[val] ||
              ({ [vField]: val, [dField]: val } as unknown as ThekSelectOption<T>);
            const tag = document.createElement('span');
            tag.className = 'thek-tag';
            tag.draggable = true;
            tag.dataset.index = i.toString();
            tag.dataset.value = val;

            const label = document.createElement('span');
            label.className = 'thek-tag-label';
            const content = this.config.renderSelection(option);
            const displayText =
              content instanceof HTMLElement ? String(option[dField] ?? val) : content;
            if (content instanceof HTMLElement) {
              label.appendChild(content);
            } else {
              label.textContent = content;
            }
            tag.appendChild(label);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'thek-tag-remove';
            removeBtn.setAttribute('aria-label', `Remove ${displayText}`);
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.callbacks.onSelect(option);
            });
            tag.appendChild(removeBtn);
            this.setupTagDnd(tag);
            this.selectionContainer.appendChild(tag);
          });
        }
      } else {
        const val = state.selectedValues[0];
        const option =
          state.options.find((o) => o[vField] === val) || state.selectedOptionsByValue[val];
        if (option) {
          const content = this.config.renderSelection(option);
          if (content instanceof HTMLElement) {
            this.selectionContainer.appendChild(content);
          } else {
            this.selectionContainer.textContent = content;
          }
        }
      }
    }
  }

  private renderOptionsContent(
    state: ThekSelectState<T>,
    filteredOptions: ThekSelectOption<T>[],
    alignFocused: boolean = true,
    preservedScrollTop?: number
  ): void {
    this.optionsList.innerHTML = '';
    const vField = this.config.valueField;
    const dField = this.config.displayField;

    if (state.isLoading && filteredOptions.length === 0) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-loading';
      li.textContent = this.config.loadingText;
      this.optionsList.appendChild(li);
      this.updateActiveDescendant(null);
      return;
    }

    const canCreate =
      this.config.canCreate &&
      state.inputValue &&
      !filteredOptions.some(
        (o) => o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
      );
    const shouldVirtualize =
      this.config.virtualize &&
      filteredOptions.length >= this.config.virtualThreshold &&
      !canCreate;
    const itemHeight = Math.max(20, this.config.virtualItemHeight);
    const overscan = Math.max(0, this.config.virtualOverscan);

    if (shouldVirtualize) {
      const viewportHeight = this.optionsList.clientHeight || 240;
      if (alignFocused && state.focusedIndex >= 0 && state.focusedIndex < filteredOptions.length) {
        const focusedTop = state.focusedIndex * itemHeight;
        const focusedBottom = focusedTop + itemHeight;
        const currentTop = this.optionsList.scrollTop;
        const currentBottom = currentTop + viewportHeight;
        if (focusedTop < currentTop) {
          this.optionsList.scrollTop = focusedTop;
        } else if (focusedBottom > currentBottom) {
          this.optionsList.scrollTop = focusedBottom - viewportHeight;
        }
      }

      const scrollTop = preservedScrollTop ?? this.optionsList.scrollTop;
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        filteredOptions.length,
        Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
      );

      if (start > 0) {
        this.optionsList.appendChild(this.createSpacer(start * itemHeight));
      }

      for (let index = start; index < end; index++) {
        this.optionsList.appendChild(
          this.createOptionItem(filteredOptions[index], index, state, vField)
        );
      }

      if (end < filteredOptions.length) {
        this.optionsList.appendChild(
          this.createSpacer((filteredOptions.length - end) * itemHeight)
        );
      }

      if (typeof preservedScrollTop === 'number') {
        this.optionsList.scrollTop = preservedScrollTop;
      }
    } else {
      filteredOptions.forEach((option, index) => {
        this.optionsList.appendChild(this.createOptionItem(option, index, state, vField));
      });
    }

    const exactMatch = filteredOptions.some(
      (o) => o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
    );
    if (this.config.canCreate && state.inputValue && !exactMatch) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-create';
      li.textContent = this.config.createText.replace('{%t}', state.inputValue);
      if (state.focusedIndex === filteredOptions.length) li.classList.add('thek-focused');
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onCreate(state.inputValue);
      });
      this.optionsList.appendChild(li);
    }
    if (filteredOptions.length === 0 && (!this.config.canCreate || !state.inputValue)) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-no-results';
      li.textContent = this.config.noResultsText;
      this.optionsList.appendChild(li);
    }

    const activeDescendantId =
      state.focusedIndex >= 0 &&
      state.focusedIndex < filteredOptions.length &&
      !!document.getElementById(`${this.id}-opt-${state.focusedIndex}`)
        ? `${this.id}-opt-${state.focusedIndex}`
        : null;
    this.updateActiveDescendant(activeDescendantId);
  }

  /** Set aria-activedescendant on the appropriate focusable element. */
  private updateActiveDescendant(id: string | null): void {
    if (this.config.searchable) {
      if (id) {
        this.input.setAttribute('aria-activedescendant', id);
      } else {
        this.input.removeAttribute('aria-activedescendant');
      }
    } else {
      if (id) {
        this.control.setAttribute('aria-activedescendant', id);
      } else {
        this.control.removeAttribute('aria-activedescendant');
      }
    }
  }

  private createSpacer(height: number): HTMLLIElement {
    const spacer = document.createElement('li');
    spacer.style.height = `${height}px`;
    spacer.style.padding = '0';
    spacer.style.margin = '0';
    spacer.style.listStyle = 'none';
    spacer.setAttribute('aria-hidden', 'true');
    return spacer;
  }

  private createOptionItem(
    option: ThekSelectOption<T>,
    index: number,
    state: ThekSelectState<T>,
    valueField: string
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'thek-option';
    li.id = `${this.id}-opt-${index}`;
    const isSelected = state.selectedValues.includes(option[valueField] as string);

    if (option.disabled) {
      li.classList.add('thek-disabled');
      li.setAttribute('aria-disabled', 'true');
    }
    if (isSelected) li.classList.add('thek-selected');
    if (state.focusedIndex === index) li.classList.add('thek-focused');

    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', isSelected.toString());

    if (this.config.multiple) {
      const checkbox = document.createElement('div');
      checkbox.className = 'thek-checkbox';
      if (isSelected) {
        checkbox.innerHTML = SVG_CHECK;
      }
      li.appendChild(checkbox);
    }

    const label = document.createElement('span');
    label.className = 'thek-option-label';
    const content = this.config.renderOption(option);
    if (content instanceof HTMLElement) {
      label.appendChild(content);
    } else {
      label.textContent = content;
    }
    li.appendChild(label);

    li.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onSelect(option);
    });
    return li;
  }

  private handleOptionsScroll(): void {
    if (!this.config.virtualize || !this.lastState) return;
    const scrollTop = this.optionsList.scrollTop;
    this.renderOptionsContent(this.lastState, this.lastFilteredOptions, false, scrollTop);
  }

  private handleOptionsWheel(e: WheelEvent): void {
    if (!this.config.virtualize) return;
    const list = this.optionsList;
    const atTop = list.scrollTop <= 0;
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    const scrollingUp = e.deltaY < 0;
    const scrollingDown = e.deltaY > 0;

    if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
      e.preventDefault();
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        // DOM_DELTA_LINE: multiply by item height to get pixels
        delta *= Math.max(1, this.config.virtualItemHeight);
      } else if (e.deltaMode === 2) {
        // DOM_DELTA_PAGE: multiply by visible list height
        delta *= list.clientHeight || 240;
      }
      list.scrollTop += delta;
    }
  }

  public positionDropdown(): void {
    const rect = this.control.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    this.dropdown.style.position = 'absolute';
    this.dropdown.style.zIndex = '9999';

    let width = rect.width;
    if (width > viewportWidth - 20) {
      width = viewportWidth - 20;
    }
    this.dropdown.style.width = `${width}px`;

    let left = rect.left + scrollX;
    if (rect.left + width > viewportWidth) {
      left = viewportWidth - width - 10 + scrollX;
    }
    if (left < scrollX + 10) {
      left = scrollX + 10;
    }

    this.dropdown.style.left = `${left}px`;

    const viewportHeight = window.innerHeight;
    const dropdownHeight = this.optionsList.clientHeight || 240;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const flipUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    this.dropdown.classList.toggle('thek-drop-up', flipUp);

    if (flipUp) {
      this.dropdown.style.top = `${rect.top + scrollY - dropdownHeight - 4}px`;
    } else {
      this.dropdown.style.top = `${rect.bottom + scrollY}px`;
    }
  }

  private setupTagDnd(tag: HTMLElement): void {
    tag.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', tag.dataset.index!);
      tag.classList.add('thek-dragging');
    });
    tag.addEventListener('dragend', () => {
      tag.classList.remove('thek-dragging');
    });
    tag.addEventListener('dragover', (e) => {
      e.preventDefault();
      tag.classList.add('thek-drag-over');
    });
    tag.addEventListener('dragleave', () => {
      tag.classList.remove('thek-drag-over');
    });
    tag.addEventListener('drop', (e) => {
      e.preventDefault();
      tag.classList.remove('thek-drag-over');
      const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
      const toIndex = parseInt(tag.dataset.index!);
      if (fromIndex !== -1 && fromIndex !== toIndex) {
        this.callbacks.onReorder(fromIndex, toIndex);
      }
    });
  }

  public setHeight(height: number | string): void {
    this.config.height = height as unknown as string | number;
    this.applyHeight(height);
  }

  public updateConfig(newConfig: Partial<Required<ThekSelectConfig<T>>>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
}
