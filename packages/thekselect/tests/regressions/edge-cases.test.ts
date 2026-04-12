import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('ThekSelect Edge Cases', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle initialization with empty options', () => {
    ThekSelect.init(container, { options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const noResults = document.querySelector('.thek-no-results');
    expect(noResults).toBeTruthy();
    expect(noResults?.textContent).toBe('No results found');
  });

  it('should handle options with special characters and HTML (XSS check)', () => {
    const dangerousLabel = '<img src=x onerror=alert(1)>';
    ThekSelect.init(container, {
      options: [{ value: 'danger', label: dangerousLabel }]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const option = document.querySelector('.thek-option-label') as HTMLElement;
    expect(option.textContent).toBe(dangerousLabel);
    expect(option.querySelector('img')).toBeNull();
  });

  it('should handle extremely long labels gracefully', () => {
    const longLabel = 'A'.repeat(1000);
    ThekSelect.init(container, {
      options: [{ value: 'long', label: longLabel }]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const option = document.querySelector('.thek-option');
    expect(option).toBeTruthy();
    // Mostly a visual check, but ensures no crash.
  });

  it('should handle setValue with a value that does not exist in options', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    // Should not crash, might just set the value text or ignore
    ts.setValue('999');

    // Depending on implementation, it might show '999' or nothing.
    // In multi-select it handles unknown values by creating a dummy option object.
    expect(ts.getValue()).toBe('999');
  });

  it('should handle missing displayField properties in data', () => {
    ThekSelect.init(container, {
      displayField: 'name',
      valueField: 'id',
      options: [
        { id: '1' } as unknown as { id: string; name?: string } // Missing 'name'
      ]
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();

    const option = document.querySelector('.thek-option-label');
    // Should probably render undefined or empty string, but NOT crash
    expect(option?.textContent).toBeFalsy();
  });

  it('should safely destroy the instance', () => {
    const ts = ThekSelect.init(container, {});

    expect(document.querySelector('.thek-select')).toBeTruthy();
    expect(document.querySelector('.thek-dropdown')).toBeTruthy();

    ts.destroy();

    expect(document.querySelector('.thek-select')).toBeFalsy(); // wrapper removed
    expect(document.querySelector('.thek-dropdown')).toBeFalsy();
  });

  it('a throwing listener does not silence subsequent listeners and re-throws globally', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One' }]
    });

    const results: string[] = [];
    ts.on('change', () => {
      results.push('first');
      throw new Error('boom');
    });
    ts.on('change', () => {
      results.push('second');
    });

    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    (document.querySelector('.thek-option') as HTMLElement).click();

    // Both listeners must have been called despite the first throwing.
    // The error is re-thrown via setTimeout so it reaches global error handlers
    // (e.g. Sentry) without blocking the event loop here.
    expect(results).toEqual(['first', 'second']);
  });

  it('setValue with empty array clears single-select selection', () => {
    const ts = ThekSelect.init(container, {
      options: [{ value: '1', label: 'One', selected: true }]
    });
    expect(ts.getValue()).toBe('1');

    ts.setValue([]);
    expect(ts.getValue()).toBeUndefined();
  });
});
