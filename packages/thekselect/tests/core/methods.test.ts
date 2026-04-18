import { describe, it, expect, beforeEach } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

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
    const ts = ThekSelectDom.init(selectEl);
    expect(ts.getValue()).toBeUndefined();

    ts.setValue('2');
    expect(ts.getValue()).toBe('2');
    expect(selectEl.value).toBe('2');
  });

  it('getValue and setValue should work for multi-select', () => {
    selectEl.multiple = true;
    Array.from(selectEl.options).forEach((opt) => (opt.selected = false));
    const ts = ThekSelectDom.init(selectEl);
    expect(ts.getValue()).toEqual([]);

    ts.setValue(['1', '2']);
    expect(ts.getValue()).toEqual(['1', '2']);
    expect(Array.from(selectEl.selectedOptions).map((o) => o.value)).toEqual(['1', '2']);
  });

  it('setOptions replaces the option list and re-renders', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ts = ThekSelectDom.init(container, {
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect(document.querySelectorAll('.thek-option').length).toBe(1);

    ts.setOptions([
      { value: '2', label: 'Two' },
      { value: '3', label: 'Three' }
    ]);
    expect(document.querySelectorAll('.thek-option').length).toBe(2);
    expect(ts.getState().options.map((o) => o.value)).toEqual(['2', '3']);
    ts.destroy();
  });

  it('setOptions preserves selected values still present in the new list', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ts = ThekSelectDom.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    ts.setValue(['1', '2']);

    ts.setOptions([
      { value: '1', label: 'One Updated' },
      { value: '3', label: 'Three' }
    ]);

    // '1' still selected; '2' gone from options but value is preserved in map
    expect((ts.getValue() as string[]).includes('1')).toBe(true);
    expect(ts.getState().options.map((o) => o.value)).toEqual(['1', '3']);
    ts.destroy();
  });

  it('destroy should remove the wrapper and show the original element', () => {
    const ts = ThekSelectDom.init(selectEl);
    expect(selectEl.style.display).toBe('none');

    ts.destroy();
    expect(selectEl.style.display).toBe('');
    expect(document.querySelector('.thek-select')).toBeNull();
  });
});
