import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent,
  ThekSelectEventPayloadMap
} from './types.js';
import { debounce, DebouncedFn } from '../utils/debounce.js';
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
import { DomRenderer, RendererCallbacks } from './dom-renderer.js';
import { injectStyles } from '../utils/styles.js';
import { generateId } from '../utils/dom.js';
import { globalEventManager } from '../utils/event-manager.js';

/** Returned by ThekSelect.init() — the core instance augmented with DOM-specific methods. */
export type ThekSelectHandle<T = unknown> = ThekSelect<T> & {
  setHeight(height: number | string): void;
  setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void;
};

export class ThekSelect<T = unknown> {
  private static globalDefaults: Partial<ThekSelectConfig> = {};

  /** @internal Config is readable by DomRenderer. Do not reassign the reference. */
  protected readonly config: Required<ThekSelectConfig<T>>;
  /** @internal accessible via cast in tests */
  protected stateManager: StateManager<ThekSelectState<T>>;
  private events = new ThekSelectEventEmitter<T>();
  /** @internal */
  protected isDestroyed = false;
  private remoteRequestId = 0;
  private currentSearchAbortController: AbortController | null = null;
  private debouncedSearch!: DebouncedFn<[query: string]>;

  /**
   * Core constructor — no bound DOM element required.
   * @param config  Selection options and behaviour config.
   * @param _element  Used internally by ThekSelect.init() to parse native <select> elements.
   */
  constructor(config: ThekSelectConfig<T> = {}, _element: HTMLElement | null = null) {
    this.config = buildConfig(
      _element,
      config,
      ThekSelect.globalDefaults as Partial<ThekSelectConfig<T>>
    );
    this.stateManager = new StateManager<ThekSelectState<T>>(buildInitialState(this.config));
    this.setupDebouncedSearch();
  }

  // ── Reactive interface ────────────────────────────────────────────────────

  public subscribe(listener: (state: Readonly<ThekSelectState<T>>) => void): () => void {
    return this.stateManager.subscribe(listener);
  }

  public getState(): Readonly<ThekSelectState<T>> {
    return this.stateManager.getState();
  }

