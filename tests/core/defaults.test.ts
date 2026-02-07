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
      size: 'lg',
      theme: { primary: '#123456' },
      virtualize: true
    });

    ThekSelect.init('#a', {
      options: [{ value: '1', label: 'One' }]
    });

    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    expect(wrapper.classList.contains('thek-select-lg')).toBe(true);
    expect(wrapper.style.getPropertyValue('--thek-primary')).toBe('#123456');
  });

  it('lets instance config override global defaults', () => {
    ThekSelect.setDefaults({
      size: 'lg',
      theme: { primary: '#123456', borderRadius: '20px' }
    });

    ThekSelect.init('#b', {
      size: 'sm',
      theme: { primary: '#abcdef' },
      options: [{ value: '1', label: 'One' }]
    });

    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    expect(wrapper.classList.contains('thek-select-sm')).toBe(true);
    expect(wrapper.style.getPropertyValue('--thek-primary')).toBe('#abcdef');
    expect(wrapper.style.getPropertyValue('--thek-border-radius')).toBe('20px');
  });

  it('resetDefaults restores normal behavior', () => {
    ThekSelect.setDefaults({ size: 'lg' });
    ThekSelect.resetDefaults();

    ThekSelect.init('#c', { options: [{ value: '1', label: 'One' }] });

    const wrapper = document.querySelector('.thek-select') as HTMLElement;
    expect(wrapper.classList.contains('thek-select-md')).toBe(true);
  });
});
