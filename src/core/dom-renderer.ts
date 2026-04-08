import { ThekSelectConfig, ThekSelectState, ThekSelectOption } from './types.js';
import { RendererCallbacks, SVG_CHEVRON, SVG_SPINNER } from './renderer/constants.js';
import { createRendererSkeleton } from './renderer/dom-assembly.js';
import { renderSelectionContent } from './renderer/selection-renderer.js';
import { renderOptionsContent } from './renderer/options-renderer.js';
import { positionDropdown, normalizeHeight } from './renderer/dropdown-positioner.js';

export { RendererCallbacks };

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

    this.optionsList.addEventListener('scroll', () => this.handleOptionsScroll());
    this.optionsList.addEventListener('wheel', (e) => this.handleOptionsWheel(e), {
      passive: false
    });

    document.body.appendChild(this.dropdown);
    this._orphanObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const removed of Array.from(mutation.removedNodes)) {
          if (removed === this.wrapper || (removed as Element).contains?.(this.wrapper)) {
            this.callbacks.onOrphan();
            return;
          }
        }
      }
    });
    this._orphanObserver.observe(document.body, { childList: true, subtree: true });
    this.applyHeight(this.config.height);
  }

  private applyHeight(height: number | string): void {
    const resolved = normalizeHeight(height);
    this.wrapper.style.setProperty('--thek-input-height', resolved);
    this.dropdown.style.setProperty('--thek-input-height', resolved);
  }

  public render(state: ThekSelectState<T>, filteredOptions: ThekSelectOption<T>[]): void {
    this.lastState = state;
    this.lastFilteredOptions = filteredOptions;
    const ariaTarget = this.config.searchable ? this.input : this.control;
    ariaTarget.setAttribute('aria-expanded', state.isOpen.toString());
    this.dropdown.hidden = !state.isOpen;
    this.wrapper.classList.toggle('thek-open', state.isOpen);

    if (state.isLoading) {
      this.indicatorsContainer.innerHTML = SVG_SPINNER;
    } else {
      this.indicatorsContainer.innerHTML = SVG_CHEVRON;
    }

    renderSelectionContent(this.selectionContainer, this.placeholderElement, state, this.config, this.callbacks);
    renderOptionsContent(this.optionsList, state, filteredOptions, this.config, this.callbacks, this.id);
    
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
