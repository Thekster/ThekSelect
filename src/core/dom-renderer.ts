import { ThekSelectConfig, ThekSelectState, ThekSelectOption } from './types.js';

export interface RendererCallbacks {
  onSelect: (option: ThekSelectOption) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption) => void;
  onReorder: (from: number, to: number) => void;
}

export class DomRenderer {
  public wrapper!: HTMLElement;
  public control!: HTMLElement;
  public selectionContainer!: HTMLElement;
  public indicatorsContainer!: HTMLElement;
  public placeholderElement!: HTMLElement;
  public input!: HTMLInputElement;
  public dropdown!: HTMLElement;
  public optionsList!: HTMLElement;
  
  private lastState: ThekSelectState | null = null;
  private lastFilteredOptions: ThekSelectOption[] = [];

  constructor(
    private config: Required<ThekSelectConfig>,
    private id: string,
    private callbacks: RendererCallbacks
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

    this.selectionContainer = document.createElement('div');
    this.selectionContainer.className = 'thek-selection';

    this.placeholderElement = document.createElement('span');
    this.placeholderElement.className = 'thek-placeholder';
    this.placeholderElement.textContent = this.config.placeholder;

    this.indicatorsContainer = document.createElement('div');
    this.indicatorsContainer.className = 'thek-indicators';
    this.indicatorsContainer.innerHTML = '<i class="fa-solid fa-chevron-down thek-arrow"></i>';

    this.control.appendChild(this.selectionContainer);
    this.control.appendChild(this.placeholderElement);
    this.control.appendChild(this.indicatorsContainer);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'thek-dropdown';
    this.dropdown.hidden = true;

    if (this.config.searchable) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'thek-search-wrapper';
      searchWrapper.innerHTML = '<i class="fa-solid fa-magnifying-glass thek-search-icon"></i>';

      this.input = document.createElement('input');
      this.input.className = 'thek-input';
      this.input.type = 'text';
      this.input.autocomplete = 'off';
      this.input.placeholder = 'Search...';
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
    this.optionsList.addEventListener('wheel', (e) => this.handleOptionsWheel(e), { passive: false });

    this.dropdown.appendChild(this.optionsList);

    this.wrapper.appendChild(this.control);
    document.body.appendChild(this.dropdown);
    this.applyHeight(this.config.height);

  }

  public render(state: ThekSelectState, filteredOptions: ThekSelectOption[]): void {
    this.lastState = state;
    this.lastFilteredOptions = filteredOptions;
    this.control.setAttribute('aria-expanded', state.isOpen.toString());
    this.dropdown.hidden = !state.isOpen;
    this.wrapper.classList.toggle('thek-open', state.isOpen);
    
    if (state.isLoading) {
      this.indicatorsContainer.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-muted"></i>';
    } else {
      this.indicatorsContainer.innerHTML = '<i class="fa-solid fa-chevron-down thek-arrow"></i>';
    }

    this.renderSelectionContent(state);
    this.renderOptionsContent(state, filteredOptions);
    if (state.isOpen) this.positionDropdown();
  }

  private renderSelectionContent(state: ThekSelectState): void {
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
            const option = state.options.find(o => o[vField] === val) || state.selectedOptionsByValue[val] || { [vField]: val, [dField]: val } as any;
            const tag = document.createElement('span');
            tag.className = 'thek-tag';
            tag.draggable = true;
            tag.dataset.index = i.toString();
            tag.dataset.value = val;
            
            const label = document.createElement('span');
            label.className = 'thek-tag-label';
            const content = this.config.renderSelection(option);
            if (content instanceof HTMLElement) {
              label.appendChild(content);
            } else {
              label.textContent = content;
            }
            tag.appendChild(label);

            const removeBtn = document.createElement('span');
            removeBtn.className = 'thek-tag-remove';
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
        const option = state.options.find(o => o[vField] === val) || state.selectedOptionsByValue[val];
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
    state: ThekSelectState,
    filteredOptions: ThekSelectOption[],
    alignFocused: boolean = true,
    preservedScrollTop?: number
  ): void {
    this.optionsList.innerHTML = '';
    const vField = this.config.valueField;
    const dField = this.config.displayField;

    if (state.isLoading && filteredOptions.length === 0) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-loading';
      li.textContent = 'Loading...';
      this.optionsList.appendChild(li);
      return;
    }

    const canCreate =
      this.config.canCreate &&
      state.inputValue &&
      !filteredOptions.some(
        o => o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
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
        this.optionsList.appendChild(this.createOptionItem(filteredOptions[index], index, state, vField));
      }

      if (end < filteredOptions.length) {
        this.optionsList.appendChild(this.createSpacer((filteredOptions.length - end) * itemHeight));
      }

      if (typeof preservedScrollTop === 'number') {
        this.optionsList.scrollTop = preservedScrollTop;
      }
    } else {
      filteredOptions.forEach((option, index) => {
        this.optionsList.appendChild(this.createOptionItem(option, index, state, vField));
      });
    }

    const exactMatch = filteredOptions.some(o => 
        o[dField] && o[dField].toString().toLowerCase() === state.inputValue.toLowerCase()
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
      li.textContent = 'No results found';
      this.optionsList.appendChild(li);
    }

    const activeDescendantId =
      state.focusedIndex >= 0 &&
      state.focusedIndex < filteredOptions.length &&
      !!document.getElementById(`${this.id}-opt-${state.focusedIndex}`)
        ? `${this.id}-opt-${state.focusedIndex}`
        : null;
    if (this.config.searchable) {
      if (activeDescendantId) {
        this.input.setAttribute('aria-activedescendant', activeDescendantId);
      } else {
        this.input.removeAttribute('aria-activedescendant');
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
    option: ThekSelectOption,
    index: number,
    state: ThekSelectState,
    valueField: string
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'thek-option';
    li.id = `${this.id}-opt-${index}`;
    const isSelected = state.selectedValues.includes(option[valueField]);

    if (option.disabled) li.classList.add('thek-disabled');
    if (isSelected) li.classList.add('thek-selected');
    if (state.focusedIndex === index) li.classList.add('thek-focused');

    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', isSelected.toString());

    if (this.config.multiple) {
      const checkbox = document.createElement('div');
      checkbox.className = 'thek-checkbox';
      if (isSelected) {
        checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
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
      list.scrollTop += e.deltaY;
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
      left = (viewportWidth - width - 10) + scrollX;
    }
    if (left < scrollX + 10) {
      left = scrollX + 10;
    }

    this.dropdown.style.left = `${left}px`;
    this.dropdown.style.top = `${rect.bottom + scrollY}px`;
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
    this.config.height = height as any;
    this.applyHeight(height);
  }

  public updateConfig(newConfig: Partial<Required<ThekSelectConfig>>): void {
      this.config = { ...this.config, ...newConfig };
  }

  public destroy(): void {
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
}
