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

    const ts = ThekSelect.init(container, {
      loadOptions,
      debounce: 0
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'rem';
    input.dispatchEvent(new Event('input'));

    // Wait for debounce and promise
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(loadOptions).toHaveBeenCalledWith('rem');

    const options = document.querySelectorAll('.thek-option');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toBe('Remote 1');
  });

  it('should show loading state', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => {
        resolvePromise = resolve;
    });
    const loadOptions = vi.fn().mockReturnValue(promise);

    const ts = ThekSelect.init(container, {
      loadOptions,
      debounce: 0
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'l';
    input.dispatchEvent(new Event('input'));

    await new Promise(resolve => setTimeout(resolve, 0));

    const loading = document.querySelector('.thek-loading');
    expect(loading).toBeTruthy();
    expect(loading?.textContent).toBe('Loading...');

    resolvePromise([{ value: '1', label: 'One' }]);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(document.querySelector('.thek-loading')).toBeNull();
    expect(document.querySelector('.thek-option')?.textContent).toBe('One');
  });
});

