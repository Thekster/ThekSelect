import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

function flush(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Reviewer findings regressions', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('removes global listeners on destroy', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    const positionSpy = vi.spyOn((ts as any).renderer, 'positionDropdown');
    positionSpy.mockClear();

    ts.destroy();

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    expect(positionSpy).not.toHaveBeenCalled();
  });

  it('clears loading state when query becomes empty in remote mode', async () => {
    let resolvePending!: (options: any[]) => void;
    const loadOptions = vi.fn(() => new Promise<any[]>((resolve) => {
      resolvePending = resolve;
    }));

    ThekSelect.init(container, { loadOptions, debounce: 0 });

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    await flush(10);

    expect(document.querySelector('.fa-circle-notch')).toBeTruthy();

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await flush(10);

    expect(document.querySelector('.fa-circle-notch')).toBeFalsy();

    resolvePending([]);
    await flush(10);
  });

  it('keeps empty-string selected value from native select', () => {
    document.body.innerHTML = `
      <select id="sel">
        <option value="" selected>Empty</option>
        <option value="x">X</option>
      </select>
    `;
    const select = document.getElementById('sel') as HTMLSelectElement;
    const ts = ThekSelect.init(select);
    expect(ts.getValue()).toBe('');
  });

  it('normalizes setValue for single and multiple modes', () => {
    const single = ThekSelect.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    single.setValue(['1', '2'] as any);
    expect(single.getValue()).toBe('1');

    single.destroy();

    document.body.innerHTML = '<div id="container"></div>';
    const multiContainer = document.getElementById('container') as HTMLDivElement;
    const multi = ThekSelect.init(multiContainer, {
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    multi.setValue(['1', '1', '2']);
    expect(multi.getValue()).toEqual(['1', '2']);
  });

  it('ignores out-of-bounds drag reorder payloads', () => {
    const ts = ThekSelect.init(container, {
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true },
        { value: '3', label: 'Three', selected: true }
      ]
    });

    const firstTag = document.querySelector('.thek-tag') as HTMLElement;
    const badDrop = new CustomEvent('drop', { bubbles: true }) as any;
    badDrop.dataTransfer = {
      getData: vi.fn().mockReturnValue('99')
    };
    badDrop.preventDefault = vi.fn();

    firstTag.dispatchEvent(badDrop);

    expect(ts.getValue()).toEqual(['1', '2', '3']);
  });

  it('renders createText as text, not executable html', async () => {
    ThekSelect.init(container, {
      canCreate: true,
      createText: `<img src=x onerror=alert(1)> Create "{%t}"`,
      options: [],
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'safe';
    input.dispatchEvent(new Event('input'));
    await flush(5);

    const createRow = document.querySelector('.thek-create') as HTMLElement;
    expect(createRow.querySelector('img')).toBeNull();
    expect(createRow.textContent).toContain('safe');
  });

  it('treats negative maxOptions as 0', () => {
    ThekSelect.init(container, {
      maxOptions: -1,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    expect(document.querySelectorAll('.thek-option-label').length).toBe(0);
    expect(document.querySelector('.thek-no-results')).toBeTruthy();
  });

  it('returns unsubscribe function from on()', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    const onChange = vi.fn();
    const unsubscribe = (ts as any).on('change', onChange);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const option = document.querySelector('.thek-option') as HTMLElement;
    option.click();
    expect(onChange).not.toHaveBeenCalled();
  });
});
