import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent
} from './types.js';
import { debounce, DebouncedFn } from '../utils/debounce.js';
import { generateId } from '../utils/dom.js';
import { injectStyles } from '../utils/styles.js';
import { DomRenderer, RendererCallbacks } from './dom-renderer.js';
import { buildConfig, buildInitialState } from './config-utils.js';
import { getFilteredOptions, isRemoteMode, mergeSelectedOptionsByValue } from './options-logic.js';
import {
  applySelection,
  buildSelectedOptionsMapFromValues,
  createOptionFromLabel,
  removeLastSelection,
  reorderSelectedValues,
  resolveSelectedOptions
} from './selection-logic.js';
import { ThekSelectEventEmitter } from './event-emitter.js';

export class ThekSelect {
  private static globalDefaults: Partial<ThekSelectConfig> = {};

  private config: Required<ThekSelectConfig>;
  private stateManager: StateManager<ThekSelectState>;
  private renderer: DomRenderer;
  private id: string;
  private events = new ThekSelectEventEmitter();
  private originalElement: HTMLElement;
  private documentClickListener!: (e: MouseEvent) => void;
  private windowResizeListener!: () => void;
  private windowScrollListener!: () => void;
  private unsubscribeState?: () => void;
  private remoteRequestId = 0;
  private isDestroyed = false;
  private focusTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private constructor(element: string | HTMLElement, config: ThekSelectConfig = {}) {
    injectStyles();
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) throw new Error('Element not found');
    this.originalElement = el as HTMLElement;
    this.id = generateId();

    this.config = buildConfig(this.originalElement, config, ThekSelect.globalDefaults);
    this.stateManager = new StateManager<ThekSelectState>(buildInitialState(this.config));

    const callbacks: RendererCallbacks = {
      onSelect: (option) => this.handleSelect(option),
      onCreate: (label) => this.handleCreate(label),
      onRemove: (option) => this.handleSelect(option), // selecting selected item removes it in multi
      onReorder: (from, to) => this.handleReorder(from, to)
    };

    this.renderer = new DomRenderer(this.config, this.id, callbacks);

