import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('No external icon dependency', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('indicator area contains an SVG, not a FontAwesome <i> element', () => {
    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const indicators = document.querySelector('.thek-indicators') as HTMLElement;

    // Must NOT rely on FontAwesome classes
    expect(indicators.querySelector('.fa-chevron-down')).toBeNull();
    expect(indicators.querySelector('.fa-solid')).toBeNull();

    // Must use inline SVG instead
    expect(indicators.querySelector('svg')).not.toBeNull();
  });

  it('search wrapper contains an SVG icon, not a FontAwesome <i> element', () => {
    ThekSelect.init(container, {
      searchable: true,
      options: [{ value: '1', label: 'One' }]
    });

    // Open dropdown to render search wrapper
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const searchWrapper = document.querySelector('.thek-search-wrapper') as HTMLElement;
    expect(searchWrapper.querySelector('.fa-magnifying-glass')).toBeNull();
    expect(searchWrapper.querySelector('.fa-solid')).toBeNull();
    expect(searchWrapper.querySelector('svg')).not.toBeNull();
  });

  it('loading state shows an SVG spinner, not a FontAwesome <i> element', async () => {
    let resolve!: (v: { value: string; label: string }[]) => void;
    ThekSelect.init(container, {
      debounce: 0,
      loadOptions: () => new Promise((r) => { resolve = r; })
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 10));

    const indicators = document.querySelector('.thek-indicators') as HTMLElement;
    expect(indicators.querySelector('.fa-circle-notch')).toBeNull();
    expect(indicators.querySelector('svg')).not.toBeNull();

    resolve([]);
  });

  it('multi-select checkboxes use inline SVG, not FontAwesome', () => {
    ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const selectedCheckbox = document.querySelector(
      '.thek-option.thek-selected .thek-checkbox'
    ) as HTMLElement;
    expect(selectedCheckbox).not.toBeNull();
    expect(selectedCheckbox.querySelector('.fa-solid')).toBeNull();
    expect(selectedCheckbox.querySelector('.fa-check')).toBeNull();
    expect(selectedCheckbox.querySelector('svg')).not.toBeNull();
  });
});
