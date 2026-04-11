import { ThekSelectConfig, ThekSelectState, ThekSelectOption } from './types.js';
import { type RendererCallbacks, SVG_CHEVRON, SVG_SPINNER } from './renderer/constants.js';
import { createRendererSkeleton } from './renderer/dom-assembly.js';
import { renderSelectionContent } from './renderer/selection-renderer.js';
import { renderOptionsContent } from './renderer/options-renderer.js';
import { positionDropdown, normalizeHeight } from './renderer/dropdown-positioner.js';

export type { RendererCallbacks };

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
  private _listenerController: AbortController | null = null;
  private _orphanObserver: MutationObserver | null = null;

  constructor(
    private config: Required<ThekSelectConfig<T>>,
    private id: string,
    private callbacks: RendererCallbacks<T>
  ) {}

  public createDom(): void {
    this._listenerController = new AbortController();
    const { signal } = this._listenerController;

    const elements = createRendererSkeleton(this.id, this.config, this.callbacks, signal);
    Object.assign(this, elements);

    let scrollRafPending = false;
    this.optionsList.addEventListener('scroll', () => {
      if (scrollRafPending) return;
      scrollRafPending = true;
      requestAnimationFrame(() => {
        scrollRafPending = false;
        this.handleOptionsScroll();
      });
    });
    this.optionsList.addEventListener('wheel', (e) => this.handleOptionsWheel(e), {
      passive: false
    });

    // Prevent mousedown on dropdown items from stealing focus away from the
    // combobox input, which would fire a spurious blur and close the dropdown
    // before the click handler on the option has a chance to fire.
    this.dropdown.addEventListener('mousedown', (e) => e.preventDefault(), { signal });

    document.body.appendChild(this.dropdown);
    this.applyHeight(this.config.height);
  }

  private applyHeight(height: number | string): void {
    const resolved = normalizeHeight(height);
    this.wrapper.style.setProperty('--thek-input-height', resolved);
    this.dropdown.style.setProperty('--thek-input-height', resolved);
  }

  /** Start watching parent for direct removal of this wrapper. Must be called after insertion. */
  public startOrphanObserver(parent: Node): void {
    this._orphanObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const removed of Array.from(mutation.removedNodes)) {
          if (removed === this.wrapper) {
            this.callbacks.onOrphan();
            return;
          }
        }
      }
    });
    // childList only — no subtree. We know the wrapper is a direct child of parent.
    this._orphanObserver.observe(parent, { childList: true });
  }

  public render(state: ThekSelectState<T>, filteredOptions: ThekSelectOption<T>[]): void {
    const prevState = this.lastState;
    this.lastState = state;
    this.lastFilteredOptions = filteredOptions;
    const ariaTarget = this.config.searchable ? this.input : this.control;
    ariaTarget.setAttribute('aria-expanded', state.isOpen.toString());
    this.dropdown.hidden = !state.isOpen;
    this.wrapper.classList.toggle('thek-open', state.isOpen);

    // Only touch the indicator DOM when the loading state actually changes.
    if (state.isLoading !== prevState?.isLoading) {
      this.indicatorsContainer.innerHTML = state.isLoading ? SVG_SPINNER : SVG_CHEVRON;
    }

    renderSelectionContent(
      this.selectionContainer,
      this.placeholderElement,
      state,
      this.config,
      this.callbacks
    );
    renderOptionsContent(
      this.optionsList,
      state,
      filteredOptions,
      this.config,
      this.callbacks,
      this.id
    );

    const activeDescendantId =
      state.focusedIndex >= 0 &&
      state.focusedIndex < filteredOptions.length &&
      !!document.getElementById(`${this.id}-opt-${state.focusedIndex}`)
        ? `${this.id}-opt-${state.focusedIndex}`
        : null;
    this.updateActiveDescendant(activeDescendantId);
  }

  private updateActiveDescendant(id: string | null): void {
    const target = this.config.searchable ? this.input : this.control;
    if (id) {
      target.setAttribute('aria-activedescendant', id);
    } else {
      target.removeAttribute('aria-activedescendant');
    }
  }

  private handleOptionsScroll(): void {
    if (!this.config.virtualize || !this.lastState) return;
    const scrollTop = this.optionsList.scrollTop;
    renderOptionsContent(
      this.optionsList,
      this.lastState,
      this.lastFilteredOptions,
      this.config,
      this.callbacks,
      this.id,
      false,
      scrollTop
    );
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
        delta *= Math.max(1, this.config.virtualItemHeight);
      } else if (e.deltaMode === 2) {
        delta *= list.clientHeight || 240;
      }
      list.scrollTop += delta;
    }
  }

  public positionDropdown(): void {
    positionDropdown(this.dropdown, this.control, this.optionsList);
  }

  public scrollToSelected(
    state: ThekSelectState<T>,
    filteredOptions: ThekSelectOption<T>[]
  ): void {
    if (state.selectedValues.length === 0) return;

    const vField = this.config.valueField;
    const selectedIndex = filteredOptions.findIndex((opt) =>
      state.selectedValues.includes(opt[vField] as string)
    );
    if (selectedIndex < 0) return;

    const list = this.optionsList;

    if (
      this.config.virtualize &&
      filteredOptions.length >= this.config.virtualThreshold
    ) {
      const itemHeight = Math.max(20, this.config.virtualItemHeight);
      const viewportHeight = list.clientHeight || 240;
      list.scrollTop = Math.max(0, selectedIndex * itemHeight - viewportHeight / 2);
    } else {
      const el = document.getElementById(`${this.id}-opt-${selectedIndex}`);
      if (!el) return;
      // getBoundingClientRect gives viewport-relative coords; subtract the list's
      // top and add scrollTop to get the element's offset within the scroll container.
      // This is correct regardless of what the element's offsetParent happens to be.
      const elRect = el.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const elOffsetInList = elRect.top - listRect.top + list.scrollTop;
      const elBottom = elOffsetInList + el.offsetHeight;
      const listBottom = list.scrollTop + list.clientHeight;
      if (elOffsetInList < list.scrollTop || elBottom > listBottom) {
        list.scrollTop = elOffsetInList - list.clientHeight / 2 + el.offsetHeight / 2;
      }
    }
  }

  public setHeight(height: number | string): void {
    this.config.height = height;
    this.applyHeight(height);
  }

  public updateConfig(newConfig: Partial<Required<ThekSelectConfig<T>>>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._orphanObserver?.disconnect();
    this._orphanObserver = null;
    this._listenerController?.abort();
    this._listenerController = null;
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
}