    this.setupHandleSearch();
    this.initialize();
  }

  public static init(element: string | HTMLElement, config: ThekSelectConfig = {}): ThekSelect {
    return new ThekSelect(element, config);
  }

  public static setDefaults(defaults: Partial<ThekSelectConfig>): void {
    ThekSelect.globalDefaults = {
      ...ThekSelect.globalDefaults,
      ...defaults
    };
  }

  public static resetDefaults(): void {
    ThekSelect.globalDefaults = {};
  }

  private initialize(): void {
    this.renderer.createDom();
    this.setupListeners();
    this.unsubscribeState = this.stateManager.subscribe(() => this.render());
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
    this.windowResizeListener = () => this.renderer.positionDropdown();
    this.windowScrollListener = () => this.renderer.positionDropdown();
    document.addEventListener('click', this.documentClickListener);
    window.addEventListener('resize', this.windowResizeListener);
    window.addEventListener('scroll', this.windowScrollListener, true);
  }

  private handleSearch!: DebouncedFn<(query: string) => Promise<void>>;

  private setupHandleSearch(): void {
    this.handleSearch = debounce(async (query: string) => {
      this.emit('search', query);
      if (isRemoteMode(this.config)) {
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
              selectedOptionsByValue: mergeSelectedOptionsByValue(
                this.config.valueField,
                state.selectedValues,
                state.selectedOptionsByValue,
                options
              )
            });
          } catch (_error) {
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            this.stateManager.setState({ isLoading: false });
          }
        } else {
          this.remoteRequestId++;
          this.stateManager.setState({ options: this.config.options, focusedIndex: -1, isLoading: false });
        }
      } else {
        this.stateManager.setState({ focusedIndex: 0 });
      }
    }, this.config.debounce);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    const filteredOptions = getFilteredOptions(this.config, state);
    const displayField = this.config.displayField;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.openDropdown();
        const maxIndex = this.config.canCreate && state.inputValue && !filteredOptions.some(o => o[displayField].toLowerCase() === state.inputValue.toLowerCase())
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
          this.handleSelect(filteredOptions[state.focusedIndex]);
        } else if (this.config.canCreate && state.inputValue && state.focusedIndex === filteredOptions.length) {
          this.handleCreate(state.inputValue);
        }
        break;
      case 'Escape':
        this.closeDropdown();
        break;
      case 'Backspace':
        if (state.inputValue === '' && this.config.multiple && state.selectedValues.length > 0) {
          this.handleRemoveLastSelection();
        }
        break;
    }
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
      this.focusTimeoutId = setTimeout(() => {
        if (!this.isDestroyed) {
          this.renderer.input.focus();
        }
      }, 10);
    }
    this.emit('open', null);
  }

  private closeDropdown(): void {
    if (!this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: false, focusedIndex: -1, inputValue: '' });
    this.renderer.input.value = '';
    this.emit('close', null);
  }

  private handleSelect(option: ThekSelectOption): void {
    if (option.disabled) return;

    const state = this.stateManager.getState();
    const update = applySelection(this.config, state, option);

    if (!this.config.multiple) {
      this.closeDropdown();
    }

    this.stateManager.setState({
      selectedValues: update.selectedValues,
      selectedOptionsByValue: update.selectedOptionsByValue,
      inputValue: ''
    });

    this.renderer.input.value = '';
    this.syncOriginalElement(update.selectedValues);

    if (update.tagEvent && update.tagOption) {
      this.emit(update.tagEvent, update.tagOption);
    }
    this.emit('change', this.getValue());
  }

  private handleCreate(label: string): void {
    const newOption = createOptionFromLabel(this.config, label);
    const state = this.stateManager.getState();
    this.stateManager.setState({ options: [...state.options, newOption] });
    this.handleSelect(newOption);
  }

  private handleRemoveLastSelection(): void {
    const state = this.stateManager.getState();
    const update = removeLastSelection(this.config, state);

    this.stateManager.setState({
      selectedValues: update.selectedValues,
      selectedOptionsByValue: update.selectedOptionsByValue
    });
    this.syncOriginalElement(update.selectedValues);

    if (update.removedOption) {
      this.emit('tagRemoved', update.removedOption);
    }
    this.emit('change', this.getValue());
  }

  private handleReorder(from: number, to: number): void {
    const state = this.stateManager.getState();
    const selectedValues = reorderSelectedValues(state, from, to);
    this.stateManager.setState({ selectedValues });
    this.syncOriginalElement(selectedValues);
    this.emit('reordered', selectedValues);
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
    this.renderer.render(this.stateManager.getState(), getFilteredOptions(this.config, this.stateManager.getState()));
  }

  public on(event: ThekSelectEvent, callback: Function): () => void {
    return this.events.on(event, callback);
  }

  private emit(event: ThekSelectEvent, data: any): void {
    this.events.emit(event, data);
  }

  public getValue(): string | string[] | undefined {
    const state = this.stateManager.getState();
    return this.config.multiple ? state.selectedValues : state.selectedValues[0];
  }

  public getSelectedOptions(): ThekSelectOption | ThekSelectOption[] | undefined {
    const selected = resolveSelectedOptions(this.config, this.stateManager.getState());
    return this.config.multiple ? selected : selected[0];
  }

  public setValue(value: string | string[], silent: boolean = false): void {
    const state = this.stateManager.getState();
    const incomingValues = Array.isArray(value) ? value : [value];
    const stringValues = incomingValues.filter((entry): entry is string => typeof entry === 'string');
    const values = this.config.multiple
      ? Array.from(new Set(stringValues))
      : stringValues.slice(0, 1);
    const selectedOptionsByValue = buildSelectedOptionsMapFromValues(this.config, state, values);

    this.stateManager.setState({ selectedValues: values, selectedOptionsByValue });
    this.syncOriginalElement(values);
    if (!silent) {
      this.emit('change', this.getValue());
    }
  }

  public setHeight(height: number | string): void {
    this.config.height = height as any;
    this.renderer.setHeight(height);
    this.renderer.positionDropdown();
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
    if (this.focusTimeoutId !== null) {
      clearTimeout(this.focusTimeoutId);
      this.focusTimeoutId = null;
    }
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = undefined;
    }
    this.renderer.destroy();
    document.removeEventListener('click', this.documentClickListener);
    window.removeEventListener('resize', this.windowResizeListener);
    window.removeEventListener('scroll', this.windowScrollListener, true);
    this.originalElement.style.display = '';
  }
}
