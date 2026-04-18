import { ThekSelect } from './thekselect.js';
import {
  ThekSelectConfig,
  ThekSelectOption,
  ThekSelectState,
  ThekSelectPrimitive,
  getOptionField,
  valuesMatch
} from './types.js';
import { DomRenderer, RendererCallbacks } from './dom-renderer.js';
import { getFilteredOptions } from './options-logic.js';
import { injectStyles } from '../utils/styles.js';
import { generateId } from '../utils/dom.js';
import { globalEventManager } from '../utils/event-manager.js';

export type ThekSelectHandle<T extends object = ThekSelectOption> = ThekSelect<T> & {
  setHeight(height: number | string): void;
  setRenderOption(fn: (option: T) => string | HTMLElement): void;
  setDisabled(disabled: boolean): void;
};

export class ThekSelectDom<T extends object = ThekSelectOption> extends ThekSelect<T> {
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
      onReorder: (draggedValue, targetValue) => {
        const sv = (this.stateManager.getState() as ThekSelectState<T>).selectedValues;
        const from = sv.findIndex((v) => String(v) === draggedValue);
        const to = sv.findIndex((v) => String(v) === targetValue);
        this.reorder(from, to);
      },
      onReorderKey: (value, direction) => {
        const sv = (this.stateManager.getState() as ThekSelectState<T>).selectedValues;
        const from = sv.findIndex((v) => String(v) === value);
        const to = from + direction;
        this.reorder(from, to);
        // Restore focus to the moved tag after the re-render settles.
        requestAnimationFrame(() => {
          const tags = this.renderer.selectionContainer.querySelectorAll<HTMLElement>('.thek-tag');
          const target = tags[Math.max(0, Math.min(to, tags.length - 1))];
          target?.focus();
        });
      },
      onFocusCombobox: () => {
        if (this.config.searchable) {
          this.renderer.input.focus();
        } else {
          this.renderer.control.focus();
        }
      },
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
    this.unsubscribeState = this.stateManager.subscribe((state) =>
      this.render(state as ThekSelectState<T>)
    );
    this.render();

