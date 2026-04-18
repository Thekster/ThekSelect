import { StateManager } from './state.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectEvent,
  ThekSelectEventPayloadMap,
  ThekSelectPrimitive,
  ThekSelectValue,
  getOptionField
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

/** Returned by ThekSelectDom.init() — the core instance augmented with DOM-specific methods. */
export class ThekSelect<T extends object = ThekSelectOption> {
  private static globalDefaults: Partial<ThekSelectConfig<ThekSelectOption>> = {};

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
   * @param _element  Used internally by ThekSelectDom.init() to parse native <select> elements.
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

  public getFilteredOptions(): T[] {
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
    while (
      initialFocus < filteredOptions.length &&
      !!(filteredOptions[initialFocus] as Record<string, unknown>)?.['disabled']
    ) {
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

  public select(option: T): void {
    if (this.config.disabled) return;
    if ((option as Record<string, unknown>)['disabled']) return;
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
    if (!label.trim()) return;
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
        (o) =>
          (getOptionField(o, displayField) as string)?.toLowerCase() ===
          state.inputValue.toLowerCase()
      );
    const maxIndex = hasCreateSlot ? filteredOptions.length : filteredOptions.length - 1;
    let next = state.focusedIndex + 1;
    // Skip disabled items; the create slot (index === filteredOptions.length) is never disabled.
    while (
      next < filteredOptions.length &&
      !!(filteredOptions[next] as Record<string, unknown>)?.['disabled']
    ) {
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
    while (prev >= 0 && !!(filteredOptions[prev] as Record<string, unknown>)?.['disabled']) {
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

  public setValue(
    value: ThekSelectPrimitive | ThekSelectPrimitive[],
    silent: boolean = false
  ): void {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    const incomingValues = Array.isArray(value) ? value : [value];
    const normalizedValues = incomingValues.filter(
      (entry): entry is ThekSelectPrimitive =>
        typeof entry === 'string' || typeof entry === 'number'
    );
    const values = this.config.multiple
      ? Array.from(new Set(normalizedValues))
      : normalizedValues.slice(0, 1);
    const selectedOptionsByValue = buildSelectedOptionsMapFromValues(this.config, state, values);
    this.stateManager.setState({ selectedValues: values, selectedOptionsByValue });
    if (!silent) this.emit('change', this.getValue());
  }

  public setMaxOptions(max: number | null): void {
    this.config.maxOptions = max;
    this.stateManager.forceNotify();
  }

  public setOptions(options: T[]): void {
    const state = this.stateManager.getState() as ThekSelectState<T>;
    // Keep config.options in sync so remote-mode query-clear restores this list.
    this.config.options = options;
    this.stateManager.setState({
      options,
      selectedOptionsByValue: mergeSelectedOptionsByValue(
        this.config.valueField,
        state.selectedValues,
        state.selectedOptionsByValue,
        options
      )
    });
  }

  public getValue(): ThekSelectValue {
    const state = this.stateManager.getState();
    return this.config.multiple ? state.selectedValues : state.selectedValues[0];
  }

  public getSelectedOptions(): T | T[] | undefined {
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
    this.events.clear();
  }

  // ── Static API ────────────────────────────────────────────────────────────

  public static setDefaults(defaults: Partial<ThekSelectConfig<ThekSelectOption>>): void {
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
            const result = await this.config.loadOptions!(query, signal);
            if (this.isDestroyed || requestId !== this.remoteRequestId) return;
            if (!Array.isArray(result)) {
              this.stateManager.setState({ isLoading: false });
              this.emit('error', new Error('ThekSelect: loadOptions must resolve to an array'));
              return;
            }
            const options = result;
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
