import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('Config field validation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('throws when valueField is an empty string', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    expect(() =>
      ThekSelect.init(el, {
        valueField: '',
        options: [{ value: '1', label: 'One' }]
      })
    ).toThrow('ThekSelect: valueField must be a non-empty string');
  });

  it('throws when displayField is an empty string', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    expect(() =>
      ThekSelect.init(el, {
        displayField: '',
        options: [{ value: '1', label: 'One' }]
      })
    ).toThrow('ThekSelect: displayField must be a non-empty string');
  });

  it('warns when valueField does not exist on first option', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ThekSelect.init(el, {
      valueField: 'id',
      options: [{ value: '1', label: 'One' }]
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('valueField "id" not found on first option')
    );
    warnSpy.mockRestore();
  });

  it('warns when displayField does not exist on first option', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ThekSelect.init(el, {
      displayField: 'name',
      options: [{ value: '1', label: 'One' }]
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('displayField "name" not found on first option')
    );
    warnSpy.mockRestore();
  });

  it('does not warn when fields correctly match option shape', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ThekSelect.init(el, {
      options: [{ value: '1', label: 'One' }]
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
