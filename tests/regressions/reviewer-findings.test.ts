import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

function flush(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Reviewer findings regressions', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('removes global listeners on destroy', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    const positionSpy = vi.spyOn(
      (ts as unknown as { renderer: { positionDropdown: () => void } }).renderer,
      'positionDropdown'
    );
    positionSpy.mockClear();

    ts.destroy();

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    expect(positionSpy).not.toHaveBeenCalled();
  });

  it('clears loading state when query becomes empty in remote mode', async () => {
    let resolvePending!: (options: { value: string; label: string }[]) => void;
    const loadOptions = vi.fn(
      () =>
        new Promise<{ value: string; label: string }[]>((resolve) => {
          resolvePending = resolve;
        })
    );

    ThekSelect.init(container, { loadOptions, debounce: 0 });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    await flush(10);

    expect(document.querySelector('.thek-spinner')).toBeTruthy();

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await flush(10);

    expect(document.querySelector('.thek-spinner')).toBeFalsy();

    resolvePending([]);
    await flush(10);
  });

  it('keeps empty-string selected value from native select', () => {
    document.body.innerHTML = `
      <select id="sel">
        <option value="" selected>Empty</option>
        <option value="x">X</option>
      </select>
    `;
    const select = document.getElementById('sel') as HTMLSelectElement;
    const ts = ThekSelect.init(select);
    expect(ts.getValue()).toBe('');
  });

  it('normalizes setValue for single and multiple modes', () => {
    const single = ThekSelect.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    single.setValue(['1', '2'] as unknown as string);
    expect(single.getValue()).toBe('1');

    single.destroy();

    document.body.innerHTML = '<div id="container"></div>';
    const multiContainer = document.getElementById('container') as HTMLDivElement;
    const multi = ThekSelect.init(multiContainer, {
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    multi.setValue(['1', '1', '2']);
    expect(multi.getValue()).toEqual(['1', '2']);
  });

  it('ignores out-of-bounds drag reorder payloads', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true },
        { value: '3', label: 'Three', selected: true }
      ]
    });

    const firstTag = document.querySelector('.thek-tag') as HTMLElement;
    const badDrop = new CustomEvent('drop', { bubbles: true }) as unknown as DragEvent;
    Object.defineProperty(badDrop, 'dataTransfer', {
      value: {
        getData: vi.fn().mockReturnValue('99')
      }
    });
    badDrop.preventDefault = vi.fn();

    firstTag.dispatchEvent(badDrop);

    expect(ts.getValue()).toEqual(['1', '2', '3']);
  });

  it('renders createText as text, not executable html', async () => {
    ThekSelect.init(container, {
      canCreate: true,
      createText: `<img src=x onerror=alert(1)> Create "{%t}"`,
      options: [],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'safe';
    input.dispatchEvent(new Event('input'));
    await flush(5);

    const createRow = document.querySelector('.thek-create') as HTMLElement;
    expect(createRow.querySelector('img')).toBeNull();
    expect(createRow.textContent).toContain('safe');
  });

  it('treats negative maxOptions as 0', () => {
    ThekSelect.init(container, {
      maxOptions: -1,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    expect(document.querySelectorAll('.thek-option-label').length).toBe(0);
    expect(document.querySelector('.thek-no-results')).toBeTruthy();
  });

  it('returns unsubscribe function from on()', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    const onChange = vi.fn();
    const unsubscribe = (ts as unknown as { on: (event: string, cb: () => void) => () => void }).on(
      'change',
      onChange
    );

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const option = document.querySelector('.thek-option') as HTMLElement;
    option.click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes dropdown from body when wrapper is removed without calling destroy()', async () => {
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    // Dropdown is appended to document.body and is hidden but present
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(document.body.contains(dropdown)).toBe(true);

    // Remove the wrapper without calling destroy() — simulates SPA teardown
    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    wrapper.remove();

    // Give MutationObserver a tick to fire
    await new Promise((r) => setTimeout(r, 0));

    expect(document.body.contains(dropdown)).toBe(false);
  });

  it('does not mutate state after destroy when a fetch is in-flight', async () => {
    let resolveRemote!: (opts: { value: string; label: string }[]) => void;
    const ts = ThekSelect.init(container, {
      loadOptions: (_q, _signal) =>
        new Promise((resolve) => { resolveRemote = resolve; }),
      debounce: 0
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await flush(10); // fetch is now in-flight

    ts.destroy();

    // Resolve the fetch AFTER destroy — should be a no-op
    resolveRemote([{ value: 'x', label: 'X' }]);
    await flush(10);

    // isLoading must still be false (the component is destroyed; no state mutation)
    expect(ts.getState().isLoading).toBe(false);
    expect(ts.getState().options).toHaveLength(0);
  });

  it('removes direct DOM event listeners on destroy', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    // Grab a reference to the control before destroy removes it from DOM
    const control = document.querySelector('.thek-control') as HTMLElement;

    // Detach from DOM (simulates a SPA framework removing the component)
    control.remove();

    // Destroy the ThekSelect instance
    ts.destroy();

    // Re-attach the orphaned element to DOM
    document.body.appendChild(control);

    // With AbortController cleanup, clicking the control should not call toggle
    // (isDestroyed guard catches it too, but the listener itself should be gone)
    let threw = false;
    try {
      control.click();
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    // State should remain closed (toggle is a no-op after destroy)
    expect(ts.getState().isOpen).toBe(false);
  });

  it('syncOriginalElement uses display label not raw value for injected options', () => {
    // When value !== label, the injected <option> text must use the label.
    document.body.innerHTML = `<select id="fruit"></select>`;
    const select = document.getElementById('fruit') as HTMLSelectElement;
    ThekSelect.init(select, {
      options: [{ value: 'f1', label: 'Fig' }]
    }).setValue('f1');

    const opt = Array.from(select.options).find((o) => o.value === 'f1');
    expect(opt).toBeDefined();
    expect(opt!.text).toBe('Fig');
  });

  it('throttles positionDropdown calls — multiple rapid resize events cause only one call per rAF', async () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    // Open dropdown so positionDropdown is meaningful
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const positionSpy = vi.spyOn(
      (ts as unknown as { renderer: { positionDropdown: () => void } }).renderer,
      'positionDropdown'
    );

    // Fire 5 rapid resize events
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    // Wait for the rAF callback to fire (jsdom implements rAF as a microtask/setTimeout)
    await new Promise((r) => setTimeout(r, 50));

    // Should be called at most once (the rAF collapses duplicate events)
    expect(positionSpy).toHaveBeenCalledTimes(1);
  });
});
