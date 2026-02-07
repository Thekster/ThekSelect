import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('ThekSelect Global Defaults', () => {
  beforeEach(() => {
    ThekSelect.resetDefaults();
    document.body.innerHTML = `<div id="a"></div><div id="b"></div><div id="c"></div>`;
  });

  afterEach(() => {
    ThekSelect.resetDefaults();
  });

  it('applies global defaults to new instances', () => {
    ThekSelect.setDefaults({
      height: 52,
      virtualize: true
    });

    ThekSelect.init('#a', {
      options: [{ value: '1', label: 'One' }]
    });

    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--thek-input-height')).toBe('52px');
  });

  it('lets instance config override global defaults', () => {
    ThekSelect.setDefaults({
      height: 52
    });

    ThekSelect.init('#b', {
      height: '36px',
      options: [{ value: '1', label: 'One' }]
    });

    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--thek-input-height')).toBe('36px');
  });

  it('resetDefaults restores normal behavior', () => {
    ThekSelect.setDefaults({ height: 52 });
    ThekSelect.resetDefaults();

    ThekSelect.init('#c', { options: [{ value: '1', label: 'One' }] });

    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--thek-input-height')).toBe('40px');
  });
});