  public getFilteredOptions(): ThekSelectOption<T>[] {
    return getFilteredOptions(this.config, this.stateManager.getState() as ThekSelectState<T>);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  public open(): void {
    if (this.config.disabled) return;
    if (this.stateManager.getState().isOpen) return;
    // Skip past any leading disabled options so aria-activedescendant never
    // points at an item the user cannot select.
    const filteredOptions = this.getFilteredOptions();
    let initialFocus = 0;
    while (initialFocus < filteredOptions.length && !!filteredOptions[initialFocus]?.disabled) {
      initialFocus++;
    }
    this.stateManager.setState({
      isOpen: true,
      focusedIndex: initialFocus < filteredOptions.length ? initialFocus : -1
    });
    this.emit('open', null);
  }

  public close(): void {
    if (!this.stateManager.getState().isOpen) return;
    this.stateManager.setState({ isOpen: false, focusedIndex: -1, inputValue: '' });
    this.emit('close', null);
  }

  public toggle(): void {
    if (this.stateManager.getState().isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public select(option: ThekSelectOption<T>): void {
    if (this.config.disabled) return;
    if (option.disabled) return;
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const update = applySelection(this.config, state, option);
    if (!this.config.multiple) this.close();
    this.stateManager.setState({
      selectedValues: update.selectedValues,
      selectedOptionsByValue: update.selectedOptionsByValue,
      inputValue: ''
    });
    if (update.tagEvent && update.tagOption) {
      this.emit(update.tagEvent, update.tagOption);
    }
    this.emit('change', this.getValue());
  }

  public create(label: string): void {
    if (this.config.disabled) return;
    const newOption = createOptionFromLabel(this.config, label);
    const state = this.stateManager.getState();
    this.stateManager.setState({ options: [...state.options, newOption] });
    this.select(newOption);
  }

  /**
   * Sets the search query in state and triggers the debounced loadOptions call.
   */
  public search(query: string): void {
    if (this.config.disabled) return;
    this.stateManager.setState({ inputValue: query });
    this.debouncedSearch(query);
  }

  public reorder(from: number, to: number): void {
    if (this.config.disabled) return;
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const selectedValues = reorderSelectedValues(state, from, to);
    this.stateManager.setState({ selectedValues });
    this.emit('reordered', selectedValues);
    this.emit('change', this.getValue());
  }

  public removeLastSelection(): void {
    if (this.config.disabled) return;
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const update = removeLastSelection(this.config, state);
    this.stateManager.setState({
      selectedValues: update.selectedValues,
      selectedOptionsByValue: update.selectedOptionsByValue
    });
    if (update.removedOption) this.emit('tagRemoved', update.removedOption);
    this.emit('change', this.getValue());
  }

  /** Move keyboard focus to the next non-disabled option in the dropdown. */
  public focusNext(): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();
    const displayField = this.config.displayField;
    const hasCreateSlot =
      this.config.canCreate &&
      state.inputValue &&
      !filteredOptions.some(
        (o) => (o[displayField] as string)?.toLowerCase() === state.inputValue.toLowerCase()
      );
    const maxIndex = hasCreateSlot ? filteredOptions.length : filteredOptions.length - 1;
    let next = state.focusedIndex + 1;
    // Skip disabled items; the create slot (index === filteredOptions.length) is never disabled.
    while (next < filteredOptions.length && !!filteredOptions[next]?.disabled) {
      next++;
    }
    if (next <= maxIndex) {
      this.stateManager.setState({ focusedIndex: next });
    }
  }

  /** Move keyboard focus to the previous non-disabled option in the dropdown. */
  public focusPrev(): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();
    let prev = state.focusedIndex - 1;
    // Skip disabled items.
    while (prev >= 0 && !!filteredOptions[prev]?.disabled) {
      prev--;
    }
    if (prev >= 0) {
      this.stateManager.setState({ focusedIndex: prev });
    }
  }

  /** Select the currently focused option, or create if focused on the create slot. */
  public selectFocused(): void {
    const state = this.stateManager.getState();
    const filteredOptions = this.getFilteredOptions();
    if (state.focusedIndex >= 0 && state.focusedIndex < filteredOptions.length) {
      this.select(filteredOptions[state.focusedIndex]);
    } else if (
      this.config.canCreate &&
      state.inputValue &&
      state.focusedIndex === filteredOptions.length
    ) {
      this.create(state.inputValue);
    }
  }

  public setValue(value: string | string[], silent: boolean = false): void {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const incomingValues = Array.isArray(value) ? value : [value];
    const stringValues = incomingValues.filter((e): e is string => typeof e === 'string');
    const values = this.config.multiple
      ? Array.from(new Set(stringValues))
      : stringValues.slice(0, 1);
    const selectedOptionsByValue = buildSelectedOptionsMapFromValues(this.config, state, values);
    this.stateManager.setState({ selectedValues: values, selectedOptionsByValue });
    if (!silent) this.emit('change', this.getValue());
  }

  public setMaxOptions(max: number | null): void {
    this.config.maxOptions = max;
    this.stateManager.forceNotify();
  }

  public getValue(): string | string[] | undefined {
    const state = this.stateManager.getState();
    return this.config.multiple ? state.selectedValues : state.selectedValues[0];
  }

  public getSelectedOptions(): ThekSelectOption<T> | ThekSelectOption<T>[] | undefined {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const selected = resolveSelectedOptions(this.config, state);
    return this.config.multiple ? selected : selected[0];
  }

  public on<K extends ThekSelectEvent>(
    event: K,
    callback: (payload: ThekSelectEventPayloadMap<T>[K]) => void
  ): () => void {
    return this.events.on(event, callback);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.remoteRequestId++;
    this.currentSearchAbortController?.abort();
    this.currentSearchAbortController = null;
    this.debouncedSearch.cancel();
  }

  // ── Static API ────────────────────────────────────────────────────────────

  public static init<T = unknown>(
    element: string | HTMLElement,
    config: ThekSelectConfig<T> = {}
  ): ThekSelectHandle<T> {
    return new ThekSelectDom<T>(element, config) as unknown as ThekSelectHandle<T>;
  }

  public static setDefaults(defaults: Partial<ThekSelectConfig>): void {
    ThekSelect.globalDefaults = { ...ThekSelect.globalDefaults, ...defaults };
  }

  public static resetDefaults(): void {
    ThekSelect.globalDefaults = {};
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private setupDebouncedSearch(): void {
    this.debouncedSearch = debounce(async (query: string) => {
      this.emit('search', query);
      if (isRemoteMode(this.config)) {
        if (query.length > 0) {
          this.currentSearchAbortController?.abort();
          this.currentSearchAbortController = new AbortController();
          const { signal } = this.currentSearchAbortController;
          const requestId = ++this.remoteRequestId;
          this.stateManager.setState({ isLoading: true });
          try {
            const options = await this.config.loadOptions!(query, signal);
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
          } catch (err) {
            // Guard: destroyed or superseded by a newer request — discard silently.
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            this.stateManager.setState({ isLoading: false });
            // Abort errors are intentional — do not surface to the caller.
            const isAbort = err instanceof Error && err.name === 'AbortError';
            if (!isAbort) {
              this.emit('error', err instanceof Error ? err : new Error(String(err)));
            }
          }
        } else {
          this.currentSearchAbortController?.abort();
          this.currentSearchAbortController = null;
          this.remoteRequestId++;
          this.stateManager.setState({
            options: this.config.options,
            focusedIndex: -1,
            isLoading: false
          });
        }
      } else {
        this.stateManager.setState({ focusedIndex: 0 });
      }
    }, this.config.debounce);
  }

  protected emit<K extends ThekSelectEvent>(event: K, data: ThekSelectEventPayloadMap<T>[K]): void {
    this.events.emit(event, data);
  }
}

// ── ThekSelectDom — wires ThekSelect core + DomRenderer ──────────────────────
// Not exported: consumers use ThekSelect.init() which returns ThekSelectHandle<T>.

class ThekSelectDom<T = unknown> extends ThekSelect<T> {
  /** @internal accessible via cast in tests */
  private renderer: DomRenderer<T>;
  private readonly originalElement: HTMLElement;
  private readonly id: string;
  private unsubscribeState?: () => void;
  private unsubscribeEvents: (() => void)[] = [];
  private focusTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private listenerController: AbortController | null = null;
  private injectedOptionValues: Set<string> = new Set();

  constructor(element: string | HTMLElement, config: ThekSelectConfig<T> = {}) {
    const el =
      typeof element === 'string'
        ? (document.querySelector(element) as HTMLElement | null)
        : element;
    if (!el) throw new Error(`ThekSelect: element not found`);

    super(config, el);

    this.originalElement = el;
    this.id = generateId();
    injectStyles();

    const callbacks: RendererCallbacks<T> = {
      onSelect: (option) => this.select(option),
      onCreate: (label) => this.create(label),
      onRemove: (option) => this.select(option),
      onReorder: (from, to) => this.reorder(from, to),
      onError: (err) => this.emit('error', err),
      onOrphan: () => this.destroy()
    };

    this.renderer = new DomRenderer<T>(this.config, this.id, callbacks);

    this.initialize();
  }

  private initialize(): void {
    this.renderer.createDom();
    this.applyAccessibleName();
    this.setupListeners();
    this.unsubscribeState = this.stateManager.subscribe(() => this.render());
    this.render();

    this.originalElement.style.display = 'none';
    const parent = this.originalElement.parentNode;
    if (parent) {
      parent.insertBefore(this.renderer.wrapper, this.originalElement.nextSibling);
      // Observe only the direct parent — avoids one full-body subtree observer per instance.
      this.renderer.startOrphanObserver(parent);
    }
  }

  private applyAccessibleName(): void {
    const el = this.originalElement;
    // In searchable mode role="combobox" lives on the input; apply the label there.
    // In non-searchable mode it lives on the control div.
    const labelTarget = this.config.searchable ? this.renderer.input : this.renderer.control;

    const existingLabelledBy = el.getAttribute('aria-labelledby');
    if (existingLabelledBy) {
      labelTarget.setAttribute('aria-labelledby', existingLabelledBy);
      return;
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      labelTarget.setAttribute('aria-label', ariaLabel);
      return;
    }

    const id = el.id;
    if (id) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      if (label) {
        if (!label.id) {
          label.id = `${id}-label`;
        }
        labelTarget.setAttribute('aria-labelledby', label.id);
      }
    }
  }

  private setupListeners(): void {
    this.listenerController = new AbortController();
    const { signal } = this.listenerController;

    this.renderer.control.addEventListener('click', () => {
      if (this.config.disabled) return;
      this.toggle();
    }, { signal });

    if (this.config.searchable) {
      this.renderer.input.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        // search() handles the setState({ inputValue }) call — no need to duplicate it here.
        this.search(value);
      }, { signal });
    }

