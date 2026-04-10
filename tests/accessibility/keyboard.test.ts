import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('searchable mode keeps the visible control in the tab order', () => {
    ThekSelect.init(container, { searchable: true, options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('tabindex')).toBe('0');
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

  // Disabled item navigation — focusNext/focusPrev must skip disabled options
  it('ArrowDown skips over a disabled option', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two', disabled: true },
        { value: '3', label: 'Three' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    // Open (focusedIndex lands on first non-disabled = 0)
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // Next ArrowDown should skip index 1 (disabled) and land on index 2
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const options = document.querySelectorAll('.thek-option');
    expect(options[2].classList.contains('thek-focused')).toBe(true);
    expect(options[1].classList.contains('thek-focused')).toBe(false);
  });

  it('ArrowUp skips over a disabled option', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two', disabled: true },
        { value: '3', label: 'Three' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    // Open, then navigate to index 2
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // ArrowUp from index 2 should skip index 1 (disabled) and land on index 0
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    const options = document.querySelectorAll('.thek-option');
    expect(options[0].classList.contains('thek-focused')).toBe(true);
    expect(options[1].classList.contains('thek-focused')).toBe(false);
  });

  it('open() skips a disabled first option and focuses the first non-disabled one', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One', disabled: true },
        { value: '2', label: 'Two' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const options = document.querySelectorAll('.thek-option');
    expect(options[1].classList.contains('thek-focused')).toBe(true);
    expect(options[0].classList.contains('thek-focused')).toBe(false);
  });

  it('aria-activedescendant never points at a disabled option after ArrowDown', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two', disabled: true },
        { value: '3', label: 'Three' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const activeId = control.getAttribute('aria-activedescendant');
    const activeEl = activeId ? document.getElementById(activeId) : null;
    expect(activeEl?.getAttribute('aria-disabled')).toBeNull();
  });

  // Escape should return focus to the combobox element
  it('Escape returns focus to the control in non-searchable mode', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const focusSpy = vi.spyOn(control, 'focus');
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(focusSpy).toHaveBeenCalled();
  });

  // ArrowUp on a closed dropdown should open it (consistent with ArrowDown)
  it('ArrowUp on a closed dropdown opens it', () => {
    ThekSelect.init(container, { searchable: false, options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);
  });

  it('disabled controls ignore keyboard open attempts', () => {
    ThekSelect.init(container, {
      disabled: true,
      searchable: true,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(true);
  });

  // ── Blur / focus-loss closes dropdown ────────────────────────────────────

  it('closes the dropdown when the search input loses focus to an external element', () => {
    document.body.innerHTML = `
      <div id="container"></div>
      <input id="outside" />
    `;
    const localContainer = document.getElementById('container') as HTMLDivElement;
    const outside = document.getElementById('outside') as HTMLInputElement;

    ThekSelect.init(localContainer, {
      searchable: true,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('blur', { relatedTarget: outside, bubbles: true }));

    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(true);
  });

  it('closes the dropdown when the control loses focus to an external element in non-searchable mode', () => {
    document.body.innerHTML = `
      <div id="container"></div>
      <input id="outside" />
    `;
    const localContainer = document.getElementById('container') as HTMLDivElement;
    const outside = document.getElementById('outside') as HTMLInputElement;

    ThekSelect.init(localContainer, {
      searchable: false,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);

    control.dispatchEvent(new FocusEvent('blur', { relatedTarget: outside, bubbles: true }));

    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(true);
  });

  it('does not close when focus moves from the control to the search input within the dropdown', () => {
    ThekSelect.init(container, {
      searchable: true,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    const input = document.querySelector('.thek-input') as HTMLInputElement;

    // Simulate: control clicked → dropdown opens → control blurs to input inside dropdown
    control.click();
    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);

    control.dispatchEvent(new FocusEvent('blur', { relatedTarget: input, bubbles: true }));

    // Still open — relatedTarget is inside the dropdown
    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);
  });

  it('does not close when focus moves between elements inside the wrapper', () => {
    ThekSelect.init(container, {
      searchable: false,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);

    // Blur where relatedTarget is another element inside the wrapper (e.g. indicators)
    const indicators = document.querySelector('.thek-indicators') as HTMLElement;
    control.dispatchEvent(new FocusEvent('blur', { relatedTarget: indicators, bubbles: true }));

    expect((document.querySelector('.thek-dropdown') as HTMLElement).hidden).toBe(false);
  });
});
