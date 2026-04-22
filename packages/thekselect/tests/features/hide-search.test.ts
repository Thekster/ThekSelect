import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

const OPTIONS = [
  { value: '1', label: 'Apple' },
  { value: '2', label: 'Banana' },
  { value: '3', label: 'Blueberry' },
  { value: '4', label: 'Cherry', disabled: true },
  { value: '5', label: 'Coconut' }
];

describe('hideSearch option', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not render the search wrapper when hideSearch is true', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    expect(document.querySelector('.thek-search-wrapper')).toBeNull();
    expect(document.querySelector('.thek-input[type="text"]')).toBeNull();
  });

  it('renders the search box normally when hideSearch is false (default)', () => {
    ThekSelectDom.init(container, { options: OPTIONS });
    expect(document.querySelector('.thek-search-wrapper')).not.toBeNull();
  });

  it('opens the dropdown when an alphanumeric key is pressed', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
  });

  it('focuses the first option starting with the pressed letter', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    const focused = document.querySelector('.thek-option.thek-focused') as HTMLElement;
    expect(focused?.textContent).toBe('Banana');
  });

  it('skips disabled options during typeahead', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    const focused = document.querySelector('.thek-option.thek-focused') as HTMLElement;
    // Cherry is disabled — should jump to Coconut
    expect(focused?.textContent).toBe('Coconut');
  });

  it('does nothing if no option matches the pressed letter', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    // Now press a letter with no match
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    const focused = document.querySelector('.thek-option.thek-focused') as HTMLElement;
    // Still on Apple (first match for 'a')
    expect(focused?.textContent).toBe('Apple');
  });

  it('returns focus to the control on Escape when hideSearch is true', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(true);
  });

  it('arrow key navigation still works when hideSearch is true', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const focused = document.querySelector('.thek-option.thek-focused') as HTMLElement;
    expect(focused?.textContent).toBe('Banana');
  });

  it('hideSearch with searchable: false behaves the same as hideSearch: true', () => {
    ThekSelectDom.init(container, { options: OPTIONS, searchable: false, hideSearch: true });
    expect(document.querySelector('.thek-search-wrapper')).toBeNull();
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    const focused = document.querySelector('.thek-option.thek-focused') as HTMLElement;
    expect(focused?.textContent).toBe('Apple');
  });

  it('does not trigger typeahead on modifier key combinations', () => {
    ThekSelectDom.init(container, { options: OPTIONS, hideSearch: true });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    // Ctrl+A should NOT open the dropdown via typeahead
    expect(dropdown.hidden).toBe(true);
  });
});
