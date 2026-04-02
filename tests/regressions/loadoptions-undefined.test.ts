import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('loadOptions: undefined safety', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    ThekSelect.resetDefaults();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('does not show a loading spinner when loadOptions is explicitly undefined', async () => {
    // Passing undefined should mean "no remote mode" — never show a loading indicator
    ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }],
      loadOptions: undefined,
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'One';
    input.dispatchEvent(new Event('input'));

    await new Promise((r) => setTimeout(r, 10));

    // Must NOT enter loading state — local filtering doesn't load remotely
    expect(document.querySelector('.thek-spinner')).toBeNull();
  });

  it('uses local filtering (not remote) when loadOptions is explicitly undefined', async () => {
    ThekSelect.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ],
      loadOptions: undefined,
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'Two';
    input.dispatchEvent(new Event('input'));

    await new Promise((r) => setTimeout(r, 10));

    const labels = Array.from(document.querySelectorAll('.thek-option-label')).map(
      (el) => el.textContent
    );
    // Local filter: only 'Two' should remain, 'One' should be filtered out
    expect(labels).toContain('Two');
    expect(labels).not.toContain('One');
  });

  it('overriding a global loadOptions with undefined falls back to local mode', async () => {
    const globalLoader = vi.fn().mockResolvedValue([{ value: 'r1', label: 'Remote' }]);
    ThekSelect.setDefaults({ loadOptions: globalLoader });

    ThekSelect.init(container, {
      options: [{ value: '1', label: 'Local' }],
      loadOptions: undefined,
      debounce: 0
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const input = document.querySelector('.thek-input') as HTMLInputElement;
    input.value = 'Local';
    input.dispatchEvent(new Event('input'));

    await new Promise((r) => setTimeout(r, 10));

    // globalLoader must NOT be called — we explicitly opted out
    expect(globalLoader).not.toHaveBeenCalled();
    // Must NOT show loading spinner
    expect(document.querySelector('.thek-spinner')).toBeNull();
  });
});
