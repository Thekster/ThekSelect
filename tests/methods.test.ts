import { describe, it, expect, beforeEach } from 'vitest';
import { ThekSelect } from '../src/core/thekselect';

describe('ThekSelect Methods', () => {
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

  it('getValue and setValue should work for single select', () => {
    selectEl.selectedIndex = -1;
    const ts = ThekSelect.init(selectEl);
    expect(ts.getValue()).toBeUndefined();

    ts.setValue('2');
    expect(ts.getValue()).toBe('2');
    expect(selectEl.value).toBe('2');
  });

  it('getValue and setValue should work for multi-select', () => {
    selectEl.multiple = true;
    Array.from(selectEl.options).forEach(opt => opt.selected = false);
    const ts = ThekSelect.init(selectEl);
    expect(ts.getValue()).toEqual([]);

    ts.setValue(['1', '2']);
    expect(ts.getValue()).toEqual(['1', '2']);
    expect(Array.from(selectEl.selectedOptions).map(o => o.value)).toEqual(['1', '2']);
  });

  it('destroy should remove the wrapper and show the original element', () => {
    const ts = ThekSelect.init(selectEl);
    expect(selectEl.style.display).toBe('none');

    ts.destroy();
    expect(selectEl.style.display).toBe('');
    expect(document.querySelector('.thek-select')).toBeNull();
  });
});
