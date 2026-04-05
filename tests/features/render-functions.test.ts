import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('Render function error boundary', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('falls back to plain label text when renderOption throws', () => {
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple' }],
      renderOption: () => { throw new Error('render crash'); }
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    // Dropdown should be open and show the fallback text
    const option = document.querySelector('.thek-option-label') as HTMLElement;
    expect(option).not.toBeNull();
    expect(option.textContent).toBe('Apple');
  });

  it('fires error event when renderOption throws', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple' }],
      renderOption: () => { throw new Error('render crash'); }
    });

    const errorHandler = vi.fn();
    ts.on('error', errorHandler);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    expect(errorHandler).toHaveBeenCalledOnce();
    expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(errorHandler.mock.calls[0][0].message).toBe('render crash');
  });

  it('falls back to plain label text when renderSelection throws in single mode', () => {
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple', selected: true }],
      renderSelection: () => { throw new Error('selection crash'); }
    });

    // Selection content should render the fallback label
    const selection = document.querySelector('.thek-selection') as HTMLElement;
    expect(selection.textContent).toBe('Apple');
  });

  it('fires error event when renderSelection throws', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'Apple', selected: true }],
      renderSelection: () => { throw new Error('selection crash'); }
    });

    const errorHandler = vi.fn();
    ts.on('error', errorHandler);

    // Trigger a re-render by opening/closing
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    control.click();

    expect(errorHandler).toHaveBeenCalled();
    expect(errorHandler.mock.calls[0][0].message).toBe('selection crash');
  });
});
