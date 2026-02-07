import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../src/core/thekselect';
import { ThekSelectOption } from '../src/core/types';

// Helper to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Hostile Review Tests', () => {
  let container: HTMLElement;
  let instance: ThekSelect | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    instance = null;
  });

  afterEach(() => {
    if (instance) instance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // P0: Security (XSS)
  it('should escape HTML in default option rendering', () => {
    const maliciousLabel = '<img src=x onerror=alert(1)>';
    instance = ThekSelect.init(container, {
      options: [{ value: '1', label: maliciousLabel }]
    });

    const option = document.body.querySelector('.thek-option');
    expect(option).toBeTruthy();
    // Should render as text, so innerHTML should not contain the tag strictly interpreted as HTML
    // But wait, the default render currently uses innerHTML?
    // If unsafe, this test checks if the IMAGE tag is present in the DOM structure (not just string)
    expect(option?.querySelector('img')).toBeNull();
    expect(option?.textContent).toContain(maliciousLabel);
  });

  it('should prevent XSS even with custom renderOption returning string', () => {
    const maliciousCode = '<img src=x onerror=alert(1)>';
    instance = ThekSelect.init(container, {
      options: [{ value: '1', label: 'safe' }],
      renderOption: () => maliciousCode
    });

    const option = document.body.querySelector('.thek-option');
    expect(option?.querySelector('img')).toBeNull();
    // It should render the string literal
    expect(option?.textContent).toBe(maliciousCode);
  });

  // P0: Async Race
  it('should handle out-of-order async responses (latest query wins)', async () => {
    let callOrder: string[] = [];
    const loadOptions = vi.fn(async (query: string) => {
      callOrder.push(`start:${query}`);
      if (query === 'slow') {
        await wait(100);
        callOrder.push(`end:slow`);
        return [{ value: 'slow', label: 'Slow Result' }];
      }
      if (query === 'fast') {
        await wait(10);
        callOrder.push(`end:fast`);
        return [{ value: 'fast', label: 'Fast Result' }];
      }
      return [];
    });

    instance = ThekSelect.init(container, {
      loadOptions,
      debounce: 0 // Disable debounce to control timing strictly manually or assumes internal debounce
    });

    // Simulate typing "slow"
    const input = document.body.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'slow';
    input.dispatchEvent(new Event('input'));

    // Immediately type "fast" (overwriting input)
    // Note: ThekSelect debounces. We need to wait?
    // If we set debounce: 0, it calls immediately.

    // We want to simulate: Request A sent -> Request B sent -> B resolves -> A resolves.
    // Result should be B.

    // Wait for first call to trigger
    await wait(0);

    input.value = 'fast';
    input.dispatchEvent(new Event('input'));

    // Wait for all to settle
    await wait(150);

    // Verify 'fast' is the current result
    const options = document.querySelectorAll('.thek-option');
    const labels = Array.from(options).map(o => o.textContent);

    // Expectation: Only Fast Result
    expect(labels).toContain('Fast Result');
    expect(labels).not.toContain('Slow Result');
  });

  // P1: Data Integrity
  it('should persist selected option metadata when remote options change', async () => {
    const loadOptions = async (query: string) => {
      if (query === 'a') return [{ value: '1', label: 'First Label', extra: 'data' }];
      if (query === 'b') return [{ value: '2', label: 'Second Label' }];
      return [];
    };

    instance = ThekSelect.init(container, {
      loadOptions,
      debounce: 0,
      renderSelection: (opt) => `Selected: ${opt.label}`
    });

    const input = document.body.querySelector('.thek-input') as HTMLInputElement;

    // Search 'a'
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await wait(10);

    // Select 'First Label'
    const option1 = document.getElementById(document.querySelector('.thek-option')!.id);
    option1?.click();

    // Verify selection
    const selection = document.body.querySelector('.thek-selection');
    expect(selection?.textContent).toContain('Selected: First Label');

    // Search 'b' (clears options)
    input.value = 'b';
    input.dispatchEvent(new Event('input'));
    await wait(10);

    // Verify selection is STILL 'Selected: First Label' and not 'Selected: 1'
    expect(selection?.textContent).toContain('Selected: First Label');
  });

  // P2: Memory Leak (Destroy)
  it('should remove global event listeners on destroy', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    instance = ThekSelect.init(container, { options: [] });

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function));

    instance.destroy();

    // We expect the *same* function reference to be removed.
    // Since we can't easily check reference equality with spies without capturing it,
    // we assume if removeEventListener called with 'click', it's likely correct.
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  // P2: Drag and Drop (Reordering) - fragility check
  // We'll test the `reordered` event logic if possible or simulate internal method if we can access it.
  // Since we can't easily access private methods in TS test without casting to any.
  it('should reorder tags correctly', () => {
     instance = ThekSelect.init(container, {
       options: [
         { value: '1', label: 'One' },
         { value: '2', label: 'Two' },
         { value: '3', label: 'Three' }
       ],
       multiple: true
     });

     // Select all 3
     (instance as any).selectOption({ value: '1', label: 'One' });
     (instance as any).selectOption({ value: '2', label: 'Two' });
     (instance as any).selectOption({ value: '3', label: 'Three' });

     // Current order: 1, 2, 3
     // Move index 0 (1) to index 2 (end) -> 2, 3, 1
     (instance as any).reorderTags(0, 2);

     const values = (instance as any).getValue();
     expect(values).toEqual(['2', '3', '1']);
  });
});
