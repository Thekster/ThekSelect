import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent
} from './types.js';
import { debounce, DebouncedFunction } from '../utils/debounce.js';
import { generateId } from '../utils/dom.js';

const NOOP_LOAD_OPTIONS = async (): Promise<ThekSelectOption[]> => [];

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
  private currentRequestId: string | null = null;

  private constructor(element: string | HTMLElement, config: ThekSelectConfig = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) throw new Error('Element not found');
    this.originalElement = el as HTMLElement;
    this.id = generateId();

    this.config = this.parseConfig(config);
    this.stateManager = new StateManager<ThekSelectState>(this.getInitialState());

    this.setupHandleSearch();
    this.initialize();
  }

  public static init(element: string | HTMLElement, config: ThekSelectConfig = {}): ThekSelect {
    return new ThekSelect(element, config);
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
      loadOptions: NOOP_LOAD_OPTIONS,
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
    let selectedValues: string[] = [];
    let selectedOptions: ThekSelectOption[] = [];

    if (this.config.multiple) {
      selectedOptions = this.config.options.filter(o => o.selected);
      selectedValues = selectedOptions.map(o => o.value);
    } else {
      const selected = this.config.options.find(o => o.selected);
      if (selected) {
        selectedOptions = [selected];
        selectedValues = [selected.value];
      }
    }

    return {
      options: this.config.options,
      selectedValues,
      selectedOptions,
      isOpen: false,
      focusedIndex: -1,
      inputValue: '',
      isLoading: false
    };
  }

  private initialize(): void {
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

  private handleSearch!: DebouncedFunction<(query: string) => void>;

  private setupHandleSearch(): void {
    this.handleSearch = debounce(async (query: string) => {
      this.emit('search', query);
      const isRemote = this.config.loadOptions && this.config.loadOptions !== NOOP_LOAD_OPTIONS;
      if (isRemote) {
        if (query.length > 0) {
          const requestId = generateId();
          this.currentRequestId = requestId;
          this.stateManager.setState({ isLoading: true });
          try {
            const options = await this.config.loadOptions(query);
            if (this.currentRequestId === requestId) {
              this.stateManager.setState({ options, isLoading: false, focusedIndex: 0 });
            }
          } catch (error) {
            if (this.currentRequestId === requestId) {
              this.stateManager.setState({ isLoading: false });
            }
          }
        } else {
          this.currentRequestId = null;
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
    let newSelectedOptions: ThekSelectOption[];

    if (this.config.multiple) {
      if (state.selectedValues.includes(option.value)) {
        newSelectedValues = state.selectedValues.filter(v => v !== option.value);
        newSelectedOptions = state.selectedOptions.filter(o => o.value !== option.value);
        this.emit('tagRemoved', option);
      } else {
        newSelectedValues = [...state.selectedValues, option.value];
        newSelectedOptions = [...state.selectedOptions, option];
        this.emit('tagAdded', option);
      }
    } else {
      newSelectedValues = [option.value];
      newSelectedOptions = [option];
      this.closeDropdown();
    }

    this.stateManager.setState({
      selectedValues: newSelectedValues,
      selectedOptions: newSelectedOptions,
      inputValue: ''
    });
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
    const newSelectedOptions = [...state.selectedOptions];

    const removedValue = newSelectedValues.pop();
    const removedOption = newSelectedOptions.pop();

    if (removedValue) {
      // Safety check to ensure we popped the corresponding option
      // In normal operation they are synced, but let's be safe or just trust index match

      this.stateManager.setState({
        selectedValues: newSelectedValues,
        selectedOptions: newSelectedOptions
      });
      this.syncOriginalElement(newSelectedValues);
      if (removedOption) this.emit('tagRemoved', removedOption);
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
      state.selectedOptions.forEach((option, index) => {
        // Use selectedOptions directly
        const val = option.value;
        const tag = document.createElement('span');
        tag.className = 'thek-tag';
        tag.draggable = true;
        tag.dataset.index = index.toString();
        tag.dataset.value = val;
        const content = this.config.renderSelection(option);
        if (content instanceof HTMLElement) {
          tag.appendChild(content);
        } else {
          tag.textContent = content;
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
      const option = state.selectedOptions[0];
      if (option && !state.isOpen) {
        const content = this.config.renderSelection(option);
        if (content instanceof HTMLElement) {
          this.selectionContainer.appendChild(content);
        } else {
            this.selectionContainer.textContent = content;
        }
        this.input.placeholder = '';
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
        li.textContent = content;
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
      // We render createText as textContent to be safe.
      // We manually replace {%t} with the input value.
      const text = this.config.createText.replace('{%t}', state.inputValue);
      li.textContent = text;
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
      e.dataTransfer?.setData('text/plain', tag.dataset.value!);
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
      const fromValue = e.dataTransfer?.getData('text/plain');
      const toValue = tag.dataset.value!;
      if (fromValue && fromValue !== toValue) {
        this.reorderTagsByValue(fromValue, toValue);
      }
    });
  }

  private reorderTagsByValue(fromValue: string, toValue: string): void {
    const state = this.stateManager.getState();
    const fromIndex = state.selectedValues.indexOf(fromValue);
    const toIndex = state.selectedValues.indexOf(toValue);
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      this.reorderTags(fromIndex, toIndex);
    }
  }

  private reorderTags(from: number, to: number): void {
    const state = this.stateManager.getState();
    const newSelectedValues = [...state.selectedValues];
    const newSelectedOptions = [...state.selectedOptions];

    const [movedVal] = newSelectedValues.splice(from, 1);
    newSelectedValues.splice(to, 0, movedVal);

    const [movedOpt] = newSelectedOptions.splice(from, 1);
    newSelectedOptions.splice(to, 0, movedOpt);

    this.stateManager.setState({
      selectedValues: newSelectedValues,
      selectedOptions: newSelectedOptions
    });
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

    // We also need to update selectedOptions.
    // We try to find them in current options.
    // If not found, we create a placeholder option (legacy behavior fallback for setValue)
    const state = this.stateManager.getState();
    const newSelectedOptions = values.map(val => {
      return state.options.find(o => o.value === val) || { value: val, label: val };
    });

    this.stateManager.setState({
      selectedValues: values,
      selectedOptions: newSelectedOptions
    });
    this.syncOriginalElement(values);
    this.emit('change', values);
  }

  public destroy(): void {
    this.handleSearch.cancel();
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    document.removeEventListener('click', this.documentClickListener);
    this.originalElement.style.display = '';
  }
}
