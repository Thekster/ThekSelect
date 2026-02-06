import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThekSelect } from '../src/core/thekselect';

describe('ThekSelect Events', () => {
  let selectEl: HTMLSelectElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="test-select">
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </select>
    `;
    selectEl = document.getElementById('test-select') as HTMLSelectElement;
  });

  it('should emit open and close events', () => {
    const ts = ThekSelect.init(selectEl);
    const onOpen = vi.fn();
    const onClose = vi.fn();

    ts.on('open', onOpen);
    ts.on('close', onClose);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect(onOpen).toHaveBeenCalled();

    // Click outside to close
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('should emit change event when an option is selected', () => {
    const ts = ThekSelect.init(selectEl);
    const onChange = vi.fn();
    ts.on('change', onChange);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const options = document.querySelectorAll('.thek-option');
    (options[0] as HTMLElement).click();

    expect(onChange).toHaveBeenCalledWith(['1']);
  });

  it('should emit search event when typing', async () => {
    const ts = ThekSelect.init(selectEl, { debounce: 0 });
    const onSearch = vi.fn();
    ts.on('search', onSearch);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'test';
    input.dispatchEvent(new Event('input'));

    // Debounce is 0, but still async
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('should emit tagAdded and tagRemoved events in multi-select', () => {
    selectEl.multiple = true;
    // Clear initial selection that JSDOM might have set
    Array.from(selectEl.options).forEach(opt => opt.selected = false);

    const ts = ThekSelect.init(selectEl);
    const onTagAdded = vi.fn();
    const onTagRemoved = vi.fn();

    ts.on('tagAdded', onTagAdded);
    ts.on('tagRemoved', onTagRemoved);

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    let options = document.querySelectorAll('.thek-option');
    // Option 1 is at index 0
    (options[0] as HTMLElement).click();
    expect(onTagAdded).toHaveBeenCalledWith(expect.objectContaining({ value: '1' }));

    (options[0] as HTMLElement).click(); // Toggle off
    expect(onTagRemoved).toHaveBeenCalledWith(expect.objectContaining({ value: '1' }));
  });
});
