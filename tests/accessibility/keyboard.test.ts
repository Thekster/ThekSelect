import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('Keyboard accessibility', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Issue 1: keyboard reachability depends on searchable mode
  it('non-searchable control has tabindex="0" so keyboard users can reach it via Tab', () => {
    ThekSelect.init(container, { searchable: false, options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('tabindex')).toBe('0');
  });

  it('searchable input has tabindex (naturally focusable) and control has tabindex="-1"', () => {
    ThekSelect.init(container, { searchable: true, options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    const input = document.querySelector('.thek-input') as HTMLInputElement;
    // Control is removed from tab order; the input (combobox) is the keyboard entry point.
    expect(control.getAttribute('tabindex')).toBe('-1');
    // <input> elements are naturally focusable (no tabindex needed).
    expect(input).not.toBeNull();
  });

  // Issue 2: Enter on focused control opens dropdown
  it('pressing Enter on the focused control opens the dropdown', () => {
    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
  });

  // Issue 3: Space on focused control opens dropdown
  it('pressing Space on the focused control opens the dropdown', () => {
    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
  });

  // Issue 4: Escape on focused control closes dropdown
  it('pressing Escape on the focused control closes the dropdown', () => {
    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;

    // Open first
    control.click();
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);

    // Now close via Escape on control
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dropdown.hidden).toBe(true);
  });

  // Issue 5: searchable:false still responds to keyboard on the control
  it('non-searchable mode responds to keyboard on control (ArrowDown opens)', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
  });

  // Issue 6: Enter selects focused option in non-searchable mode
  it('non-searchable mode: ArrowDown + Enter selects the first option', () => {
    const ts = ThekSelect.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(ts.getValue()).toBe('1');
  });
});
