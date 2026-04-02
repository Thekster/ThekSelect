import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelect, ThekSelectOption } from '../../src/core/thekselect';

describe('Typed event callbacks', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('change event callback receives string in single mode', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    const handler = vi.fn();
    ts.on('change', handler);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const option = document.querySelector('.thek-option') as HTMLElement;
    option.click();

    expect(handler).toHaveBeenCalledWith('1');
    // TypeScript: handler param should be typed as string | string[] | undefined
    const arg: string | string[] | undefined = handler.mock.calls[0][0];
    expect(arg).toBe('1');
  });

  it('change event callback receives string[] in multi mode', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [{ value: '1', label: 'One' }]
    });

    const handler = vi.fn();
    ts.on('change', handler);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const option = document.querySelector('.thek-option') as HTMLElement;
    option.click();

    expect(handler).toHaveBeenCalledWith(['1']);
    const arg: string | string[] | undefined = handler.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
  });

  it('tagAdded callback receives a ThekSelectOption', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [{ value: '1', label: 'One' }]
    });

    const handler = vi.fn();
    ts.on('tagAdded', handler);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const option = document.querySelector('.thek-option') as HTMLElement;
    option.click();

    expect(handler).toHaveBeenCalledOnce();
    const arg: ThekSelectOption = handler.mock.calls[0][0];
    // Must have option shape
    expect(arg.value).toBe('1');
    expect(arg.label).toBe('One');
  });

  it('search callback receives a string', async () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }],
      debounce: 0
    });

    const handler = vi.fn();
    ts.on('search', handler);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'hello';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 10));

    expect(handler).toHaveBeenCalledWith('hello');
    const arg: string = handler.mock.calls[0][0];
    expect(typeof arg).toBe('string');
  });

  it('reordered callback receives string[]', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true }
      ]
    });

    const handler = vi.fn();
    ts.on('reordered', handler);

    const tags = document.querySelectorAll('.thek-tag');
    const dropEvent = new CustomEvent('drop', { bubbles: true }) as unknown as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { getData: vi.fn().mockReturnValue('0') }
    });
    dropEvent.preventDefault = vi.fn();
    tags[1].dispatchEvent(dropEvent);

    expect(handler).toHaveBeenCalledOnce();
    const arg: string[] = handler.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
  });
});
