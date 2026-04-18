import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

/**
 * Regression: render() called getState() twice per state change notification —
 * once directly and once via getFilteredOptions(). Each call deep-clones the
 * full state tree. For large option lists this is material wasted work.
 *
 * The fix: accept the already-cloned state snapshot passed by the subscriber
 * instead of re-fetching it.
 */
describe('Render clone cost', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function countGetStateCallsDuringNotify(ts: ReturnType<typeof ThekSelectDom.init>): () => number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sm = (ts as any).stateManager;
    const spy = vi.spyOn(sm, 'getState');

    // Wrap private notify() to capture how many getState() calls happen during
    // one notification cycle (= notify's own call + all subscriber calls).
    let delta = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origNotify: () => void = (sm as any).notify.bind(sm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sm as any).notify = function () {
      const before = spy.mock.calls.length;
      origNotify();
      delta = spy.mock.calls.length - before;
    };

    return () => delta;
  }

  it('calls getState() at most once during the notification that drives render', () => {
    const ts = ThekSelectDom.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    const getDelta = countGetStateCallsDuringNotify(ts);

    // Trigger one state change
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    // notify() itself calls getState() once to snapshot for all subscribers.
    // render() must not call it again — it should use the snapshot already provided.
    expect(getDelta()).toBe(1);
  });

  it('calls getState() at most once when a selection triggers a render', () => {
    const ts = ThekSelectDom.init(container, {
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });

    // Open first so the selection render is the targeted state change
    (document.querySelector('.thek-control') as HTMLElement).click();

    const getDelta = countGetStateCallsDuringNotify(ts);

    const option = document.querySelector('.thek-option') as HTMLElement;
    option.click(); // triggers select() → setState({ selectedValues }) → notify → render

    expect(getDelta()).toBe(1);
  });
});