    this.renderer.input.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });
    this.renderer.control.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });

    this.unsubscribeEvents.push(
      globalEventManager.onClick((e: unknown) => {
        const event = e as Event;
        if (
          !this.renderer.wrapper.contains(event.target as Node) &&
          !this.renderer.dropdown.contains(event.target as Node)
        ) {
          this.close();
        }
      })
    );

    let rafPending = false;
    const schedulePosition = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (!this.isDestroyed) this.renderer.positionDropdown();
      });
    };
    this.unsubscribeEvents.push(globalEventManager.onResize(schedulePosition));
    this.unsubscribeEvents.push(globalEventManager.onScroll(schedulePosition));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.config.disabled) return;
    const state = this.stateManager.getState();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!state.isOpen) {
          this.open(); // opens and sets focusedIndex: 0
        } else {
          this.focusNext();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!state.isOpen) {
          this.open();
        } else {
          this.focusPrev();
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (!state.isOpen) {
          this.open();
        } else {
          this.selectFocused();
        }
        break;
      case ' ':
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
          if (!state.isOpen) {
            this.open();
          }
        }
        break;
      case 'Escape':
        this.close();
        // Return focus to the combobox element so keyboard users don't lose their position.
        if (this.config.searchable) {
          this.renderer.input.focus();
        } else {
          this.renderer.control.focus();
        }
        break;
      case 'Backspace':
        if (state.inputValue === '' && this.config.multiple && state.selectedValues.length > 0) {
          this.removeLastSelection();
        }
        break;
    }
  }

  // Override open() to also position the dropdown and focus the search input.
  public override open(): void {
    if (this.stateManager.getState().isOpen) return;
    super.open(); // sets isOpen: true, focusedIndex: 0, emits 'open'
    this.renderer.positionDropdown();
    if (this.config.searchable) {
      this.focusTimeoutId = setTimeout(() => {
        if (!this.isDestroyed && this.stateManager.getState().isOpen) {
          this.renderer.input.focus();
        }
      }, 10);
    }
  }

  private render(): void {
    this.renderer.render(
      this.stateManager.getState(),
      this.getFilteredOptions()
    );
  }

  private syncOriginalElement(values: string[]): void {
    if (this.originalElement instanceof HTMLSelectElement) {
      const select = this.originalElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = values.includes(opt.value);
      });
      values.forEach((val) => {
        if (!Array.from(select.options).some((opt) => opt.value === val)) {
          const state = this.stateManager.getState();
          const found =
            state.options.find((o) => o[this.config.valueField] === val) ||
            state.selectedOptionsByValue[val];
          const label = found ? String(found[this.config.displayField] ?? val) : val;
          const opt = new Option(label, val, true, true);
          select.add(opt);
          this.injectedOptionValues.add(val);
        }
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Override select to also sync the native element
  public override select(option: ThekSelectOption<T>): void {
    super.select(option);
    this.syncOriginalElement(this.stateManager.getState().selectedValues);
    // Clear the renderer input field
    this.renderer.input.value = '';
  }

  // Override close to also clear renderer input
  public override close(): void {
    super.close();
    this.renderer.input.value = '';
  }

  // Override setValue to also sync the native element
  public override setValue(value: string | string[], silent: boolean = false): void {
    super.setValue(value, silent);
    this.syncOriginalElement(this.stateManager.getState().selectedValues);
  }

  // Override removeLastSelection to also sync the native element
  public override removeLastSelection(): void {
    super.removeLastSelection();
    this.syncOriginalElement(this.stateManager.getState().selectedValues);
  }

  // Override reorder to also sync the native element
  public override reorder(from: number, to: number): void {
    super.reorder(from, to);
    this.syncOriginalElement(this.stateManager.getState().selectedValues);
  }

  public setHeight(height: number | string): void {
    this.config.height = height;
    this.renderer.setHeight(height);
    this.renderer.positionDropdown();
  }

  public setRenderOption(fn: (option: ThekSelectOption<T>) => string | HTMLElement): void {
    this.config.renderOption = fn;
    this.renderer.updateConfig({
      renderOption: fn as (option: ThekSelectOption) => string | HTMLElement
    });
    this.render();
  }

  public override destroy(): void {
    this.isDestroyed = true;
    super.destroy(); // abort in-flight requests and cancel debounce immediately

    if (this.focusTimeoutId !== null) {
      clearTimeout(this.focusTimeoutId);
      this.focusTimeoutId = null;
    }
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = undefined;
    }
    this.stateManager.setState({ isLoading: false });
    this.unsubscribeEvents.forEach((unsub) => unsub());
    this.unsubscribeEvents = [];
    this.listenerController?.abort();
    this.listenerController = null;
    this.renderer.destroy();
    if (typeof HTMLSelectElement !== 'undefined' && this.originalElement instanceof HTMLSelectElement && this.injectedOptionValues.size > 0) {
      const select = this.originalElement;
      Array.from(select.options)
        .filter((opt) => this.injectedOptionValues.has(opt.value))
        .forEach((opt) => select.remove(opt.index));
      this.injectedOptionValues.clear();
    }
    this.originalElement.style.display = '';
  }
}
