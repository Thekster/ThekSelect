import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

describe('ARIA state correctness', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── aria-activedescendant ─────────────────────────────────────────────────

  it('sets aria-activedescendant on the control in non-searchable mode when navigating', () => {
    ThekSelectDom.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    // Open via ArrowDown — opens and sets focusedIndex: 0
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // The first option element should exist and control should reference it
    const firstOption = document.querySelector('.thek-option') as HTMLElement;
    expect(firstOption.id).toBeTruthy();
    expect(control.getAttribute('aria-activedescendant')).toBe(firstOption.id);
  });

  it('updates aria-activedescendant on the control as focus moves in non-searchable mode', () => {
    ThekSelectDom.init(container, {
      searchable: false,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    // Open (focusedIndex 0)
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // Move to index 1
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const options = document.querySelectorAll('.thek-option');
    expect(control.getAttribute('aria-activedescendant')).toBe(options[1].id);
  });

  it('clears aria-activedescendant from the control when dropdown closes', () => {
    ThekSelectDom.init(container, {
      searchable: false,
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(control.getAttribute('aria-activedescendant')).toBeTruthy();

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(control.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('sets aria-activedescendant on the control (even in searchable mode)', () => {
    ThekSelectDom.init(container, {
      searchable: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;

    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const firstOption = document.querySelector('.thek-option') as HTMLElement;
    expect(control.getAttribute('aria-activedescendant')).toBe(firstOption.id);
  });

  // ── aria-disabled ─────────────────────────────────────────────────────────

  it('disabled options have aria-disabled="true"', () => {
    ThekSelectDom.init(container, {
      options: [
        { value: '1', label: 'One', disabled: true },
        { value: '2', label: 'Two' }
      ]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const options = document.querySelectorAll('.thek-option');
    expect(options[0].getAttribute('aria-disabled')).toBe('true');
    expect(options[1].getAttribute('aria-disabled')).toBeNull();
  });

  it('non-disabled options do not have aria-disabled', () => {
    ThekSelectDom.init(container, {
      options: [{ value: '1', label: 'One' }]
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const option = document.querySelector('.thek-option') as HTMLElement;
    expect(option.getAttribute('aria-disabled')).toBeNull();
  });

  // ── tag-remove button ─────────────────────────────────────────────────────

  it('tag-remove elements are <button> elements', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'Apple', selected: true },
        { value: '2', label: 'Banana', selected: true }
      ]
    });

    const removeButtons = document.querySelectorAll('.thek-tag-remove');
    expect(removeButtons.length).toBe(2);
    removeButtons.forEach((btn) => {
      expect(btn.tagName.toLowerCase()).toBe('button');
    });
  });

  it('tag-remove buttons have type="button" to prevent form submission', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      options: [{ value: '1', label: 'Apple', selected: true }]
    });

    const removeBtn = document.querySelector('.thek-tag-remove') as HTMLButtonElement;
    expect(removeBtn.type).toBe('button');
  });

  it('tag-remove buttons have an aria-label containing the option label', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'Apple', selected: true },
        { value: '2', label: 'Banana', selected: true }
      ]
    });

    const removeButtons = document.querySelectorAll('.thek-tag-remove');
    expect(removeButtons[0].getAttribute('aria-label')).toContain('Apple');
    expect(removeButtons[1].getAttribute('aria-label')).toContain('Banana');
  });

  it('tag-remove button removes the tag when clicked', () => {
    const ts = ThekSelectDom.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'Apple', selected: true },
        { value: '2', label: 'Banana', selected: true }
      ]
    });

    const firstRemove = document.querySelector('.thek-tag-remove') as HTMLButtonElement;
    firstRemove.click();

    expect(ts.getValue()).toEqual(['2']);
  });

  // ── i18n configurable strings ─────────────────────────────────────────────

  it('uses custom noResultsText when provided', () => {
    ThekSelectDom.init(container, {
      options: [],
      noResultsText: 'Keine Ergebnisse'
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    expect(document.querySelector('.thek-no-results')?.textContent).toBe('Keine Ergebnisse');
  });

  it('uses default noResultsText when not provided', () => {
    ThekSelectDom.init(container, { options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    expect(document.querySelector('.thek-no-results')?.textContent).toBe('No results found');
  });

  it('uses custom searchPlaceholder when provided', () => {
    ThekSelectDom.init(container, {
      options: [],
      searchable: true,
      searchPlaceholder: 'Suchen...'
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    expect(input.placeholder).toBe('Suchen...');
  });

  it('uses custom loadingText when provided', async () => {
    let resolve!: (v: { value: string; label: string }[]) => void;
    ThekSelectDom.init(container, {
      debounce: 0,
      loadingText: 'Wird geladen...',
      loadOptions: () =>
        new Promise((r) => {
          resolve = r;
        })
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 10));

    expect(document.querySelector('.thek-loading')?.textContent).toBe('Wird geladen...');
    resolve([]);
  });

  it('marks the control and listbox as busy while loading', async () => {
    let resolve!: (v: { value: string; label: string }[]) => void;
    ThekSelectDom.init(container, {
      searchable: true,
      debounce: 0,
      loadOptions: () =>
        new Promise((r) => {
          resolve = r;
        })
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    const control = document.querySelector('.thek-control') as HTMLElement;
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 10));

    expect(control.getAttribute('aria-busy')).toBe('true');
    expect(listbox.getAttribute('aria-busy')).toBe('true');

    resolve([]);
    await new Promise((r) => setTimeout(r, 10));

    expect(control.getAttribute('aria-busy')).toBe('false');
    expect(listbox.getAttribute('aria-busy')).toBe('false');
  });

  it('marks the non-searchable combobox and listbox as not busy by default', () => {
    ThekSelectDom.init(container, {
      searchable: false,
      options: [{ value: '1', label: 'One' }]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(control.getAttribute('aria-busy')).toBe('false');
    expect(listbox.getAttribute('aria-busy')).toBe('false');
  });

  // ── combobox role placement ───────────────────────────────────────────────

  it('places role="combobox" on the control element even in searchable mode', () => {
    ThekSelectDom.init(container, { searchable: true, options: [] });
    const input = document.querySelector('.thek-input') as HTMLInputElement;
    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('role')).toBe('textbox');
  });

  it('places aria-expanded on the control in searchable mode', () => {
    ThekSelectDom.init(container, { searchable: true, options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('aria-expanded')).toBe('false');
  });

  it('updates aria-expanded on the control when dropdown opens in searchable mode', () => {
    ThekSelectDom.init(container, { searchable: true, options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect(control.getAttribute('aria-expanded')).toBe('true');
  });

  it('places role="combobox" on the control div in non-searchable mode', () => {
    ThekSelectDom.init(container, { searchable: false, options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('role')).toBe('combobox');
  });

  it('marks the widget disabled in searchable mode', () => {
    ThekSelectDom.init(container, { searchable: true, disabled: true, options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    const input = document.querySelector('.thek-input') as HTMLInputElement;
    expect(control.getAttribute('aria-disabled')).toBe('true');
    expect(control.getAttribute('tabindex')).toBe('-1');
    expect(input.getAttribute('aria-disabled')).toBe('true');
    expect(input.disabled).toBe(true);
  });

  // ── aria-multiselectable ──────────────────────────────────────────────────

  it('listbox has aria-multiselectable="true" in multiple mode', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      options: [{ value: '1', label: 'One' }]
    });
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('listbox does not have aria-multiselectable in single mode', () => {
    ThekSelectDom.init(container, {
      multiple: false,
      options: [{ value: '1', label: 'One' }]
    });
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.getAttribute('aria-multiselectable')).toBeNull();
  });
});
