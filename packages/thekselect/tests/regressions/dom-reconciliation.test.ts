import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

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
    ThekSelectDom.init(container, {
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
    ThekSelectDom.init(container, {
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
    ThekSelectDom.init(container, {
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

  it('updates reused option node content when setRenderOption changes output', () => {
    const ts = ThekSelectDom.init(container, {
      searchable: true,
      options: [{ value: '1', label: 'Apple' }]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const optionNode = document.querySelector('.thek-option') as HTMLElement;
    ts.setRenderOption((option) => `Fruit: ${option.label}`);
    expect(document.querySelector('.thek-option')).toBe(optionNode);
    expect(optionNode.textContent).toContain('Fruit: Apple');
  });

  it('removes orphan nodes when an option disappears from the filtered list', () => {
    ThekSelectDom.init(container, {
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

describe('DOM reconciliation — selection container (tags)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reuses existing tag nodes when a second option is selected', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;

    // Select first option
    control.click();
    document
      .querySelectorAll('.thek-option')[0]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tagOne = document.querySelector('.thek-tag') as HTMLElement;
    expect(tagOne).not.toBeNull();

    // Select second option — tagOne should be reused
    control.click();
    document
      .querySelectorAll('.thek-option')[1]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tags = document.querySelectorAll('.thek-tag');
    expect(tags.length).toBe(2);
    expect(tags[0]).toBe(tagOne);
  });

  it('removes a tag node when its option is deselected', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;

    // Select both options
    control.click();
    document
      .querySelectorAll('.thek-option')[0]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    control.click();
    document
      .querySelectorAll('.thek-option')[1]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelectorAll('.thek-tag').length).toBe(2);

    // Deselect via remove button on first tag
    (document.querySelector('.thek-tag-remove') as HTMLButtonElement).click();
    expect(document.querySelectorAll('.thek-tag').length).toBe(1);
    expect((document.querySelector('.thek-tag') as HTMLElement).dataset.value).toBe('2');
  });

  it('switches to summary mode and back to tag mode without stale nodes', () => {
    ThekSelectDom.init(container, {
      multiple: true,
      maxSelectedLabels: 2,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;

    // Select 2 — still in tag mode
    control.click();
    document
      .querySelectorAll('.thek-option')[0]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    control.click();
    document
      .querySelectorAll('.thek-option')[1]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelectorAll('.thek-tag').length).toBe(2);
    expect(document.querySelector('.thek-summary-text')).toBeNull();

    // Select 3rd — enters summary mode
    control.click();
    document
      .querySelectorAll('.thek-option')[2]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelectorAll('.thek-tag').length).toBe(0);
    expect(document.querySelector('.thek-summary-text')?.textContent).toBe('3 items selected');

    // Deselect back to 2 — returns to tag mode
    document.querySelector('.thek-summary-text') as HTMLElement;
    // Use remove via setValue to go back below threshold
    // Simulate deselect: click option 3 again to deselect
    control.click();
    document
      .querySelectorAll('.thek-option')[2]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.thek-summary-text')).toBeNull();
    expect(document.querySelectorAll('.thek-tag').length).toBe(2);
  });

  it('updates reused tag content and aria-label when option labels change', () => {
    const options = [{ value: '1', label: 'One', selected: true }];
    const ts = ThekSelectDom.init(container, {
      multiple: true,
      options
    });

    const tag = document.querySelector('.thek-tag') as HTMLElement;
    const removeButton = document.querySelector('.thek-tag-remove') as HTMLButtonElement;
    const label = document.querySelector('.thek-tag-label') as HTMLElement;
    expect(removeButton.getAttribute('aria-label')).toBe('Remove One');

    options[0].label = 'Renamed';
    ts.setMaxOptions(null);

    expect(document.querySelector('.thek-tag')).toBe(tag);
    expect(label.textContent).toBe('Renamed');
    expect(removeButton.getAttribute('aria-label')).toBe('Remove Renamed');
  });
});
