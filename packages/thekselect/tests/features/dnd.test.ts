import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

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
    const dropEvent = new CustomEvent('drop', { bubbles: true }) as unknown as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn().mockReturnValue('1')
      }
    });
    dropEvent.preventDefault = vi.fn();

    tags[2].dispatchEvent(dropEvent);

    expect(onReordered).toHaveBeenCalled();
    const newValue = ts.getValue() as string[];
    expect(newValue).toEqual(['2', '3', '1']);
  });

  it('reorders by stable tag value even if dataset indices are stale', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true },
        { value: '3', label: 'Three', selected: true }
      ]
    });

    const tags = document.querySelectorAll('.thek-tag');
    (tags[0] as HTMLElement).dataset.index = '99';
    (tags[2] as HTMLElement).dataset.index = '42';

    const dropEvent = new CustomEvent('drop', { bubbles: true }) as unknown as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn().mockReturnValue('1')
      }
    });
    dropEvent.preventDefault = vi.fn();

    tags[2].dispatchEvent(dropEvent);

    expect(ts.getValue()).toEqual(['2', '3', '1']);
  });
});
