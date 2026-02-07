import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent,
  ThekSelectTheme
} from './types.js';
import { debounce, DebouncedFn } from '../utils/debounce.js';
import { generateId } from '../utils/dom.js';
import { injectStyles } from '../utils/styles.js';
import { DomRenderer, RendererCallbacks } from './dom-renderer.js';

const NOOP_LOAD_OPTIONS = async (_query: string): Promise<ThekSelectOption[]> => [];

export class ThekSelect {
  private config: Required<ThekSelectConfig>;
  private stateManager: StateManager<ThekSelectState>;
  private renderer: DomRenderer;
  private id: string;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private originalElement: HTMLElement;
  private documentClickListener!: (e: MouseEvent) => void;
  private remoteRequestId = 0;
  private isDestroyed = false;

  private constructor(element: string | HTMLElement, config: ThekSelectConfig = {}) {
    injectStyles();
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) throw new Error('Element not found');
    this.originalElement = el as HTMLElement;
    this.id = generateId();

    this.config = this.parseConfig(config);
    this.stateManager = new StateManager<ThekSelectState>(this.getInitialState());

    const callbacks: RendererCallbacks = {
      onSelect: (option) => this.selectOption(option),
      onCreate: (label) => this.createAndSelectOption(label),
      onRemove: (option) => this.selectOption(option), // selecting selected item removes it in multi
      onReorder: (from, to) => this.reorderTags(from, to)
    };

