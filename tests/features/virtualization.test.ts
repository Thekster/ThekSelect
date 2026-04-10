import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

function makeOptions(n: number) {
  return Array.from({ length: n }, (_, i) => ({ value: `${i}`, label: `Option ${i}` }));
}

describe('Virtualization', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('activates when option count meets virtualThreshold', () => {
    ThekSelect.init(container, {
      options: makeOptions(100),
      virtualize: true,
      virtualThreshold: 80,
      virtualItemHeight: 40
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    // Virtual list renders a windowed slice + spacers, not all 100 items
    const allLi = document.querySelectorAll('.thek-options li');
    expect(allLi.length).toBeLessThan(100);
  });

  it('does not activate below virtualThreshold', () => {
    ThekSelect.init(container, {
      options: makeOptions(10),
      virtualize: true,
      virtualThreshold: 80,
      virtualItemHeight: 40
    });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const items = document.querySelectorAll('.thek-option');
    expect(items.length).toBe(10);
  });

  // ── rAF throttle on virtual scroll ───────────────────────────────────────

  it('batches multiple rapid scroll events into one DOM update per animation frame', () => {
    vi.useFakeTimers();

    const ts = ThekSelect.init(container, {
      options: makeOptions(200),
      virtualize: true,
      virtualThreshold: 80,
      virtualItemHeight: 40
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const list = document.querySelector('.thek-options') as HTMLElement;

    // Access the internal DomRenderer to spy on handleOptionsScroll
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendererInternal = (ts as any).renderer;
    const scrollSpy = vi.spyOn(rendererInternal, 'handleOptionsScroll');

    // Fire 5 scroll events before any rAF fires
    list.dispatchEvent(new Event('scroll'));
    list.dispatchEvent(new Event('scroll'));
    list.dispatchEvent(new Event('scroll'));
    list.dispatchEvent(new Event('scroll'));
    list.dispatchEvent(new Event('scroll'));

    // With rAF throttling: handleOptionsScroll should not have fired yet
    expect(scrollSpy).not.toHaveBeenCalled();

    // Advance all timers (includes rAF callbacks)
    vi.runAllTimers();

    // Exactly one actual scroll render despite five events
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('fires another scroll render after the first rAF completes', () => {
    vi.useFakeTimers();

    const ts = ThekSelect.init(container, {
      options: makeOptions(200),
      virtualize: true,
      virtualThreshold: 80,
      virtualItemHeight: 40
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const list = document.querySelector('.thek-options') as HTMLElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrollSpy = vi.spyOn((ts as any).renderer, 'handleOptionsScroll');

    // First batch
    list.dispatchEvent(new Event('scroll'));
    list.dispatchEvent(new Event('scroll'));
    vi.runAllTimers();
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    // Second batch after the first rAF has fired — gate resets
    list.dispatchEvent(new Event('scroll'));
    vi.runAllTimers();
    expect(scrollSpy).toHaveBeenCalledTimes(2);
  });
});
