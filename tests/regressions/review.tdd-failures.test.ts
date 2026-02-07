import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

function flush(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('TDD: review hardening regressions', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders string option labels as text, not executable HTML', () => {
    const dangerousLabel = '<img src=x onerror=alert(1)>safe';
    ThekSelect.init(container, {
      options: [{ value: 'xss', label: dangerousLabel }]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const label = document.querySelector('.thek-option-label') as HTMLElement;
    expect(label.textContent).toBe(dangerousLabel);
    expect(label.querySelector('img')).toBeNull();
  });

  it('keeps the newest remote search results when requests resolve out of order', async () => {
    let resolveA!: (value: any[]) => void;
    let resolveAB!: (value: any[]) => void;

    const loadOptions = vi.fn((query: string) => {
      if (query === 'a') {
        return new Promise<any[]>(resolve => {
          resolveA = resolve;
        });
      }
      if (query === 'ab') {
        return new Promise<any[]>(resolve => {
          resolveAB = resolve;
        });
      }
      return Promise.resolve([]);
    });

    ThekSelect.init(container, { loadOptions, debounce: 0 });
    const input = document.querySelector('.thek-input') as HTMLInputElement;

    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await flush(10);
    expect(typeof resolveA).toBe('function');

    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    await flush(10);
    expect(typeof resolveAB).toBe('function');

    resolveAB([{ value: 'ab-1', label: 'AB Result' }]);
    await flush(10);
    resolveA([{ value: 'a-1', label: 'A Result' }]);
    await flush(10);

    const labels = Array.from(document.querySelectorAll('.thek-option-label')).map(el => el.textContent);
    expect(labels).toContain('AB Result');
    expect(labels).not.toContain('A Result');
  });

  it('preserves selected option label after remote options list is replaced', async () => {
    const loadOptions = vi.fn((query: string) => {
      if (query === 'first') {
        return Promise.resolve([{ value: 'u_42', label: 'User Forty Two' }]);
      }
      if (query === 'second') {
        return Promise.resolve([{ value: 'u_99', label: 'User Ninety Nine' }]);
      }
      return Promise.resolve([]);
    });

    ThekSelect.init(container, {
      multiple: true,
      loadOptions,
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'first';
    input.dispatchEvent(new Event('input'));
    await flush(10);

    const firstOption = document.querySelector('.thek-option') as HTMLElement;
    firstOption.click();

    input.value = 'second';
    input.dispatchEvent(new Event('input'));
    await flush(10);

    const tag = document.querySelector('.thek-tag-label') as HTMLElement;
    expect(tag.textContent).toBe('User Forty Two');
  });

  it('does not run a pending debounced search after destroy', async () => {
    vi.useFakeTimers();
    const loadOptions = vi.fn().mockResolvedValue([]);

    const ts = ThekSelect.init(container, {
      loadOptions,
      debounce: 50
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'pending';
    input.dispatchEvent(new Event('input'));

    ts.destroy();
    vi.advanceTimersByTime(60);
    await vi.runAllTimersAsync();

    expect(loadOptions).not.toHaveBeenCalled();
  });
});

