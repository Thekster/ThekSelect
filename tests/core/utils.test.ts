import { describe, it, expect } from 'vitest';
import { generateId } from '../../src/utils/dom';

describe('dom utils', () => {
  it('generateId returns a string with the default thek prefix', () => {
    const id = generateId();
    expect(id.startsWith('thek-')).toBe(true);
  });

  it('generateId returns a string with a custom prefix', () => {
    const id = generateId('my');
    expect(id.startsWith('my-')).toBe(true);
  });

  it('generateId produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
