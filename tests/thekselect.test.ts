import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThekSelect } from '../src/core/thekselect';

describe('ThekSelect', () => {
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

  it('should initialize and hide the original select', () => {
    const ts = new ThekSelect(selectEl);
    expect(selectEl.style.display).toBe('none');
    expect(document.querySelector('.thek-select')).toBeTruthy();
  });

  it('should show options when clicked', () => {
    const ts = new ThekSelect(selectEl);
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
  });

  it('should select an option when clicked', () => {
    const ts = new ThekSelect(selectEl);
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const options = document.querySelectorAll('.thek-option');
    (options[1] as HTMLElement).click();

    expect(ts.getValue()).toBe('2');
    expect(selectEl.value).toBe('2');
  });

  it('should filter options based on input', async () => {
    const ts = new ThekSelect(selectEl, { debounce: 0 });
    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'Option 1';
    input.dispatchEvent(new Event('input'));

    await new Promise(resolve => setTimeout(resolve, 10));

    const options = document.querySelectorAll('.thek-option');
    expect(Array.from(options).some(opt => opt.textContent === 'Option 1')).toBe(true);
    expect(Array.from(options).some(opt => opt.textContent === 'Option 2')).toBe(false);
  });

  it('should support multi-select', () => {
    selectEl.multiple = true;
    Array.from(selectEl.options).forEach(opt => opt.selected = false);
    const ts = new ThekSelect(selectEl);

    let options = document.querySelectorAll('.thek-option');
    (options[0] as HTMLElement).click();

    options = document.querySelectorAll('.thek-option');
    (options[1] as HTMLElement).click();

    expect(ts.getValue()).toEqual(['1', '2']);
    expect(document.querySelectorAll('.thek-tag').length).toBe(2);
  });
});