    this.originalElement.style.display = 'none';
    const parent = this.originalElement.parentNode;
    if (parent) {
      parent.insertBefore(this.renderer.wrapper, this.originalElement.nextSibling);
    }
  }

  private applyAccessibleName(): void {
    const el = this.originalElement;
    const labelTarget = this.renderer.control;

    let resolvedLabelledBy: string | null = null;
    let resolvedLabel: string | null = null;

    const existingLabelledBy = el.getAttribute('aria-labelledby');
    if (existingLabelledBy) {
      labelTarget.setAttribute('aria-labelledby', existingLabelledBy);
      resolvedLabelledBy = existingLabelledBy;
    } else {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) {
        labelTarget.setAttribute('aria-label', ariaLabel);
        resolvedLabel = ariaLabel;
      } else {
        const id = el.id;
        if (id) {
          const escapedId =
            typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
              ? CSS.escape(id)
              : id.replace(/["\\]/g, '\\$&');
          const label = document.querySelector<HTMLLabelElement>(`label[for="${escapedId}"]`);
          if (label) {
            if (!label.id) {
              label.id = `${id}-label`;
            }
            labelTarget.setAttribute('aria-labelledby', label.id);
            resolvedLabelledBy = label.id;
          }
        }
      }
    }

    // Propagate the same label to the listbox so both share a name.
    this.renderer.setListboxLabel(resolvedLabelledBy, resolvedLabel);

    // Form-association attributes.
    if (this.config.required) {
      labelTarget.setAttribute('aria-required', 'true');
    }
    if (this.config.describedBy) {
      labelTarget.setAttribute('aria-describedby', this.config.describedBy);
    }
  }

  private setupListeners(): void {
    this.listenerController = new AbortController();
    const { signal } = this.listenerController;

    this.renderer.control.addEventListener(
      'click',
      () => {
        if (this.config.disabled) return;
        this.toggle();
      },
      { signal }
    );

    if (this.config.searchable) {
      this.renderer.input.addEventListener(
        'input',
        (e) => {
          const value = (e.target as HTMLInputElement).value;
          // search() handles the setState({ inputValue }) call — no need to duplicate it here.
          this.search(value);
        },
        { signal }
      );
    }

    this.renderer.input.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });
    this.renderer.control.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });

    const closeIfFocusLeft = (e: FocusEvent): void => {
      const related = e.relatedTarget as Node | null;
      if (
        related === null ||
        (!this.renderer.wrapper.contains(related) && !this.renderer.dropdown.contains(related))
      ) {
        this.close();
      }
    };
    this.renderer.input.addEventListener('blur', closeIfFocusLeft, { signal });
    this.renderer.control.addEventListener('blur', closeIfFocusLeft, { signal });

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
    this.renderer.scrollToSelected(
      this.stateManager.getState() as ThekSelectState<T>,
      this.getFilteredOptions()
    );
    if (this.config.searchable) {
      this.focusTimeoutId = setTimeout(() => {
        if (!this.isDestroyed && this.stateManager.getState().isOpen) {
          this.renderer.input.focus();
        }
      }, 10);
    }
  }

  private render(state?: ThekSelectState<T>): void {
    const s = state ?? (this.stateManager.getState() as ThekSelectState<T>);
    this.renderer.render(s, getFilteredOptions(this.config, s));
  }

  private rebuildOriginalSelectOptions(
    options: T[],
    values: ThekSelectPrimitive[],
    dispatchChange: boolean
  ): void {
    if (!(this.originalElement instanceof HTMLSelectElement)) return;

    const select = this.originalElement;
    select.innerHTML = '';
    this.injectedOptionValues.clear();

    options.forEach((option) => {
      const value = getOptionField(option, this.config.valueField);
      const stringValue = String(value);
      const label = String(getOptionField(option, this.config.displayField) ?? stringValue);
      const opt = new Option(
        label,
        stringValue,
        false,
        values.some((selectedValue) => valuesMatch(selectedValue, value))
      );
      opt.disabled = Boolean((option as Record<string, unknown>)['disabled']);
      select.add(opt);
    });

    this.syncOriginalElement(values, dispatchChange);
  }

  private syncOriginalElement(values: ThekSelectPrimitive[], dispatchChange: boolean = true): void {
    if (this.originalElement instanceof HTMLSelectElement) {
      const select = this.originalElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = values.some((value) => opt.value === String(value));
      });
      values.forEach((val) => {
        const stringValue = String(val);
        if (!Array.from(select.options).some((opt) => opt.value === stringValue)) {
          const state = this.stateManager.getState();
          const found =
            state.options.find((o) =>
              valuesMatch(getOptionField(o, this.config.valueField), val)
            ) || state.selectedOptionsByValue[stringValue];
          const label = found
            ? String(getOptionField(found, this.config.displayField) ?? val)
            : stringValue;
          const opt = new Option(label, stringValue, true, true);
          select.add(opt);
          this.injectedOptionValues.add(stringValue);
        }
      });
      if (dispatchChange) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  // Override select to also sync the native element and announce to screen readers.
  public override select(option: T): void {
    const wasSelected = this.stateManager
      .getState()
      .selectedValues.some((v) => valuesMatch(v, getOptionField(option, this.config.valueField)));
    super.select(option);
    this.syncOriginalElement(this.stateManager.getState().selectedValues);
    this.renderer.input.value = '';
    const label = String(getOptionField(option, this.config.displayField) ?? '');
    this.renderer.announce(
      this.config.multiple
        ? wasSelected
          ? `${label} removed`
          : `${label} selected`
        : `${label} selected`
    );
  }

  // Override close to also clear renderer input
  public override close(): void {
    super.close();
    this.renderer.input.value = '';
  }

  // Override setValue to also sync the native element
  public override setValue(
    value: ThekSelectPrimitive | ThekSelectPrimitive[],
    silent: boolean = false
  ): void {
    super.setValue(value, silent);
    this.syncOriginalElement(this.stateManager.getState().selectedValues, !silent);
  }

  public override setOptions(options: T[]): void {
    super.setOptions(options);
    this.rebuildOriginalSelectOptions(options, this.stateManager.getState().selectedValues, false);
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

  public setDisabled(disabled: boolean): void {
    this.config.disabled = disabled;
    this.renderer.control.setAttribute('tabindex', disabled ? '-1' : '0');
    this.renderer.control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    this.renderer.wrapper.classList.toggle('thek-disabled', disabled);
    if (this.config.searchable) {
      this.renderer.input.disabled = disabled;
      this.renderer.input.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }
    if (disabled && this.stateManager.getState().isOpen) {
      this.close();
    }
  }

  public setRenderOption(fn: (option: T) => string | HTMLElement): void {
    this.config.renderOption = fn;
    this.renderer.updateConfig({ renderOption: fn });
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
    if (
      typeof HTMLSelectElement !== 'undefined' &&
      this.originalElement instanceof HTMLSelectElement &&
      this.injectedOptionValues.size > 0
    ) {
      const select = this.originalElement;
      Array.from(select.options)
        .filter((opt) => this.injectedOptionValues.has(opt.value))
        .forEach((opt) => select.remove(opt.index));
      this.injectedOptionValues.clear();
    }
    this.originalElement.style.display = '';
  }

  public static init<T extends object = ThekSelectOption>(
    element: string | HTMLElement,
    config: ThekSelectConfig<T> = {}
  ): ThekSelectHandle<T> {
    return new ThekSelectDom<T>(element, config) as unknown as ThekSelectHandle<T>;
  }
}
