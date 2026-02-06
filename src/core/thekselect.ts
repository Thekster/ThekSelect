import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent
} from './types.js';
import { debounce } from '../utils/debounce.js';
import { generateId, escapeHtml } from '../utils/dom.js';

const NOOP_LOAD_OPTIONS = async () => [];

export class ThekSelect {
  private config: Required<ThekSelectConfig>;
  private stateManager: StateManager<ThekSelectState>;
  private wrapper!: HTMLElement;
  private control!: HTMLElement;
  private selectionContainer!: HTMLElement;
  private input!: HTMLInputElement;
  private dropdown!: HTMLElement;
  private optionsList!: HTMLElement;
  private id: string;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private originalElement: HTMLElement;
  private documentClickListener!: (e: MouseEvent) => void;

  constructor(element: string | HTMLElement, config: ThekSelectConfig = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) throw new Error('Element not found');
    this.originalElement = el as HTMLElement;
    this.id = generateId();

    this.config = this.parseConfig(config);
    this.stateManager = new StateManager<ThekSelectState>(this.getInitialState());

    this.setupHandleSearch();
    this.init();
  }

  private parseConfig(config: ThekSelectConfig): Required<ThekSelectConfig> {
    const isSelect = this.originalElement instanceof HTMLSelectElement;
    const initialOptions = isSelect ? this.parseSelectOptions(this.originalElement as HTMLSelectElement) : (config.options || []);

    const defaultConfig: Required<ThekSelectConfig> = {
      options: initialOptions,
      multiple: isSelect ? (this.originalElement as HTMLSelectElement).multiple : false,
      searchable: true,
      disabled: isSelect ? (this.originalElement as HTMLSelectElement).disabled : false,
      placeholder: 'Select...',
      canCreate: false,
      createText: "Create '{%t}'...",
      size: 'md',
      debounce: 300,
      loadOptions: NOOP_LOAD_OPTIONS as any,
      renderOption: (o: ThekSelectOption) => o.label,
      renderSelection: (o: ThekSelectOption) => o.label,
    };

    return {
      ...defaultConfig,
      ...config
    };
  }

  private parseSelectOptions(select: HTMLSelectElement): ThekSelectOption[] {
    return Array.from(select.options).map(opt => ({
      value: opt.value,
      label: opt.text,
      disabled: opt.disabled,
      selected: opt.selected
    }));
  }

  private getInitialState(): ThekSelectState {
    const selectedValues = this.config.multiple
      ? this.config.options.filter(o => o.selected).map(o => o.value)
      : (this.config.options.find(o => o.selected)?.value ? [this.config.options.find(o => o.selected)!.value] : []);

    return {
      options: this.config.options,
      selectedValues,
      isOpen: false,
      focusedIndex: -1,
      inputValue: '',
      isLoading: false
    };
  }

  private init(): void {
    this.createDom();
    this.setupListeners();
    this.stateManager.subscribe(() => this.render());
    this.render();

    if (this.originalElement.parentNode) {
      this.originalElement.style.display = 'none';
      this.originalElement.parentNode.insertBefore(this.wrapper, this.originalElement.nextSibling);
    }
  }

  private createDom(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = `thek-select thek-select-${this.config.size}`;
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

    this.input = document.createElement('input');
    this.input.className = 'thek-input';
    this.input.type = 'text';
    this.input.autocomplete = 'off';
    this.input.placeholder = this.config.placeholder;
    this.input.setAttribute('aria-autocomplete', 'list');

    this.control.appendChild(this.selectionContainer);
    this.control.appendChild(this.input);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'thek-dropdown';
    this.dropdown.hidden = true;

    this.optionsList = document.createElement('ul');
    this.optionsList.className = 'thek-options';
    this.optionsList.id = `${this.id}-list`;
    this.optionsList.setAttribute('role', 'listbox');

    this.dropdown.appendChild(this.optionsList);

    this.wrapper.appendChild(this.control);
    this.wrapper.appendChild(this.dropdown);
  }

  private setupListeners(): void {
    this.control.addEventListener('click', () => {
      if (this.config.disabled) return;
      this.toggleDropdown();
      this.input.focus();
    });

    this.input.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.stateManager.setState({ inputValue: value });
      this.handleSearch(value);
    });

    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.documentClickListener = (e: MouseEvent) => {
      if (!this.wrapper.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this.documentClickListener);
  }

  private handleSearch!: (query: string) => void;

  private setupHandleSearch(): void {
    this.handleSearch = debounce(async (query: string) => {
      this.emit('search', query);
      const isRemote = this.config.loadOptions && this.config.loadOptions !== NOOP_LOAD_OPTIONS;
      if (isRemote) {
        if (query.length > 0) {
          this.stateManager.setState({ isLoading: true });
          try {
            const options = await this.config.loadOptions(query);
            this.stateManager.setState({ options, isLoading: false, focusedIndex: 0 });
          } catch (error) {
            this.stateManager.setState({ isLoading: false });
          }
        } else {
          // Reset options if search is cleared in remote mode
          this.stateManager.setState({ options: this.config.options, focusedIndex: -1 });
        }
      } else {
        this.stateManager.setState({ focusedIndex: 0 });
      }
    }, this.config.debounce);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.openDropdown();
        const maxIndex = this.config.canCreate && state.inputValue && !filteredOptions.some(o => o.label.toLowerCase() === state.inputValue.toLowerCase())
          ? filteredOptions.length
          : filteredOptions.length - 1;
        this.stateManager.setState({
          focusedIndex: Math.min(state.focusedIndex + 1, maxIndex)
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.stateManager.setState({
          focusedIndex: Math.max(state.focusedIndex - 1, 0)
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (state.focusedIndex >= 0 && state.focusedIndex < filteredOptions.length) {
          this.selectOption(filteredOptions[state.focusedIndex]);
        } else if (this.config.canCreate && state.inputValue && state.focusedIndex === filteredOptions.length) {
          this.createAndSelectOption(state.inputValue);
        }
        break;
      case 'Escape':
        this.closeDropdown();
        break;
      case 'Backspace':
        if (state.inputValue === '' && this.config.multiple && state.selectedValues.length > 0) {
          this.removeLastSelection();
        }
        break;
    }
  }

  private getFilteredOptions(): ThekSelectOption[] {
    const state = this.stateManager.getState();
    const isRemote = this.config.loadOptions && this.config.loadOptions !== NOOP_LOAD_OPTIONS;
    if (isRemote && state.inputValue) {
       return state.options;
    }
    const query = state.inputValue.toLowerCase();
    return state.options.filter(o => o.label.toLowerCase().includes(query));
  }

  private toggleDropdown(): void {
    const state = this.stateManager.getState();
    if (state.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    if (this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: true, focusedIndex: 0 });
    this.emit('open', null);
  }

  private closeDropdown(): void {
    if (!this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: false, focusedIndex: -1, inputValue: '' });
    this.input.value = '';
    this.emit('close', null);
  }

  private selectOption(option: ThekSelectOption): void {
    const state = this.stateManager.getState();
    if (option.disabled) return;

    let newSelectedValues: string[];
    if (this.config.multiple) {
      if (state.selectedValues.includes(option.value)) {
        newSelectedValues = state.selectedValues.filter(v => v !== option.value);
        this.emit('tagRemoved', option);
      } else {
        newSelectedValues = [...state.selectedValues, option.value];
        this.emit('tagAdded', option);
      }
    } else {
      newSelectedValues = [option.value];
      this.closeDropdown();
    }

    this.stateManager.setState({ selectedValues: newSelectedValues, inputValue: '' });
    this.input.value = '';
    this.syncOriginalElement(newSelectedValues);
    this.emit('change', newSelectedValues);
  }

  private createAndSelectOption(label: string): void {
    const value = label;
    const newOption: ThekSelectOption = { value, label };

    const state = this.stateManager.getState();
    this.stateManager.setState({
      options: [...state.options, newOption]
    });
    this.selectOption(newOption);
  }

  private removeLastSelection(): void {
    const state = this.stateManager.getState();
    const newSelectedValues = [...state.selectedValues];
    const removedValue = newSelectedValues.pop();
    if (removedValue) {
      const option = state.options.find(o => o.value === removedValue);
      this.stateManager.setState({ selectedValues: newSelectedValues });
      this.syncOriginalElement(newSelectedValues);
      if (option) this.emit('tagRemoved', option);
      this.emit('change', newSelectedValues);
    }
  }

  private syncOriginalElement(values: string[]): void {
    if (this.originalElement instanceof HTMLSelectElement) {
      const select = this.originalElement;
      Array.from(select.options).forEach(opt => {
        opt.selected = values.includes(opt.value);
      });
      values.forEach(val => {
        if (!Array.from(select.options).some(opt => opt.value === val)) {
          const opt = new Option(val, val, true, true);
          select.add(opt);
        }
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private render(): void {
    const state = this.stateManager.getState();
    this.control.setAttribute('aria-expanded', state.isOpen.toString());
    this.dropdown.hidden = !state.isOpen;
    this.wrapper.classList.toggle('thek-open', state.isOpen);
    this.renderSelectionContent(state);
    this.renderOptionsContent(state);
  }

  private renderSelectionContent(state: ThekSelectState): void {
    this.selectionContainer.innerHTML = '';
    if (this.config.multiple) {
      state.selectedValues.forEach((val, index) => {
        const option = state.options.find(o => o.value === val) || { value: val, label: val };
        const tag = document.createElement('span');
        tag.className = 'thek-tag';
        tag.draggable = true;
        tag.dataset.index = index.toString();
        tag.dataset.value = val;
        const content = this.config.renderSelection(option);
        if (content instanceof HTMLElement) {
          tag.appendChild(content);
        } else {
          tag.innerHTML = content;
        }
        const removeBtn = document.createElement('span');
        removeBtn.className = 'thek-tag-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectOption(option);
        });
        tag.appendChild(removeBtn);
        this.setupTagDnd(tag);
        this.selectionContainer.appendChild(tag);
      });
      this.input.placeholder = state.selectedValues.length > 0 ? '' : this.config.placeholder;
    } else {
      const val = state.selectedValues[0];
      if (val && !state.isOpen) {
        const option = state.options.find(o => o.value === val);
        if (option) {
          const content = this.config.renderSelection(option);
          if (content instanceof HTMLElement) {
            this.selectionContainer.appendChild(content);
          } else {
            this.selectionContainer.innerHTML = content;
          }
          this.input.placeholder = '';
        }
      } else {
        this.input.placeholder = this.config.placeholder;
      }
    }
  }

  private renderOptionsContent(state: ThekSelectState): void {
    this.optionsList.innerHTML = '';
    const filteredOptions = this.getFilteredOptions();

    // Update aria-activedescendant
    if (state.focusedIndex >= 0 && state.focusedIndex < filteredOptions.length) {
      this.input.setAttribute('aria-activedescendant', `${this.id}-opt-${state.focusedIndex}`);
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
    if (state.isLoading) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-loading';
      li.textContent = 'Loading...';
      this.optionsList.appendChild(li);
      return;
    }
    filteredOptions.forEach((option, index) => {
      const li = document.createElement('li');
      li.className = 'thek-option';
      li.id = `${this.id}-opt-${index}`;
      if (option.disabled) li.classList.add('thek-disabled');
      if (state.selectedValues.includes(option.value)) li.classList.add('thek-selected');
      if (state.focusedIndex === index) li.classList.add('thek-focused');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', state.selectedValues.includes(option.value).toString());
      const content = this.config.renderOption(option);
      if (content instanceof HTMLElement) {
        li.appendChild(content);
      } else {
        li.innerHTML = content;
      }
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(option);
      });
      this.optionsList.appendChild(li);
    });
    const exactMatch = filteredOptions.some(o => o.label.toLowerCase() === state.inputValue.toLowerCase());
    if (this.config.canCreate && state.inputValue && !exactMatch) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-create';
      const text = this.config.createText.replace('{%t}', escapeHtml(state.inputValue));
      li.innerHTML = text;
      if (state.focusedIndex === filteredOptions.length) li.classList.add('thek-focused');
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.createAndSelectOption(state.inputValue);
      });
      this.optionsList.appendChild(li);
    }
    if (filteredOptions.length === 0 && (!this.config.canCreate || !state.inputValue)) {
      const li = document.createElement('li');
      li.className = 'thek-option thek-no-results';
      li.textContent = 'No results found';
      this.optionsList.appendChild(li);
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
        this.reorderTags(fromIndex, toIndex);
      }
    });
  }

  private reorderTags(from: number, to: number): void {
    const state = this.stateManager.getState();
    const newSelectedValues = [...state.selectedValues];
    const [movedItem] = newSelectedValues.splice(from, 1);
    newSelectedValues.splice(to, 0, movedItem);
    this.stateManager.setState({ selectedValues: newSelectedValues });
    this.syncOriginalElement(newSelectedValues);
    this.emit('reordered', newSelectedValues);
    this.emit('change', newSelectedValues);
  }

  public on(event: ThekSelectEvent, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  private emit(event: ThekSelectEvent, data: any): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach(cb => cb(data));
    }
  }

  public getValue(): string | string[] {
    const state = this.stateManager.getState();
    return this.config.multiple ? state.selectedValues : state.selectedValues[0];
  }

  public setValue(value: string | string[]): void {
    const values = Array.isArray(value) ? value : [value];
    this.stateManager.setState({ selectedValues: values });
    this.syncOriginalElement(values);
    this.emit('change', values);
  }

  public destroy(): void {
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    document.removeEventListener('click', this.documentClickListener);
    this.originalElement.style.display = '';
  }
}
