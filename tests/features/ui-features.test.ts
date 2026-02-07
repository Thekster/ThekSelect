import { describe, it, expect, beforeEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('ThekSelect UI Features', () => {
  let selectEl: HTMLSelectElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="test-select" multiple>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
        <option value="4">Option 4</option>
        <option value="5">Option 5</option>
      </select>
    `;
    selectEl = document.getElementById('test-select') as HTMLSelectElement;
  });

  it('should render checkboxes in multiple mode', () => {
    const ts = ThekSelect.init(selectEl, { multiple: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const checkboxes = document.querySelectorAll('.thek-checkbox');
    expect(checkboxes.length).toBe(5);
  });

  it('should show summary text when maxSelectedLabels is exceeded', () => {
    const ts = ThekSelect.init(selectEl, { multiple: true, maxSelectedLabels: 2 });
    
    const options = document.querySelectorAll('.thek-option');
    (options[0] as HTMLElement).click();
    (options[1] as HTMLElement).click();
    
    // 2 items selected, should still show tags if maxSelectedLabels is 2
    expect(document.querySelectorAll('.thek-tag').length).toBe(2);
    expect(document.querySelector('.thek-summary-text')).toBeNull();

    (options[2] as HTMLElement).click();
    // 3 items selected, should show summary text
    expect(document.querySelectorAll('.thek-tag').length).toBe(0);
    const summary = document.querySelector('.thek-summary-text');
    expect(summary).toBeTruthy();
    expect(summary?.textContent).toBe('3 items selected');
  });

  it('should show loading spinner when isLoading is true', async () => {
    const ts = ThekSelect.init(selectEl, { 
        loadOptions: async () => {
            return new Promise(resolve => setTimeout(() => resolve([{ value: 'r1', label: 'Remote 1' }]), 100));
        }
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'remote';
    input.dispatchEvent(new Event('input'));

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 400));

    const spinner = document.querySelector('.fa-circle-notch');
    expect(spinner).toBeTruthy();
  });

  it('should virtualize options when enabled for large datasets', () => {
    document.body.innerHTML = `<div id="virtual"></div>`;
    const options = Array.from({ length: 1000 }, (_, i) => ({
      value: `v_${i + 1}`,
      label: `Option ${i + 1}`
    }));

    ThekSelect.init('#virtual', {
      options,
      virtualize: true,
      virtualThreshold: 80,
      virtualItemHeight: 40,
      virtualOverscan: 4
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const renderedOptions = document.querySelectorAll('.thek-option').length;
    expect(renderedOptions).toBeGreaterThan(0);
    expect(renderedOptions).toBeLessThan(1000);
  });
});

