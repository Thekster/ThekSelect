import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('DOM reconciliation — options list', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reuses existing option nodes when filter narrows the list', () => {
    ThekSelect.init(container, {
      searchable: true,
      options: [
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' },
        { value: '3', label: 'Cherry' }
      ],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const allOptions = Array.from(document.querySelectorAll('.thek-option'));
    expect(allOptions.length).toBe(3);

    // Capture node identity
    const appleNode = allOptions.find((n) => n.textContent?.includes('Apple'));
    expect(appleNode).toBeDefined();

    // Filter to just Apple
    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'App';
    input.dispatchEvent(new Event('input'));

    const filteredOptions = document.querySelectorAll('.thek-option');
    expect(filteredOptions.length).toBe(1);

    // The Apple node should be the SAME DOM node (reused, not recreated)
    expect(filteredOptions[0]).toBe(appleNode);
  });

  it('updates thek-selected class on existing nodes without recreating them', () => {
    const ts = ThekSelect.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const options = Array.from(document.querySelectorAll('.thek-option'));
    const nodeOne = options[0];
    expect(nodeOne.classList.contains('thek-selected')).toBe(false);

    nodeOne.click();
    control.click();

    // Same node, now has thek-selected
    const updatedOptions = document.querySelectorAll('.thek-option');
    expect(updatedOptions[0]).toBe(nodeOne);
    expect(updatedOptions[0].classList.contains('thek-selected')).toBe(true);
  });

  it('reuses the __create__ sentinel node across renders', () => {
    ThekSelect.init(container, {
      searchable: true,
      canCreate: true,
      options: [{ value: '1', label: 'Apple' }],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'New';
    input.dispatchEvent(new Event('input'));

    const createNode = document.querySelector('.thek-create') as HTMLElement;
    expect(createNode).not.toBeNull();

    // Simulate a second render with different input (still no exact match)
    input.value = 'Newer';
    input.dispatchEvent(new Event('input'));

    const createNodeAfter = document.querySelector('.thek-create') as HTMLElement;
    expect(createNodeAfter).not.toBeNull();
    // Should be the SAME node (reused)
    expect(createNodeAfter).toBe(createNode);
    expect(createNodeAfter.textContent).toContain('Newer');
  });

  it('removes orphan nodes when an option disappears from the filtered list', () => {
    ThekSelect.init(container, {
      searchable: true,
      options: [
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' }
      ],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    expect(document.querySelectorAll('.thek-option').length).toBe(2);

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'App';
    input.dispatchEvent(new Event('input'));

    expect(document.querySelectorAll('.thek-option').length).toBe(1);
    expect(document.querySelector('.thek-option')?.textContent).toBe('Apple');
  });
});
