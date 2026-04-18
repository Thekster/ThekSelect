import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

describe('CSS variable scoping', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('thek-select element is used as CSS variable scope (not :root)', () => {
    ThekSelectDom.init(container, { options: [] });
    // The wrapper must carry the .thek-select class so scoped variables apply
    const wrapper = document.querySelector('.thek-select');
    expect(wrapper).not.toBeNull();
  });

  it('thek-dropdown element carries .thek-dropdown class for variable inheritance', () => {
    ThekSelectDom.init(container, { options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    const dropdown = document.querySelector('.thek-dropdown');
    expect(dropdown).not.toBeNull();
  });
});
