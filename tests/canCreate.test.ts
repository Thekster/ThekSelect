import { describe, it, expect, beforeEach } from 'vitest';
import { ThekSelect } from '../src/core/thekselect';

describe('ThekSelect canCreate', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  it('should allow creating a new option', async () => {
    const ts = new ThekSelect(container, {
      canCreate: true,
      options: [{ value: '1', label: 'Existing' }]
    });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'New Item';
    input.dispatchEvent(new Event('input'));

    await new Promise(resolve => setTimeout(resolve, 0));

    const createOption = document.querySelector('.thek-option.thek-create');
    expect(createOption).toBeTruthy();
    expect(createOption?.textContent).toContain('New Item');

    (createOption as HTMLElement).click();
    expect(ts.getValue()).toBe('New Item');
  });
});
