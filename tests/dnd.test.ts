import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThekSelect } from '../src/core/thekselect';

describe('ThekSelect Drag and Drop', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  it('should reorder tags via drag and drop', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true },
        { value: '3', label: 'Three', selected: true }
      ]
    });

    const onReordered = vi.fn();
    ts.on('reordered', onReordered);

    const tags = document.querySelectorAll('.thek-tag');
    expect(tags.length).toBe(3);
    expect((tags[0] as HTMLElement).dataset.value).toBe('1');

    // Simulate drop: tag 0 dropped onto tag 2
    const dropEvent = new CustomEvent('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: vi.fn().mockReturnValue('1') // return value, not index
    };
    dropEvent.preventDefault = vi.fn();

    tags[2].dispatchEvent(dropEvent);

    expect(onReordered).toHaveBeenCalled();
    const newValue = ts.getValue() as string[];
    expect(newValue).toEqual(['2', '3', '1']);
  });
});