    this.renderer = new DomRenderer(this.config, this.id, callbacks);

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
      maxSelectedLabels: 3,
      theme: {},
      displayField: 'label',
      valueField: 'value',
      maxOptions: null,
      loadOptions: NOOP_LOAD_OPTIONS,
      renderOption: (o: ThekSelectOption) => o[this.config?.displayField || 'label'],
      renderSelection: (o: ThekSelectOption) => o[this.config?.displayField || 'label'],
    };

    const finalConfig = {
      ...defaultConfig,
      ...config
    };

    if (!config.renderOption) finalConfig.renderOption = (o: ThekSelectOption) => o[finalConfig.displayField];
    if (!config.renderSelection) finalConfig.renderSelection = (o: ThekSelectOption) => o[finalConfig.displayField];

    return finalConfig;
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
    const vField = this.config.valueField;
    const selectedValues = this.config.multiple
      ? this.config.options.filter(o => o.selected).map(o => o[vField])
      : (this.config.options.find(o => o.selected)?.[vField] ? [this.config.options.find(o => o.selected)![vField]] : []);
    const selectedOptionsByValue: Record<string, ThekSelectOption> = {};
    selectedValues.forEach((val) => {
      const option = this.config.options.find(o => o[vField] === val);
      if (option) {
        selectedOptionsByValue[val] = option;
      }
    });

    return {
      options: this.config.options,
      selectedValues,
      selectedOptionsByValue,
      isOpen: false,
      focusedIndex: -1,
      inputValue: '',
      isLoading: false
    };
  }

  private initialize(): void {
    this.renderer.createDom();
    this.setupListeners();
    this.stateManager.subscribe(() => this.render());
    this.render();

    if (this.originalElement.parentNode) {
      this.originalElement.style.display = 'none';
      this.originalElement.parentNode.insertBefore(this.renderer.wrapper, this.originalElement.nextSibling);
    }
  }

  private setupListeners(): void {
    this.renderer.control.addEventListener('click', () => {
      if (this.config.disabled) return;
      this.toggleDropdown();
    });

    if (this.config.searchable) {
      this.renderer.input.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.stateManager.setState({ inputValue: value });
        this.handleSearch(value);
      });
    }

    this.renderer.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.documentClickListener = (e: MouseEvent) => {
      if (!this.renderer.wrapper.contains(e.target as Node) && !this.renderer.dropdown.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this.documentClickListener);
    window.addEventListener('resize', () => this.renderer.positionDropdown());
    window.addEventListener('scroll', () => this.renderer.positionDropdown(), true);
  }

  private handleSearch!: DebouncedFn<(query: string) => Promise<void>>;

  private setupHandleSearch(): void {
    this.handleSearch = debounce(async (query: string) => {
      this.emit('search', query);
      const isRemote = this.config.loadOptions && this.config.loadOptions !== NOOP_LOAD_OPTIONS;
      if (isRemote) {
        if (query.length > 0) {
          const requestId = ++this.remoteRequestId;
          this.stateManager.setState({ isLoading: true });
          try {
            const options = await this.config.loadOptions(query);
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            const state = this.stateManager.getState();
            this.stateManager.setState({
              options,
              isLoading: false,
              focusedIndex: 0,
              selectedOptionsByValue: this.mergeSelectedOptionsByValue(
                state.selectedValues,
                state.selectedOptionsByValue,
                options
              )
            });
          } catch (error) {
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            this.stateManager.setState({ isLoading: false });
          }
        } else {
          this.remoteRequestId++;
          this.stateManager.setState({ options: this.config.options, focusedIndex: -1 });
        }
      } else {
        this.stateManager.setState({ focusedIndex: 0 });
      }
    }, this.config.debounce);
  }

  private mergeSelectedOptionsByValue(
    selectedValues: string[],
    previous: Record<string, ThekSelectOption>,
    latestOptions: ThekSelectOption[]
  ): Record<string, ThekSelectOption> {
    const vField = this.config.valueField;
    const byValueFromLatest: Record<string, ThekSelectOption> = {};
    latestOptions.forEach((option) => {
      const value = option[vField];
      if (typeof value === 'string') {
        byValueFromLatest[value] = option;
      }
    });

    const merged: Record<string, ThekSelectOption> = {};
    selectedValues.forEach((value) => {
      const option = byValueFromLatest[value] || previous[value];
      if (option) {
        merged[value] = option;
      }
    });
    return merged;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();
    const dField = this.config.displayField;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.openDropdown();
        const maxIndex = this.config.canCreate && state.inputValue && !filteredOptions.some(o => o[dField].toLowerCase() === state.inputValue.toLowerCase())
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
    const dField = this.config.displayField;
    const filtered = state.options.filter(o => {
      const val = o[dField];
      return val != null && val.toString().toLowerCase().includes(query);
    });

    if (this.config.maxOptions != null) {
      return filtered.slice(0, this.config.maxOptions);
    }
    return filtered;
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
    this.renderer.positionDropdown();
    if (this.config.searchable) {
      setTimeout(() => this.renderer.input.focus(), 10);
    }
    this.emit('open', null);
  }

  private closeDropdown(): void {
    if (!this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: false, focusedIndex: -1, inputValue: '' });
    this.renderer.input.value = '';
    this.emit('close', null);
  }

  private selectOption(option: ThekSelectOption): void {
    const state = this.stateManager.getState();
    if (option.disabled) return;

    const vField = this.config.valueField;
    const optionValue = option[vField];
    let newSelectedValues: string[];
    let selectedOptionsByValue = { ...state.selectedOptionsByValue };
    if (this.config.multiple) {
      if (state.selectedValues.includes(optionValue)) {
        newSelectedValues = state.selectedValues.filter(v => v !== optionValue);
        delete selectedOptionsByValue[optionValue];
        this.emit('tagRemoved', option);
      } else {
        newSelectedValues = [...state.selectedValues, optionValue];
        selectedOptionsByValue[optionValue] = option;
        this.emit('tagAdded', option);
      }
    } else {
      newSelectedValues = [optionValue];
      selectedOptionsByValue = { [optionValue]: option };
      this.closeDropdown();
    }

    this.stateManager.setState({ selectedValues: newSelectedValues, selectedOptionsByValue, inputValue: '' });
    this.renderer.input.value = '';
    this.syncOriginalElement(newSelectedValues);
    this.emit('change', this.getValue());
  }

  private createAndSelectOption(label: string): void {
    const value = label;
    const newOption: ThekSelectOption = { 
      [this.config.valueField]: value, 
      [this.config.displayField]: label 
    };

    const state = this.stateManager.getState();
    this.stateManager.setState({
      options: [...state.options, newOption]
    });
    this.selectOption(newOption);
  }

  private removeLastSelection(): void {
    const state = this.stateManager.getState();
    const vField = this.config.valueField;
    const newSelectedValues = [...state.selectedValues];
    const selectedOptionsByValue = { ...state.selectedOptionsByValue };
    const removedValue = newSelectedValues.pop();
    if (removedValue) {
      const option = state.options.find(o => o[vField] === removedValue) || selectedOptionsByValue[removedValue];
      delete selectedOptionsByValue[removedValue];
      this.stateManager.setState({ selectedValues: newSelectedValues, selectedOptionsByValue });
      this.syncOriginalElement(newSelectedValues);
      if (option) this.emit('tagRemoved', option);
      this.emit('change', this.getValue());
    }
  }

  private reorderTags(from: number, to: number): void {
    const state = this.stateManager.getState();
    const newSelectedValues = [...state.selectedValues];
    const [movedItem] = newSelectedValues.splice(from, 1);
    newSelectedValues.splice(to, 0, movedItem);
    this.stateManager.setState({ selectedValues: newSelectedValues });
    this.syncOriginalElement(newSelectedValues);
    this.emit('reordered', newSelectedValues);
    this.emit('change', this.getValue());
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
    this.renderer.render(this.stateManager.getState(), this.getFilteredOptions());
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

  public getSelectedOptions(): ThekSelectOption | ThekSelectOption[] {
    const state = this.stateManager.getState();
    const vField = this.config.valueField;
    const selected = state.selectedValues.map(val => 
      state.options.find(o => o[vField] === val) ||
      state.selectedOptionsByValue[val] ||
      { [vField]: val, [this.config.displayField]: val } as any
    );
    return this.config.multiple ? selected : selected[0];
  }

  public setValue(value: string | string[], silent: boolean = false): void {
    const state = this.stateManager.getState();
    const vField = this.config.valueField;
    const values = Array.isArray(value) ? value : [value];
    const selectedOptionsByValue: Record<string, ThekSelectOption> = {};
    values.forEach((val) => {
      const option = state.options.find(o => o[vField] === val) || state.selectedOptionsByValue[val];
      if (option) {
        selectedOptionsByValue[val] = option;
      }
    });
    this.stateManager.setState({ selectedValues: values, selectedOptionsByValue });
    this.syncOriginalElement(values);
    if (!silent) {
      this.emit('change', this.getValue());
    }
  }

  public setTheme(theme: ThekSelectTheme): void {
    this.config.theme = { ...this.config.theme, ...theme };
    this.renderer.setTheme(this.config.theme);
  }

  public setSize(size: string): void {
    this.config.size = size as any;
    this.renderer.setSize(size);
    this.renderer.positionDropdown();
  }

  public resetTheme(): void {
    this.config.theme = {};
    this.renderer.resetTheme();
  }

  public setRenderOption(callback: (option: ThekSelectOption) => string | HTMLElement): void {
    this.config.renderOption = callback;
    this.renderer.updateConfig({ renderOption: callback });
    this.render();
  }

  public setMaxOptions(max: number | null): void {
    this.config.maxOptions = max;
    this.render();
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.remoteRequestId++;
    this.handleSearch.cancel();
    this.renderer.destroy();
    document.removeEventListener('click', this.documentClickListener);
    this.originalElement.style.display = '';
  }
}
