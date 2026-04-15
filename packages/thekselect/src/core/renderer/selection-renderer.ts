import {
  ThekSelectConfig,
  ThekSelectState,
  ThekSelectOption,
  getOptionField,
  valuesMatch
} from '../types.js';
import { RendererCallbacks } from './constants.js';

export function safeRender<T>(
  fn: (o: ThekSelectOption<T>) => string | HTMLElement,
  option: ThekSelectOption<T>,
  config: Required<ThekSelectConfig<T>>,
  onError: (err: Error) => void
): string | HTMLElement {
  try {
    return fn(option);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return String(getOptionField(option, config.displayField) ?? '');
  }
}

export function createTagNode<T>(
  option: ThekSelectOption<T>,
  val: string | number,
  index: number,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): HTMLElement {
  const tag = document.createElement('span');
  tag.className = 'thek-tag';
  tag.draggable = true;
  tag.setAttribute('tabindex', '0');
  tag.setAttribute('role', 'group');
  tag.setAttribute('aria-roledescription', 'tag');

  const label = document.createElement('span');
  label.className = 'thek-tag-label';
  tag.appendChild(label);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'thek-tag-remove';
  tag.appendChild(removeBtn);
  updateTagNode(tag, option, val, index, config, callbacks);
  return tag;
}

export function updateTagNode<T>(
  tag: HTMLElement,
  option: ThekSelectOption<T>,
  val: string | number,
  index: number,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): void {
  const dField = config.displayField;
  tag.dataset.index = index.toString();
  tag.dataset.value = String(val);

  const label = tag.querySelector<HTMLElement>('.thek-tag-label');
  const removeBtn = tag.querySelector<HTMLButtonElement>('.thek-tag-remove');
  if (!label || !removeBtn) return;

  label.textContent = '';
  const content = safeRender(config.renderSelection, option, config, callbacks.onError);
  const displayText =
    content instanceof HTMLElement ? String(getOptionField(option, dField) ?? val) : content;
  if (content instanceof HTMLElement) {
    label.appendChild(content);
  } else {
    label.textContent = content;
  }

  // Accessible label on the tag itself describes reorder keys for keyboard users.
  tag.setAttribute('aria-label', `${displayText}, use Alt+Left and Alt+Right to reorder`);

  tag.onkeydown = (e: KeyboardEvent) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onReorderKey(String(val), e.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', `Remove ${displayText}`);
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    // Capture adjacent tag before state update removes this node from DOM.
    const allTags = tag.parentElement
      ? Array.from(tag.parentElement.querySelectorAll<HTMLElement>('.thek-tag'))
      : [];
    const idx = allTags.indexOf(tag);
    const nextFocus = allTags[idx + 1] ?? allTags[idx - 1] ?? null;
    callbacks.onSelect(option);
    requestAnimationFrame(() => {
      if (nextFocus?.isConnected) {
        nextFocus.focus();
      } else {
        callbacks.onFocusCombobox();
      }
    });
  };
}

export function renderSelectionContent<T>(
  container: HTMLElement,
  placeholder: HTMLElement,
  state: ThekSelectState<T>,
  config: Required<ThekSelectConfig<T>>,
  callbacks: RendererCallbacks<T>
): void {
  const hasSelection = state.selectedValues.length > 0;
  placeholder.style.display = hasSelection ? 'none' : 'block';
  container.style.display = hasSelection ? 'flex' : 'none';

  if (!hasSelection) {
    container.replaceChildren();
    return;
  }

  const vField = config.valueField;
  const dField = config.displayField;

  if (config.multiple) {
    const isSummaryMode = state.selectedValues.length > config.maxSelectedLabels;
    const isCurrentlySummary = !!container.querySelector('.thek-summary-text');

    if (isSummaryMode) {
      if (!isCurrentlySummary) {
        container.replaceChildren();
        const summary = document.createElement('span');
        summary.className = 'thek-summary-text';
        container.appendChild(summary);
      }
      (container.querySelector('.thek-summary-text') as HTMLElement).textContent =
        `${state.selectedValues.length} items selected`;
    } else {
      if (isCurrentlySummary) {
        container.replaceChildren();
      }

      const existing = new Map<string, HTMLElement>();
      for (const child of Array.from(container.children) as HTMLElement[]) {
        if (child.dataset.value !== undefined) existing.set(child.dataset.value, child);
      }

      state.selectedValues.forEach((val, i) => {
        const option =
          state.options.find((o) => valuesMatch(getOptionField(o, vField), val)) ||
          state.selectedOptionsByValue[String(val)] ||
          ({ [vField]: val, [dField]: String(val) } as unknown as ThekSelectOption<T>);
        let tag = existing.get(String(val));
        if (tag) {
          existing.delete(String(val));
          updateTagNode(tag, option, val, i, config, callbacks);
        } else {
          tag = createTagNode(option, val, i, config, callbacks);
        }
        container.appendChild(tag);
      });

      for (const node of existing.values()) {
        container.removeChild(node);
      }
    }
  } else {
    container.replaceChildren();
    const val = state.selectedValues[0];
    const option =
      state.options.find((o) => valuesMatch(getOptionField(o, vField), val)) ||
      state.selectedOptionsByValue[String(val)];
    if (option) {
      const content = safeRender(config.renderSelection, option, config, callbacks.onError);
      if (content instanceof HTMLElement) {
        container.appendChild(content);
      } else {
        container.textContent = content;
      }
    }
  }
}
