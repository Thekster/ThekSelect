import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('syncOriginalElement option leak', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('destroy() does not leave behind injected <option> elements from canCreate', () => {
    document.body.innerHTML = `
      <select id="sel">
        <option value="a">A</option>
      </select>
    `;
    const select = document.getElementById('sel') as HTMLSelectElement;
    const originalOptionCount = select.options.length; // 1

    const ts = ThekSelect.init(select, { canCreate: true });
    // Create a new tag — this calls syncOriginalElement which injects a new <option>
    ts.setValue('new-tag');

    // Before destroy: extra option exists
    expect(select.options.length).toBeGreaterThan(originalOptionCount);

    ts.destroy();

    // After destroy: the select must have EXACTLY the original options
    expect(select.options.length).toBe(originalOptionCount);
  });

  it('destroy() removes <option> elements added by setValue() for unknown values', () => {
    document.body.innerHTML = `
      <select id="sel">
        <option value="x">X</option>
      </select>
    `;
    const select = document.getElementById('sel') as HTMLSelectElement;
    const originalValues = Array.from(select.options).map((o) => o.value);

    const ts = ThekSelect.init(select);
    ts.setValue('injected-1');
    ts.setValue('injected-2');

    ts.destroy();

    const restoredValues = Array.from(select.options).map((o) => o.value);
    expect(restoredValues).toEqual(originalValues);
  });

  it('destroy() on a non-select element does not crash', () => {
    document.body.innerHTML = '<div id="d"></div>';
    const el = document.getElementById('d') as HTMLElement;
    const ts = ThekSelect.init(el, { options: [{ value: '1', label: 'One' }] });
    ts.setValue('1');
    expect(() => ts.destroy()).not.toThrow();
  });
});
