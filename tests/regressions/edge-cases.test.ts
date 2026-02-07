import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    const ts = ThekSelect.init(container, { options: [] });
    const control = document.querySelector('.thek-control') as HTMLElement;
    control.click();
    
    const noResults = document.querySelector('.thek-no-results');
    expect(noResults).toBeTruthy();
    expect(noResults?.textContent).toBe('No results found');
  });

  it('should handle options with special characters and HTML (XSS check)', () => {
    const dangerousLabel = '<img src=x onerror=alert(1)>';
    const ts = ThekSelect.init(container, {
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
    const ts = ThekSelect.init(container, {
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
    const ts = ThekSelect.init(container, {
      displayField: 'name',
      valueField: 'id',
      options: [
        { id: '1' } as any // Missing 'name'
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
});

