import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('ThekSelect Remote loading', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  it('should load options from remote source', async () => {
    const loadOptions = vi.fn().mockResolvedValue([
      { value: 'r1', label: 'Remote 1' },
      { value: 'r2', label: 'Remote 2' }
    ]);

    ThekSelect.init(container, {
      loadOptions,
      debounce: 0
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'rem';
    input.dispatchEvent(new Event('input'));

    // Wait for debounce and promise
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loadOptions).toHaveBeenCalledWith('rem', expect.any(Object));

    const options = document.querySelectorAll('.thek-option');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toBe('Remote 1');
  });

  it('should show loading state', async () => {
    let resolvePromise: (value: { value: string; label: string }[]) => void;
    const promise = new Promise<{ value: string; label: string }[]>((resolve) => {
      resolvePromise = resolve;
    });
    const loadOptions = vi.fn().mockReturnValue(promise);

    ThekSelect.init(container, {
      loadOptions,
      debounce: 0
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'l';
    input.dispatchEvent(new Event('input'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    const loading = document.querySelector('.thek-loading');
    expect(loading).toBeTruthy();
    expect(loading?.textContent).toBe('Loading...');

    resolvePromise([{ value: '1', label: 'One' }]);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(document.querySelector('.thek-loading')).toBeNull();
    expect(document.querySelector('.thek-option')?.textContent).toBe('One');
  });

  it('passes an AbortSignal as second argument to loadOptions', async () => {
    const loadOptions = vi.fn().mockResolvedValue([]);

    ThekSelect.init(container, { loadOptions, debounce: 0 });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'test';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loadOptions).toHaveBeenCalledWith('test', expect.any(Object));
    const signal = loadOptions.mock.calls[0][1];
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts the previous request when a new search fires', async () => {
    const abortedSignals: boolean[] = [];
    const loadOptions = vi.fn((query: string, signal: AbortSignal) => {
      return new Promise<{ value: string; label: string }[]>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          abortedSignals.push(true);
          reject(new DOMException('Aborted', 'AbortError'));
        });
        // never resolves naturally so we can observe the abort
      });
    });

    ThekSelect.init(container, { loadOptions, debounce: 0 });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(abortedSignals.length).toBe(1);
  });

  it('aborts in-flight request when query is cleared', async () => {
    let aborted = false;
    const loadOptions = vi.fn((_query: string, signal: AbortSignal) => {
      return new Promise<{ value: string; label: string }[]>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    ThekSelect.init(container, { loadOptions, debounce: 0 });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'hello';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear the query — should abort the in-flight request
    input.value = '';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(aborted).toBe(true);
  });

  it('emits error event when loadOptions rejects with a real error', async () => {
    const networkError = new Error('network failure');
    const ts = ThekSelect.init(container, {
      loadOptions: async (_q, _s) => {
        throw networkError;
      },
      debounce: 0
    });

    const errorHandler = vi.fn();
    ts.on('error', errorHandler);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'q';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 20));

    expect(errorHandler).toHaveBeenCalledOnce();
    expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(errorHandler.mock.calls[0][0].message).toBe('network failure');
    // loading state must be cleared
    expect(ts.getState().isLoading).toBe(false);
  });

  it('does NOT emit error event when loadOptions is aborted', async () => {
    const ts = ThekSelect.init(container, {
      loadOptions: (_q, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
      debounce: 0
    });

    const errorHandler = vi.fn();
    ts.on('error', errorHandler);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 10));

    // Abort by typing a new query
    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 20));

    expect(errorHandler).not.toHaveBeenCalled();
  });
});
