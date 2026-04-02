import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

const originalGetBCR = HTMLElement.prototype.getBoundingClientRect;

function mockControlRect(rect: { top: number; bottom: number; left: number; width: number }) {
  HTMLElement.prototype.getBoundingClientRect = function () {
    if ((this as HTMLElement).classList?.contains('thek-control')) {
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.left + rect.width,
        width: rect.width,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON: () => {}
      } as DOMRect;
    }
    return originalGetBCR.call(this);
  };
}

describe('Dropdown flip / viewport-aware positioning', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container') as HTMLDivElement;
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBCR;
    document.body.innerHTML = '';
  });

  it('places the dropdown below the control when there is enough space below', () => {
    // Control near the top of the viewport — plenty of space below
    mockControlRect({ top: 50, bottom: 90, left: 10, width: 200 });

    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    const dropdownTop = parseFloat(dropdown.style.top);
    // placed below control bottom (scrollY=0 in JSDOM, so top === rect.bottom)
    expect(dropdownTop).toBeGreaterThanOrEqual(90);
  });

  it('flips the dropdown above the control when there is not enough space below', () => {
    // Control near bottom: 50px below fold, dropdown needs ~240px
    mockControlRect({ top: 710, bottom: 750, left: 10, width: 200 });

    // JSDOM window.innerHeight defaults to 768; 750+240 > 768 so flip expected
    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    const dropdownTop = parseFloat(dropdown.style.top);
    // Flipped: top should be above the control top (710)
    expect(dropdownTop).toBeLessThan(710);
  });

  it('adds thek-drop-up class when flipped above', () => {
    mockControlRect({ top: 710, bottom: 750, left: 10, width: 200 });

    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.classList.contains('thek-drop-up')).toBe(true);
  });

  it('does NOT add thek-drop-up class when dropdown opens below', () => {
    mockControlRect({ top: 50, bottom: 90, left: 10, width: 200 });

    ThekSelect.init(container, { options: [{ value: '1', label: 'One' }] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const dropdown = document.querySelector('.thek-dropdown') as HTMLElement;
    expect(dropdown.classList.contains('thek-drop-up')).toBe(false);
  });
});
